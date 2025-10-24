//! SDKey (可编程钥) 安全策略
//! 
//! 参考: 《7-Psy Jargon.md》- SDKey 签名电路

use crate::types::*;
use crate::traits::SdkeyPolicy;
use crate::error::{PsyGuardError, Result};

/// SDKey 策略验证器
pub struct SdkeyPolicyValidator;

impl SdkeyPolicyValidator {
    /// 验证交易是否满足 SDKey 策略
    /// 参考: 《7-Psy Jargon.md》- SDKey 策略约束
    pub fn validate_transaction(
        policy: &SdkeyPolicy,
        tx_amount: u64,
        contract_id: &ContractId,
        timestamp: u64,
    ) -> Result<Vec<String>> {
        let mut satisfied_policies = Vec::new();

        // 1. 检查日限额
        if let Some(daily_limit) = policy.daily_limit {
            if tx_amount > daily_limit {
                return Err(PsyGuardError::SdkeyPolicyViolation(format!(
                    "交易金额 {} 超过日限额 {}",
                    tx_amount, daily_limit
                )));
            }
            satisfied_policies.push(format!("日限额检查通过: {} <= {}", tx_amount, daily_limit));
        }

        // 2. 检查合约白名单
        if let Some(ref trusted_contracts) = policy.trusted_contracts {
            if !trusted_contracts.contains(contract_id) {
                return Err(PsyGuardError::SdkeyPolicyViolation(format!(
                    "合约 {:?} 不在白名单中",
                    contract_id
                )));
            }
            satisfied_policies.push(format!("合约白名单检查通过: {:?}", contract_id));
        }

        // 3. 检查时间锁
        if let Some(time_lock_until) = policy.time_lock_until {
            if timestamp < time_lock_until {
                return Err(PsyGuardError::SdkeyPolicyViolation(format!(
                    "时间锁未到期: 当前 {} < 解锁时间 {}",
                    timestamp, time_lock_until
                )));
            }
            satisfied_policies.push(format!("时间锁检查通过: {} >= {}", timestamp, time_lock_until));
        }

        // 4. 检查 2FA 要求
        if policy.require_2fa {
            // TODO: 实际应该验证 2FA 令牌
            satisfied_policies.push("2FA 验证 (待实现)".to_string());
        }

        Ok(satisfied_policies)
    }

    /// 实时约束检查 (返回详细结果)
    /// 用于前端展示各项约束的通过/未通过状态
    pub fn check_constraints(
        policy: &SdkeyPolicy,
        tx_amount: u64,
        contract_id: &ContractId,
        timestamp: u64,
        twofa_verified: bool,
    ) -> SdkeyConstraintCheck {
        // 1. 限额检查
        let limit_check = if let Some(daily_limit) = policy.daily_limit {
            if tx_amount > daily_limit {
                ConstraintCheckResult {
                    passed: false,
                    message: format!("超过日限额: {} > {}", tx_amount, daily_limit),
                }
            } else {
                ConstraintCheckResult {
                    passed: true,
                    message: format!("通过: {} <= {}", tx_amount, daily_limit),
                }
            }
        } else {
            ConstraintCheckResult {
                passed: true,
                message: "未设置限额".to_string(),
            }
        };

        // 2. 白名单检查
        let whitelist_check = if let Some(ref trusted_contracts) = policy.trusted_contracts {
            if trusted_contracts.contains(contract_id) {
                ConstraintCheckResult {
                    passed: true,
                    message: format!("合约在白名单中: {:?}", contract_id),
                }
            } else {
                ConstraintCheckResult {
                    passed: false,
                    message: format!("合约不在白名单中: {:?}", contract_id),
                }
            }
        } else {
            ConstraintCheckResult {
                passed: true,
                message: "未设置白名单".to_string(),
            }
        };

        // 3. 时间锁检查
        let timelock_check = if let Some(time_lock_until) = policy.time_lock_until {
            if timestamp >= time_lock_until {
                ConstraintCheckResult {
                    passed: true,
                    message: format!("已解锁: {} >= {}", timestamp, time_lock_until),
                }
            } else {
                ConstraintCheckResult {
                    passed: false,
                    message: format!("未解锁: {} < {}", timestamp, time_lock_until),
                }
            }
        } else {
            ConstraintCheckResult {
                passed: true,
                message: "未设置时间锁".to_string(),
            }
        };

        // 4. 2FA 检查
        let twofa_check = if policy.require_2fa {
            TwoFaCheckResult {
                required: true,
                verified: twofa_verified,
                message: if twofa_verified {
                    "2FA 已验证".to_string()
                } else {
                    "需要 2FA 验证".to_string()
                },
            }
        } else {
            TwoFaCheckResult {
                required: false,
                verified: true,
                message: "不需要 2FA".to_string(),
            }
        };

        SdkeyConstraintCheck {
            limit_check,
            whitelist_check,
            timelock_check,
            twofa_check,
        }
    }

    /// 计算 SDKey 公钥哈希
    /// 参考: 《7-Psy Jargon.md》- 公钥 = 签名电路 verifier data 哈希
    pub fn compute_public_key_hash(
        verifier_data: &[u8],
        policy_params: &SdkeyPolicy,
    ) -> Hash {
        use sha2::{Sha256, Digest};

        let mut hasher = Sha256::new();
        hasher.update(verifier_data);
        
        // 将策略参数也纳入公钥计算
        if let Some(limit) = policy_params.daily_limit {
            hasher.update(limit.to_le_bytes());
        }
        if let Some(time_lock) = policy_params.time_lock_until {
            hasher.update(time_lock.to_le_bytes());
        }

        let result = hasher.finalize();
        let mut hash = [0u8; 32];
        hash.copy_from_slice(&result);
        hash
    }
}

/// SDKey 策略构建器
pub struct SdkeyPolicyBuilder {
    policy: SdkeyPolicy,
}

impl SdkeyPolicyBuilder {
    pub fn new() -> Self {
        Self {
            policy: SdkeyPolicy {
                daily_limit: None,
                trusted_contracts: None,
                time_lock_until: None,
                require_2fa: false,
            },
        }
    }

    pub fn with_daily_limit(mut self, limit: u64) -> Self {
        self.policy.daily_limit = Some(limit);
        self
    }

    pub fn with_trusted_contracts(mut self, contracts: Vec<ContractId>) -> Self {
        self.policy.trusted_contracts = Some(contracts);
        self
    }

    pub fn with_time_lock(mut self, until: u64) -> Self {
        self.policy.time_lock_until = Some(until);
        self
    }

    pub fn with_2fa(mut self) -> Self {
        self.policy.require_2fa = true;
        self
    }

    pub fn build(self) -> SdkeyPolicy {
        self.policy
    }
}

impl Default for SdkeyPolicyBuilder {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_daily_limit_validation() {
        let policy = SdkeyPolicyBuilder::new()
            .with_daily_limit(1000)
            .build();

        let contract_id = ContractId("test_contract".to_string());
        
        // 应该通过
        let result = SdkeyPolicyValidator::validate_transaction(
            &policy,
            500,
            &contract_id,
            1000000,
        );
        assert!(result.is_ok());

        // 应该失败
        let result = SdkeyPolicyValidator::validate_transaction(
            &policy,
            1500,
            &contract_id,
            1000000,
        );
        assert!(result.is_err());
    }
}
