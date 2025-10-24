//! 只读预演功能
//! 
//! 在执行 CFC 之前进行只读预演,预测交易影响
//! 参考: 《5-Local Proving (UPS).md》- 只读执行与风控

use crate::types::*;
use crate::error::{PsyGuardError, Result};
use crate::traits::NetworkState;

/// 只读预演器
pub struct ReadOnlyPreview;

impl ReadOnlyPreview {
    /// 执行只读预演
    /// 
    /// 1. 拉取历史 CSTATE 叶 + Merkle 路径
    /// 2. 本地只读执行
    /// 3. 预测改动的槽位/键数量、余额变化、是否触发限额或 2FA
    pub fn preview_execution(
        network_state: &dyn NetworkState,
        user_id: &UserId,
        cfc_id: &CfcId,
        args: &str,
        sdkey_policy: &SdkeyPolicy,
    ) -> Result<ReadOnlyPreviewResult> {
        log::info!("开始只读预演: {:?}", cfc_id);

        // 1. 拉取历史 CSTATE 叶
        let checkpoint = network_state.latest_finalized_chkp();
        let user_leaf = network_state.fetch_user_leaf(user_id, &checkpoint);
        let (cft_root, cstate_height) = network_state.fetch_contract_meta(cfc_id.contract_id.clone());

        log::info!("拉取历史状态完成: CSTATE height = {}", cstate_height);

        // 2. 模拟执行 (这里是 Mock 实现,真实版本需要调用 CFC 只读接口)
        let preview_result = Self::simulate_execution(
            user_id,
            cfc_id,
            args,
            &user_leaf,
            sdkey_policy,
        )?;

        log::info!("预演完成: success = {}, 槽位修改数 = {}", 
            preview_result.success, 
            preview_result.slots_to_modify.len()
        );

        Ok(preview_result)
    }

    /// 模拟执行 (Mock 实现)
    fn simulate_execution(
        user_id: &UserId,
        cfc_id: &CfcId,
        args: &str,
        user_leaf: &UserLeafCtx,
        sdkey_policy: &SdkeyPolicy,
    ) -> Result<ReadOnlyPreviewResult> {
        // 解析参数
        let parsed_args: serde_json::Value = serde_json::from_str(args)
            .map_err(|e| PsyGuardError::InvalidInput(format!("参数解析失败: {}", e)))?;

        // Mock: 根据函数类型预测影响
        let (slots_to_modify, balance_changes, will_trigger_limit, requires_2fa) = 
            match cfc_id.function_name.as_str() {
                "transfer" => Self::preview_transfer(&parsed_args, user_leaf, sdkey_policy)?,
                "approve" => Self::preview_approve(&parsed_args, user_leaf, sdkey_policy)?,
                "claim" => Self::preview_claim(&parsed_args, user_leaf, sdkey_policy)?,
                _ => {
                    // 默认预测
                    (vec![], vec![], false, false)
                }
            };

        Ok(ReadOnlyPreviewResult {
            success: true,
            slots_to_modify,
            balance_changes,
            will_trigger_limit,
            requires_2fa,
            estimated_gas: 21000,
            error_message: None,
        })
    }

    /// 预测 transfer 操作的影响
    fn preview_transfer(
        args: &serde_json::Value,
        user_leaf: &UserLeafCtx,
        sdkey_policy: &SdkeyPolicy,
    ) -> Result<(Vec<SlotModification>, Vec<BalanceChange>, bool, bool)> {
        let amount = args.get("amount")
            .and_then(|v| v.as_u64())
            .ok_or_else(|| PsyGuardError::InvalidInput("缺少 amount 参数".to_string()))?;

        let to = args.get("to")
            .and_then(|v| v.as_str())
            .ok_or_else(|| PsyGuardError::InvalidInput("缺少 to 参数".to_string()))?;

        // 检查是否触发限额
        let will_trigger_limit = sdkey_policy.daily_limit
            .map(|limit| amount > limit)
            .unwrap_or(false);

        // 检查是否需要 2FA
        let requires_2fa = sdkey_policy.require_2fa || will_trigger_limit;

        // 预测槽位修改
        let slots_to_modify = vec![
            SlotModification {
                slot_index: 0,
                old_value: user_leaf.balance.to_le_bytes().to_vec(),
                new_value: (user_leaf.balance - amount).to_le_bytes().to_vec(),
                description: format!("余额槽位: {} -> {}", user_leaf.balance, user_leaf.balance - amount),
            },
        ];

        // 预测余额变化
        let balance_changes = vec![
            BalanceChange {
                account: UserId("sender".to_string()),
                old_balance: user_leaf.balance,
                new_balance: user_leaf.balance - amount,
                delta: -(amount as i64),
            },
            BalanceChange {
                account: UserId(to.to_string()),
                old_balance: 0, // Mock: 不知道接收方余额
                new_balance: amount,
                delta: amount as i64,
            },
        ];

        Ok((slots_to_modify, balance_changes, will_trigger_limit, requires_2fa))
    }

    /// 预测 approve 操作的影响
    fn preview_approve(
        args: &serde_json::Value,
        user_leaf: &UserLeafCtx,
        sdkey_policy: &SdkeyPolicy,
    ) -> Result<(Vec<SlotModification>, Vec<BalanceChange>, bool, bool)> {
        let amount = args.get("amount")
            .and_then(|v| v.as_u64())
            .unwrap_or(0);

        let slots_to_modify = vec![
            SlotModification {
                slot_index: 1,
                old_value: vec![0; 8],
                new_value: amount.to_le_bytes().to_vec(),
                description: format!("授权额度槽位: 0 -> {}", amount),
            },
        ];

        Ok((slots_to_modify, vec![], false, sdkey_policy.require_2fa))
    }

    /// 预测 claim 操作的影响
    fn preview_claim(
        args: &serde_json::Value,
        user_leaf: &UserLeafCtx,
        sdkey_policy: &SdkeyPolicy,
    ) -> Result<(Vec<SlotModification>, Vec<BalanceChange>, bool, bool)> {
        let amount = args.get("amount")
            .and_then(|v| v.as_u64())
            .unwrap_or(100);

        let slots_to_modify = vec![
            SlotModification {
                slot_index: 0,
                old_value: user_leaf.balance.to_le_bytes().to_vec(),
                new_value: (user_leaf.balance + amount).to_le_bytes().to_vec(),
                description: format!("余额槽位: {} -> {}", user_leaf.balance, user_leaf.balance + amount),
            },
        ];

        let balance_changes = vec![
            BalanceChange {
                account: UserId("recipient".to_string()),
                old_balance: user_leaf.balance,
                new_balance: user_leaf.balance + amount,
                delta: amount as i64,
            },
        ];

        Ok((slots_to_modify, balance_changes, false, false))
    }
}

/// SDKey 策略 (简化版)
#[derive(Debug, Clone)]
pub struct SdkeyPolicy {
    pub daily_limit: Option<u64>,
    pub trusted_contracts: Vec<ContractId>,
    pub time_lock_until: Option<u64>,
    pub require_2fa: bool,
}

impl Default for SdkeyPolicy {
    fn default() -> Self {
        Self {
            daily_limit: Some(10000),
            trusted_contracts: vec![],
            time_lock_until: None,
            require_2fa: false,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_preview_transfer() {
        let user_leaf = UserLeafCtx {
            uleaf_hash: [0u8; 32],
            ucon_root: [0u8; 32],
            balance: 1000,
            nonce: 0,
        };

        let policy = SdkeyPolicy::default();

        let args = serde_json::json!({
            "to": "bob",
            "amount": 100
        });

        let result = ReadOnlyPreview::preview_transfer(&args, &user_leaf, &policy).unwrap();
        
        assert_eq!(result.0.len(), 1); // 1 个槽位修改
        assert_eq!(result.1.len(), 2); // 2 个余额变化
        assert_eq!(result.2, false);   // 不触发限额
        assert_eq!(result.3, false);   // 不需要 2FA
    }
}
