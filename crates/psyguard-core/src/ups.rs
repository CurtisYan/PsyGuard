//! UPS (User Proving Session) 会话管理
//! 
//! 参考: 《5-Local Proving (UPS).md》

use crate::types::*;
use crate::traits::*;
use crate::error::{PsyGuardError, Result};
use std::sync::Arc;

/// UPS 会话
pub struct UpsSession {
    header: UpsHeader,
    current_step: UpsStepProof,
    step_count: u32,
    network: Arc<dyn NetworkState>,
    prover: Arc<dyn Prover>,
    state_deltas: Vec<CstateDelta>,
}

impl UpsSession {
    /// 初始化新的 UPS 会话
    /// 参考: 《5-Local Proving (UPS).md》- UPS 启动
    pub fn new(
        user_id: UserId,
        network: Arc<dyn NetworkState>,
        prover: Arc<dyn Prover>,
    ) -> Result<Self> {
        // 1. 获取最新 finalized checkpoint
        let checkpoint_ref = network.latest_finalized_chkp()?;

        // 2. 获取用户叶上下文 (带 Merkle 证明)
        let user_leaf_ctx = network.fetch_user_leaf(&user_id, &checkpoint_ref)?;

        // 3. 构建 UPS Header
        let header = UpsHeader {
            user_id,
            checkpoint_ref,
            user_leaf_ctx: user_leaf_ctx.clone(),
            session_id: format!("ups_{}", chrono::Utc::now().timestamp()),
        };

        // 4. 初始化第一个步骤 (空证明)
        let current_step = UpsStepProof {
            step_number: 0,
            accumulated_proof: vec![],
            current_ucon_root: user_leaf_ctx.ucon_root,
            current_debts: vec![],
        };

        Ok(Self {
            header,
            current_step,
            step_count: 0,
            network,
            prover,
            state_deltas: vec![],
        })
    }

    /// 执行一个 CFC 并集成到 UPS
    /// 参考: 《5-Local Proving (UPS).md》- UPS 集成步骤
    pub fn execute_cfc(
        &mut self,
        cfc_id: &CfcId,
        inputs: &CfcInputs,
        cft_proof: &CftInclusionProof,
    ) -> Result<TxEndCtx> {
        // 1. 获取合约当前状态根
        let start_cstate_root = self.get_contract_state_root(&cfc_id.contract_id)?;

        // 2. 生成 CFC 证明
        let (cfc_proof, tx_end_ctx) = self.prover.prove_cfc(
            cfc_id,
            inputs,
            start_cstate_root,
        )?;

        // 3. 构建 UCON Delta 证明
        let ucon_delta = UconDeltaProof {
            old_root: self.current_step.current_ucon_root,
            new_root: tx_end_ctx.end_contract_state_root,
            contract_id: cfc_id.contract_id.clone(),
            cstate_delta: CstateDeltaProof {
                old_root: start_cstate_root,
                new_root: tx_end_ctx.end_contract_state_root,
                merkle_path: vec![],
                modified_leaves: vec![],
            },
        };

        // 4. 构建 Debts Delta (简化版)
        let debts_delta = DebtDeltaProof {
            old_debts: self.current_step.current_debts.clone(),
            new_debts: self.current_step.current_debts.clone(),
        };

        // 5. UPS 集成步骤 (递归合并)
        let next_step = self.prover.ups_integrate_step(
            &self.current_step,
            &cfc_proof,
            cft_proof,
            &ucon_delta,
            &debts_delta,
        )?;

        // 6. 更新当前步骤
        self.step_count += 1;
        self.current_step = next_step;

        // 7. 记录状态变更 (用于提交)
        self.state_deltas.push(CstateDelta {
            contract_id: cfc_id.contract_id.clone(),
            modified_slots: vec![],
        });

        Ok(tx_end_ctx)
    }

    /// 终结会话并生成 End Cap
    /// 参考: 《5-Local Proving (UPS).md》- End Cap 终结
    pub fn finalize(
        &self,
        sdkey_policy: &SdkeyPolicy,
    ) -> Result<EndCapProof> {
        // 1. 生成 SDKey 签名证明
        let message = self.compute_session_message();
        let signature_proof = self.prover.sign_with_sdkey(&message, sdkey_policy)?;

        // 2. 生成 End Cap
        let endcap = self.prover.finalize_endcap(&self.current_step, &signature_proof)?;

        Ok(endcap)
    }

    /// 获取会话头部
    pub fn header(&self) -> &UpsHeader {
        &self.header
    }

    /// 获取当前步骤
    pub fn current_step(&self) -> &UpsStepProof {
        &self.current_step
    }

    /// 获取状态变更列表
    pub fn state_deltas(&self) -> &[CstateDelta] {
        &self.state_deltas
    }

    /// 获取合约状态根 (从当前 UCON 中)
    fn get_contract_state_root(&self, _contract_id: &ContractId) -> Result<Hash> {
        // TODO: 从 UCON 树中查找对应合约的 CSTATE 根
        Ok([0u8; 32])
    }

    /// 计算会话消息 (用于签名)
    fn compute_session_message(&self) -> Vec<u8> {
        // TODO: 序列化会话关键信息
        vec![]
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_ups_session_creation() {
        // TODO: 添加测试
    }
}
