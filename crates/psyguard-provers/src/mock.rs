//! Mock 实现 - 用于开发和测试
//! 
//! 参考: 教程第1步 - 采用接口驱动 + Mock

use psyguard_core::*;
use std::collections::HashMap;
use std::sync::{Arc, Mutex};

/// Mock 证明器
/// 不生成真实 ZK 证明，仅模拟流程
pub struct MockProver {
    /// 模拟延迟 (毫秒)
    pub delay_ms: u64,
}

impl MockProver {
    pub fn new() -> Self {
        Self { delay_ms: 0 }
    }

    pub fn with_delay(delay_ms: u64) -> Self {
        Self { delay_ms }
    }
}

impl Default for MockProver {
    fn default() -> Self {
        Self::new()
    }
}

impl Prover for MockProver {
    fn prove_cfc(
        &self,
        cfc: &CfcId,
        inputs: &CfcInputs,
        start_cstate_root: Hash,
    ) -> Result<(CfcProof, TxEndCtx)> {
        log::info!("Mock: 证明 CFC {:?}", cfc);

        // 模拟延迟
        if self.delay_ms > 0 {
            std::thread::sleep(std::time::Duration::from_millis(self.delay_ms));
        }

        // 生成 Mock 证明
        let proof_data = format!(
            "mock_cfc_proof_{}_{}", 
            cfc.contract_id.0, 
            cfc.function_name
        ).into_bytes();

        // 模拟状态变更
        let mut new_root = start_cstate_root;
        new_root[0] = new_root[0].wrapping_add(1);

        let tx_end_ctx = TxEndCtx {
            end_contract_state_root: new_root,
            gas_used: 21000,
            success: true,
            return_data: vec![],
        };

        let cfc_proof = CfcProof {
            proof_data,
            tx_end_ctx: tx_end_ctx.clone(),
        };

        Ok((cfc_proof, tx_end_ctx))
    }

    fn ups_integrate_step(
        &self,
        prev: &UpsStepProof,
        cfc_proof: &CfcProof,
        cft_proof: &CftInclusionProof,
        ucon_delta: &UconDeltaProof,
        _debts_delta: &DebtDeltaProof,
    ) -> Result<UpsStepProof> {
        log::info!("Mock: UPS 集成步骤 {}", prev.step_number + 1);

        // 模拟延迟
        if self.delay_ms > 0 {
            std::thread::sleep(std::time::Duration::from_millis(self.delay_ms));
        }

        // 生成 Mock 递归证明
        let mut accumulated_proof = prev.accumulated_proof.clone();
        accumulated_proof.extend_from_slice(&cfc_proof.proof_data);
        accumulated_proof.extend_from_slice(&cft_proof.cft_root.0);

        Ok(UpsStepProof {
            step_number: prev.step_number + 1,
            accumulated_proof,
            current_ucon_root: ucon_delta.new_root,
            current_debts: prev.current_debts.clone(),
        })
    }

    fn finalize_endcap(
        &self,
        last_step: &UpsStepProof,
        sdkey_sig: &SignatureProof,
    ) -> Result<EndCapProof> {
        log::info!("Mock: 终结 End Cap");

        // 模拟延迟
        if self.delay_ms > 0 {
            std::thread::sleep(std::time::Duration::from_millis(self.delay_ms));
        }

        // 创建 Mock End Cap
        let endcap = EndCapProof {
            ups_header: UpsHeader {
                user_id: UserId("mock_user".to_string()),
                checkpoint_ref: CheckpointRef {
                    chkp_root: [0u8; 32],
                    block_number: 1,
                },
                user_leaf_ctx: UserLeafCtx {
                    uleaf_hash: [0u8; 32],
                    ucon_root: [0u8; 32],
                    balance: 1000,
                    nonce: 0,
                },
                session_id: "mock_session".to_string(),
            },
            final_step: last_step.clone(),
            signature_proof: sdkey_sig.clone(),
            timestamp: chrono::Utc::now().timestamp() as u64,
        };

        Ok(endcap)
    }

    fn sign_with_sdkey(
        &self,
        message: &[u8],
        policy: &SdkeyPolicy,
    ) -> Result<SignatureProof> {
        log::info!("Mock: SDKey 签名");

        // 模拟延迟
        if self.delay_ms > 0 {
            std::thread::sleep(std::time::Duration::from_millis(self.delay_ms));
        }

        use sha2::{Sha256, Digest};
        let mut hasher = Sha256::new();
        hasher.update(message);
        let public_key_hash_vec = hasher.finalize();
        let mut public_key_hash = [0u8; 32];
        public_key_hash.copy_from_slice(&public_key_hash_vec);

        let mut policy_satisfied = vec!["mock_signature".to_string()];
        
        if policy.daily_limit.is_some() {
            policy_satisfied.push("daily_limit_checked".to_string());
        }
        if policy.trusted_contracts.is_some() {
            policy_satisfied.push("contract_whitelist_checked".to_string());
        }

        Ok(SignatureProof {
            proof_data: b"mock_sdkey_signature".to_vec(),
            public_key_hash,
            policy_satisfied,
        })
    }
}

/// Mock 网络状态
/// 模拟从 Realm/Coordinator/DA 获取数据
pub struct MockNetworkState {
    checkpoints: Arc<Mutex<HashMap<u64, CheckpointRef>>>,
    user_leaves: Arc<Mutex<HashMap<UserId, UserLeafCtx>>>,
    contract_metas: Arc<Mutex<HashMap<ContractId, (CftRoot, CstateHeight)>>>,
}

impl MockNetworkState {
    pub fn new() -> Self {
        let mut checkpoints = HashMap::new();
        checkpoints.insert(1, CheckpointRef {
            chkp_root: [1u8; 32],
            block_number: 1,
        });

        Self {
            checkpoints: Arc::new(Mutex::new(checkpoints)),
            user_leaves: Arc::new(Mutex::new(HashMap::new())),
            contract_metas: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    /// 添加 Mock 用户
    pub fn add_user(&self, user_id: UserId, balance: u64) {
        let ctx = UserLeafCtx {
            uleaf_hash: [0u8; 32],
            ucon_root: [0u8; 32],
            balance,
            nonce: 0,
        };
        self.user_leaves.lock().unwrap().insert(user_id, ctx);
    }

    /// 添加 Mock 合约
    pub fn add_contract(&self, contract_id: ContractId, cft_root: CftRoot) {
        self.contract_metas.lock().unwrap()
            .insert(contract_id, (cft_root, 0));
    }
}

impl Default for MockNetworkState {
    fn default() -> Self {
        Self::new()
    }
}

impl NetworkState for MockNetworkState {
    fn latest_finalized_chkp(&self) -> Result<CheckpointRef> {
        let checkpoints = self.checkpoints.lock().unwrap();
        checkpoints.get(&1)
            .cloned()
            .ok_or_else(|| PsyGuardError::NotFound("checkpoint not found".to_string()))
    }

    fn fetch_user_leaf(&self, user_id: &UserId, _chkp: &CheckpointRef) -> Result<UserLeafCtx> {
        let user_leaves = self.user_leaves.lock().unwrap();
        user_leaves.get(user_id)
            .cloned()
            .ok_or_else(|| PsyGuardError::NotFound(format!("user {:?} not found", user_id)))
    }

    fn fetch_contract_meta(&self, contract_id: &ContractId) -> Result<(CftRoot, CstateHeight)> {
        let contract_metas = self.contract_metas.lock().unwrap();
        contract_metas.get(contract_id)
            .cloned()
            .ok_or_else(|| PsyGuardError::NotFound(format!("contract {:?} not found", contract_id)))
    }

    fn fetch_cstate_leaf(
        &self,
        _contract_id: &ContractId,
        _slot: u64,
        _chkp: &CheckpointRef,
    ) -> Result<(Vec<u8>, Vec<Hash>)> {
        // Mock 返回空值和空证明
        Ok((vec![0u8; 32], vec![]))
    }
}

/// Mock 提交器
pub struct MockSubmitter {
    receipts: Arc<Mutex<Vec<SubmitReceipt>>>,
}

impl MockSubmitter {
    pub fn new() -> Self {
        Self {
            receipts: Arc::new(Mutex::new(Vec::new())),
        }
    }

    pub fn get_receipts(&self) -> Vec<SubmitReceipt> {
        self.receipts.lock().unwrap().clone()
    }
}

impl Default for MockSubmitter {
    fn default() -> Self {
        Self::new()
    }
}

impl Submitter for MockSubmitter {
    fn submit_endcap(
        &self,
        endcap: &EndCapProof,
        state_deltas: Vec<CstateDelta>,
    ) -> Result<SubmitReceipt> {
        log::info!("Mock: 提交 End Cap, {} 个状态变更", state_deltas.len());

        let receipt = SubmitReceipt {
            receipt_id: format!("receipt_{}", endcap.timestamp),
            timestamp: chrono::Utc::now().timestamp() as u64,
            guta_path: Some(GutaPath {
                realm_segment: "realm_mock".to_string(),
                coordinator_segment: "coordinator_mock".to_string(),
                global_root: [0u8; 32],
            }),
        };

        self.receipts.lock().unwrap().push(receipt.clone());

        Ok(receipt)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_mock_prover() {
        let prover = MockProver::new();
        let cfc_id = CfcId {
            contract_id: ContractId("test".to_string()),
            function_name: "transfer".to_string(),
        };
        let inputs = CfcInputs {
            function_args: vec![],
            caller: UserId("alice".to_string()),
            contract_state_root: [0u8; 32],
        };

        let result = prover.prove_cfc(&cfc_id, &inputs, [0u8; 32]);
        assert!(result.is_ok());
    }

    #[test]
    fn test_mock_network_state() {
        let network = MockNetworkState::new();
        let user_id = UserId("alice".to_string());
        
        network.add_user(user_id.clone(), 1000);

        let chkp = network.latest_finalized_chkp().unwrap();
        let user_leaf = network.fetch_user_leaf(&user_id, &chkp).unwrap();
        
        assert_eq!(user_leaf.balance, 1000);
    }
}
