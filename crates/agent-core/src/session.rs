//! UPS 会话管理
//! 
//! 实现完整的用户证明会话生命周期

use crate::error::{AgentError, Result};
use crate::hashing::{hash_user_leaf, hash_tx_item, update_tx_stack};
use crate::types::*;
use crate::store::StateStore;
use std::sync::Arc;

/// UPS 会话
/// 
/// 管理从开始到结束的完整会话流程
pub struct UpsSession {
    /// 会话 ID
    session_id: String,
    /// 会话头（包含状态）
    header: UpsHeader,
    /// 状态增量累积
    deltas: Vec<StateDelta>,
    /// 存储后端
    store: Arc<dyn StateStore>,
}

impl UpsSession {
    /// 开始新的 UPS 会话
    /// 
    /// # 参数
    /// - `checkpoint`: 基于的历史 checkpoint
    /// - `user_id`: 用户地址
    /// - `init_ucon`: 初始 UCON 根
    /// - `init_nonce`: 初始 nonce
    /// - `store`: 存储后端
    pub async fn start(
        checkpoint: Checkpoint,
        user_id: String,
        init_ucon: String,
        init_nonce: u64,
        store: Arc<dyn StateStore>,
    ) -> Result<Self> {
        // 计算会话 ID
        let session_id = format!("ups_{}_{}", user_id, checkpoint.block_number);

        // 创建初始用户叶子
        let user_leaf = UserLeaf {
            user_id: user_id.clone(),
            ucon_root: init_ucon.clone(),
            nonce: init_nonce,
            last_checkpoint_block: checkpoint.block_number,
            balance: None,
        };

        // 计算用户叶子哈希
        let start_user_leaf_hash = hash_user_leaf(
            &user_leaf.ucon_root,
            user_leaf.nonce,
            user_leaf.last_checkpoint_block,
        )?;

        // 创建会话头
        let header = UpsHeader {
            checkpoint: checkpoint.clone(),
            start_user_leaf_hash: start_user_leaf_hash.clone(),
            current_user_leaf: user_leaf,
            tx_count: 0,
            tx_stack_hash: ZERO_HASH.to_string(),
            deferred_debt_root: EMPTY_TREE_ROOT.to_string(),
            inline_debt_root: EMPTY_TREE_ROOT.to_string(),
        };

        // 保存 checkpoint
        store.save_checkpoint(&checkpoint).await?;

        // 保存初始状态
        store.put_ucon_root(&user_id, &init_ucon).await?;
        store.put_nonce(&user_id, init_nonce).await?;

        tracing::info!(
            "🚀 UPS 会话已开始: session_id={}, block={}, nonce={}",
            session_id,
            checkpoint.block_number,
            init_nonce
        );

        Ok(Self {
            session_id,
            header,
            deltas: Vec::new(),
            store,
        })
    }

    /// 执行一笔 CFC 调用
    /// 
    /// # 参数
    /// - `call`: CFC 调用类型
    /// - `prover`: 证明生成器（占位，后续集成 RISC Zero）
    /// 
    /// # 返回
    /// 状态增量
    pub async fn exec_cfc(
        &mut self,
        call: CfcCall,
    ) -> Result<StateDelta> {
        // 确定合约 ID 和参数
        let (contract_id, token, address, amount) = match &call {
            CfcCall::TransferIntent { to, token, amount } => {
                (format!("erc20:{}", token), token.clone(), to.clone(), *amount)
            }
            CfcCall::ClaimFrom { from, token, amount } => {
                (format!("erc20:{}", token), token.clone(), from.clone(), *amount)
            }
        };

        // 获取当前的 CSTATE 根
        let user_id = &self.header.current_user_leaf.user_id;
        let old_cstate_root = self.store
            .get_cstate_root(user_id, &contract_id)
            .await?
            .unwrap_or_else(|| EMPTY_TREE_ROOT.to_string());

        // TODO: 调用 agent-proofs 生成 CFC 证明
        // 现在使用占位逻辑
        let new_cstate_root = format!("{}_tx{}", old_cstate_root, self.header.tx_count);

        // 计算交易项哈希
        let call_kind = match call {
            CfcCall::TransferIntent { .. } => "transfer",
            CfcCall::ClaimFrom { .. } => "claim",
        };
        let tx_item_hash = hash_tx_item(
            call_kind,
            &token,
            &address,
            amount,
            &new_cstate_root,
        )?;

        // 更新交易栈哈希
        let new_tx_stack = update_tx_stack(&self.header.tx_stack_hash, &tx_item_hash)?;

        // 创建状态增量
        let delta = StateDelta {
            contract_id: contract_id.clone(),
            old_cstate_root: old_cstate_root.clone(),
            new_cstate_root: new_cstate_root.clone(),
            slots_modified: 1, // 简化：假设每次修改1个槽
            kv_changes: vec![], // TODO: 实际的 KV 变更
        };

        // 更新 CSTATE 根
        self.store
            .put_cstate_root(user_id, &contract_id, &new_cstate_root)
            .await?;

        // 更新 UCON 根（简化：直接用新的 CSTATE 根的哈希）
        let new_ucon_root = format!("ucon_{}", new_cstate_root);
        self.store
            .put_ucon_root(user_id, &new_ucon_root)
            .await?;

        // 更新会话头
        self.header.current_user_leaf.ucon_root = new_ucon_root;
        self.header.tx_count += 1;
        self.header.tx_stack_hash = new_tx_stack;

        // 保存交易栈
        self.store
            .append_tx_stack(&self.session_id, &self.header.tx_stack_hash)
            .await?;

        // 累积状态增量
        self.deltas.push(delta.clone());

        tracing::info!(
            "✅ CFC 已执行: session={}, tx_count={}, call={:?}",
            self.session_id,
            self.header.tx_count,
            call_kind
        );

        Ok(delta)
    }

    /// 结束会话并生成 End Cap
    /// 
    /// # 参数
    /// - `next_nonce`: 新的 nonce
    /// - `sdkey_params`: SDKey 策略参数
    /// 
    /// # 返回
    /// (EndCapPublic, receipt_bytes, deltas)
    pub async fn end(
        mut self,
        next_nonce: u64,
        _sdkey_params: SdKeyParams, // TODO: 用于 SDKey 证明
    ) -> Result<(EndCapPublic, Vec<u8>, Vec<StateDelta>)> {
        // 验证债务树为空（UPS 结束约束）
        if self.header.deferred_debt_root != EMPTY_TREE_ROOT
            || self.header.inline_debt_root != EMPTY_TREE_ROOT
        {
            return Err(AgentError::SessionError(
                "债务树必须为空才能结束会话".to_string()
            ));
        }

        // 更新 nonce
        self.header.current_user_leaf.nonce = next_nonce;
        self.header.current_user_leaf.last_checkpoint_block = self.header.checkpoint.block_number;

        // 计算结束时的用户叶子哈希
        let end_user_leaf_hash = hash_user_leaf(
            &self.header.current_user_leaf.ucon_root,
            self.header.current_user_leaf.nonce,
            self.header.current_user_leaf.last_checkpoint_block,
        )?;

        // 创建 EndCapPublic
        let endcap = EndCapPublic {
            start_user_leaf_hash: self.header.start_user_leaf_hash.clone(),
            end_user_leaf_hash,
            checkpoint_root_hash: self.header.checkpoint.state_root.clone(),
            tx_stack_hash: self.header.tx_stack_hash.clone(),
            tx_count: self.header.tx_count,
            nonce: next_nonce,
        };

        // TODO: 调用 agent-proofs 生成 SDKey 签名证明
        // 现在使用占位 receipt
        let receipt = vec![0x42; 32]; // 占位证明

        // 保存最终 nonce
        let user_id = &self.header.current_user_leaf.user_id;
        self.store.put_nonce(user_id, next_nonce).await?;

        tracing::info!(
            "🎉 UPS 会话已结束: session={}, tx_count={}, nonce={}",
            self.session_id,
            self.header.tx_count,
            next_nonce
        );

        Ok((endcap, receipt, self.deltas))
    }

    /// 获取当前会话头
    pub fn header(&self) -> &UpsHeader {
        &self.header
    }

    /// 获取会话 ID
    pub fn session_id(&self) -> &str {
        &self.session_id
    }

    /// 获取已累积的状态增量
    pub fn deltas(&self) -> &[StateDelta] {
        &self.deltas
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::store::SledStore;

    #[tokio::test]
    async fn test_ups_session_lifecycle() {
        let store = Arc::new(SledStore::new_temp().unwrap());

        // 创建 checkpoint
        let checkpoint = Checkpoint {
            chain_id: 11155111,
            block_number: 12345,
            block_hash: "0xabc".to_string(),
            state_root: "0xdef".to_string(),
            timestamp: 1234567890,
        };

        // 开始会话
        let mut session = UpsSession::start(
            checkpoint,
            "0x123".to_string(),
            "0xucon_initial".to_string(),
            41,
            store,
        )
        .await
        .unwrap();

        assert_eq!(session.header().tx_count, 0);

        // 执行第一笔交易
        let call1 = CfcCall::TransferIntent {
            to: "0xabc".to_string(),
            token: "USDC".to_string(),
            amount: 100,
        };
        session.exec_cfc(call1).await.unwrap();
        assert_eq!(session.header().tx_count, 1);

        // 执行第二笔交易
        let call2 = CfcCall::ClaimFrom {
            from: "0xdef".to_string(),
            token: "USDC".to_string(),
            amount: 50,
        };
        session.exec_cfc(call2).await.unwrap();
        assert_eq!(session.header().tx_count, 2);

        // 结束会话
        let sdkey_params = SdKeyParams {
            daily_limit_usdc: 1000,
            window_start_unix: 0,
            window_end_unix: u64::MAX,
            circuit_fingerprint_whitelist: vec![],
        };

        let (endcap, receipt, deltas) = session.end(42, sdkey_params).await.unwrap();

        assert_eq!(endcap.tx_count, 2);
        assert_eq!(endcap.nonce, 42);
        assert_eq!(deltas.len(), 2);
        assert_eq!(receipt.len(), 32);
    }
}
