//! 哈希工具函数
//! 
//! 提供一致的哈希计算接口（Blake3 for host, Poseidon for circuits）

use crate::error::Result;
use blake3::Hasher;

/// 使用 Blake3 计算哈希（host 侧使用）
pub fn hash_blake3(data: &[u8]) -> String {
    let hash = blake3::hash(data);
    format!("0x{}", hex::encode(hash.as_bytes()))
}

/// 计算用户叶子哈希
/// 
/// 固定顺序：ucon_root || nonce || last_checkpoint_block
pub fn hash_user_leaf(ucon_root: &str, nonce: u64, last_checkpoint_block: u64) -> Result<String> {
    let mut hasher = Hasher::new();
    hasher.update(ucon_root.as_bytes());
    hasher.update(&nonce.to_le_bytes());
    hasher.update(&last_checkpoint_block.to_le_bytes());
    
    let hash = hasher.finalize();
    Ok(format!("0x{}", hex::encode(hash.as_bytes())))
}

/// 计算交易项哈希
/// 
/// 用于构建 tx_stack_hash
pub fn hash_tx_item(
    call_kind: &str,
    token: &str,
    address: &str,
    amount: u128,
    end_cstate_root: &str,
) -> Result<String> {
    let mut hasher = Hasher::new();
    hasher.update(call_kind.as_bytes());
    hasher.update(token.as_bytes());
    hasher.update(address.as_bytes());
    hasher.update(&amount.to_le_bytes());
    hasher.update(end_cstate_root.as_bytes());
    
    let hash = hasher.finalize();
    Ok(format!("0x{}", hex::encode(hash.as_bytes())))
}

/// 链式更新 tx_stack_hash
/// 
/// stack = Hash(prev_stack || tx_item_hash)
pub fn update_tx_stack(prev_stack: &str, tx_item_hash: &str) -> Result<String> {
    let mut hasher = Hasher::new();
    hasher.update(prev_stack.as_bytes());
    hasher.update(tx_item_hash.as_bytes());
    
    let hash = hasher.finalize();
    Ok(format!("0x{}", hex::encode(hash.as_bytes())))
}

/// 计算 checkpoint 根哈希
/// 
/// 简化版：直接使用 state_root
pub fn hash_checkpoint(state_root: &str, block_number: u64) -> Result<String> {
    let mut hasher = Hasher::new();
    hasher.update(state_root.as_bytes());
    hasher.update(&block_number.to_le_bytes());
    
    let hash = hasher.finalize();
    Ok(format!("0x{}", hex::encode(hash.as_bytes())))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_hash_blake3() {
        let data = b"hello world";
        let hash = hash_blake3(data);
        assert!(hash.starts_with("0x"));
        assert_eq!(hash.len(), 66); // 0x + 64 hex chars
    }

    #[test]
    fn test_hash_user_leaf() {
        let hash = hash_user_leaf("0xabc", 42, 12345).unwrap();
        assert!(hash.starts_with("0x"));
        assert_eq!(hash.len(), 66);
    }

    #[test]
    fn test_update_tx_stack() {
        let prev = "0x0000000000000000000000000000000000000000000000000000000000000000";
        let item = hash_tx_item("transfer", "USDC", "0x123", 100, "0xdef").unwrap();
        let stack = update_tx_stack(prev, &item).unwrap();
        assert!(stack.starts_with("0x"));
    }
}
