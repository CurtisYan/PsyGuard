//! 状态管理 (UCON/CSTATE)
//! 
//! 参考: 《5-Local Proving (UPS).md》- PARTH 状态模型

use crate::types::*;
use crate::error::Result;
use std::collections::HashMap;

/// UCON (User Container) - 用户容器
/// 每个用户的所有合约状态聚合
pub struct Ucon {
    /// 用户 ID
    pub user_id: UserId,
    /// 合约 ID -> CSTATE 根的映射
    pub contract_states: HashMap<ContractId, Hash>,
    /// UCON 根哈希
    pub root: Hash,
}

impl Ucon {
    pub fn new(user_id: UserId) -> Self {
        Self {
            user_id,
            contract_states: HashMap::new(),
            root: [0u8; 32],
        }
    }

    /// 更新合约状态根
    pub fn update_contract_state(&mut self, contract_id: ContractId, new_root: Hash) {
        self.contract_states.insert(contract_id, new_root);
        self.recompute_root();
    }

    /// 获取合约状态根
    pub fn get_contract_state(&self, contract_id: &ContractId) -> Option<&Hash> {
        self.contract_states.get(contract_id)
    }

    /// 重新计算 UCON 根
    fn recompute_root(&mut self) {
        use sha2::{Sha256, Digest};

        let mut hasher = Sha256::new();
        
        // 按合约 ID 排序以保证确定性
        let mut sorted: Vec<_> = self.contract_states.iter().collect();
        sorted.sort_by_key(|(id, _)| &id.0);

        for (contract_id, state_root) in sorted {
            hasher.update(contract_id.0.as_bytes());
            hasher.update(state_root);
        }

        let result = hasher.finalize();
        self.root.copy_from_slice(&result);
    }
}

/// CSTATE (Contract State) - 合约状态
/// 每个合约的键值存储
pub struct Cstate {
    /// 合约 ID
    pub contract_id: ContractId,
    /// 槽位 -> 值的映射
    pub slots: HashMap<u64, Vec<u8>>,
    /// CSTATE 根哈希
    pub root: Hash,
}

impl Cstate {
    pub fn new(contract_id: ContractId) -> Self {
        Self {
            contract_id,
            slots: HashMap::new(),
            root: [0u8; 32],
        }
    }

    /// 写入槽位
    pub fn write_slot(&mut self, slot: u64, value: Vec<u8>) {
        self.slots.insert(slot, value);
        self.recompute_root();
    }

    /// 读取槽位
    pub fn read_slot(&self, slot: u64) -> Option<&Vec<u8>> {
        self.slots.get(&slot)
    }

    /// 重新计算 CSTATE 根
    fn recompute_root(&mut self) {
        use sha2::{Sha256, Digest};

        let mut hasher = Sha256::new();
        
        // 按槽位排序以保证确定性
        let mut sorted: Vec<_> = self.slots.iter().collect();
        sorted.sort_by_key(|(slot, _)| *slot);

        for (slot, value) in sorted {
            hasher.update(slot.to_le_bytes());
            hasher.update(value);
        }

        let result = hasher.finalize();
        self.root.copy_from_slice(&result);
    }

    /// 生成 Delta 证明
    pub fn generate_delta_proof(&self, old_root: Hash) -> CstateDeltaProof {
        let modified_leaves: Vec<_> = self.slots
            .iter()
            .map(|(slot, value)| {
                use sha2::{Sha256, Digest};
                let mut hasher = Sha256::new();
                hasher.update(value);
                let result = hasher.finalize();
                let mut hash = [0u8; 32];
                hash.copy_from_slice(&result);
                (*slot, hash)
            })
            .collect();

        CstateDeltaProof {
            old_root,
            new_root: self.root,
            merkle_path: vec![], // TODO: 实现真实的 Merkle 路径
            modified_leaves,
        }
    }
}

/// 收件箱式转账 (PARTH 范式)
/// 参考: 《5-Local Proving (UPS).md》- 避免并发写冲突
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ParthTransfer {
    /// 发送者
    pub from: UserId,
    /// 接收者
    pub to: UserId,
    /// 金额
    pub amount: u64,
    /// 时间戳
    pub timestamp: u64,
}

impl ParthTransfer {
    /// 发送阶段: A 在自己的 CSTATE 记录
    pub fn send(cstate: &mut Cstate, transfer: &ParthTransfer) -> Result<()> {
        // 在 sent_to_others 槽位记录
        let slot = 1000 + transfer.timestamp; // 简化的槽位分配
        let value = serde_json::to_vec(transfer).unwrap();
        cstate.write_slot(slot, value);
        Ok(())
    }

    /// 接收阶段: B 读历史并写入自己的 CSTATE
    pub fn claim(cstate: &mut Cstate, transfer: &ParthTransfer) -> Result<()> {
        // 在 claimed_from_others 槽位记录
        let slot = 2000 + transfer.timestamp; // 简化的槽位分配
        let value = serde_json::to_vec(transfer).unwrap();
        cstate.write_slot(slot, value);
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_ucon_update() {
        let user_id = UserId("alice".to_string());
        let mut ucon = Ucon::new(user_id);

        let contract_id = ContractId("contract1".to_string());
        let state_root = [1u8; 32];

        ucon.update_contract_state(contract_id.clone(), state_root);

        assert_eq!(ucon.get_contract_state(&contract_id), Some(&state_root));
    }

    #[test]
    fn test_cstate_operations() {
        let contract_id = ContractId("contract1".to_string());
        let mut cstate = Cstate::new(contract_id);

        cstate.write_slot(0, vec![1, 2, 3]);
        assert_eq!(cstate.read_slot(0), Some(&vec![1, 2, 3]));
    }
}
