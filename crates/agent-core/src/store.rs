//! 状态存储接口
//! 
//! 提供 UCON、CSTATE、checkpoint 等数据的持久化

use crate::error::{AgentError, Result};
use crate::types::Checkpoint;
use async_trait::async_trait;
use sled::Db;
use std::sync::Arc;

/// 状态存储 trait
#[async_trait]
pub trait StateStore: Send + Sync {
    /// 保存用户的 UCON 根
    async fn put_ucon_root(&self, user: &str, root: &str) -> Result<()>;
    
    /// 获取用户的 UCON 根
    async fn get_ucon_root(&self, user: &str) -> Result<Option<String>>;

    /// 保存用户对某合约的 CSTATE 根
    async fn put_cstate_root(&self, user: &str, contract: &str, root: &str) -> Result<()>;
    
    /// 获取用户对某合约的 CSTATE 根
    async fn get_cstate_root(&self, user: &str, contract: &str) -> Result<Option<String>>;

    /// 追加交易栈哈希
    async fn append_tx_stack(&self, session_id: &str, new_hash: &str) -> Result<()>;
    
    /// 获取交易栈哈希
    async fn get_tx_stack(&self, session_id: &str) -> Result<Option<String>>;

    /// 保存 checkpoint
    async fn save_checkpoint(&self, ckpt: &Checkpoint) -> Result<()>;
    
    /// 获取最新的 checkpoint
    async fn get_latest_checkpoint(&self) -> Result<Option<Checkpoint>>;

    /// 保存用户 nonce
    async fn put_nonce(&self, user: &str, nonce: u64) -> Result<()>;
    
    /// 获取用户 nonce
    async fn get_nonce(&self, user: &str) -> Result<Option<u64>>;
}

/// Sled 数据库实现
pub struct SledStore {
    db: Arc<Db>,
}

impl SledStore {
    /// 创建新的存储实例
    pub fn new(path: &str) -> Result<Self> {
        let db = sled::open(path)
            .map_err(|e| AgentError::Storage(e.to_string()))?;
        Ok(Self { db: Arc::new(db) })
    }

    /// 用于测试的内存实例
    #[cfg(test)]
    pub fn new_temp() -> Result<Self> {
        let db = sled::Config::new()
            .temporary(true)
            .open()
            .map_err(|e| AgentError::Storage(e.to_string()))?;
        Ok(Self { db: Arc::new(db) })
    }

    fn key_ucon(user: &str) -> String {
        format!("ucon:{}", user)
    }

    fn key_cstate(user: &str, contract: &str) -> String {
        format!("cstate:{}:{}", user, contract)
    }

    fn key_tx_stack(session_id: &str) -> String {
        format!("tx_stack:{}", session_id)
    }

    fn key_nonce(user: &str) -> String {
        format!("nonce:{}", user)
    }

    fn key_checkpoint() -> &'static str {
        "checkpoint:latest"
    }
}

#[async_trait]
impl StateStore for SledStore {
    async fn put_ucon_root(&self, user: &str, root: &str) -> Result<()> {
        let key = Self::key_ucon(user);
        self.db
            .insert(key.as_bytes(), root.as_bytes())
            .map_err(|e| AgentError::Storage(e.to_string()))?;
        Ok(())
    }

    async fn get_ucon_root(&self, user: &str) -> Result<Option<String>> {
        let key = Self::key_ucon(user);
        match self.db.get(key.as_bytes()) {
            Ok(Some(val)) => {
                let s = String::from_utf8(val.to_vec())
                    .map_err(|e| AgentError::Storage(e.to_string()))?;
                Ok(Some(s))
            }
            Ok(None) => Ok(None),
            Err(e) => Err(AgentError::Storage(e.to_string())),
        }
    }

    async fn put_cstate_root(&self, user: &str, contract: &str, root: &str) -> Result<()> {
        let key = Self::key_cstate(user, contract);
        self.db
            .insert(key.as_bytes(), root.as_bytes())
            .map_err(|e| AgentError::Storage(e.to_string()))?;
        Ok(())
    }

    async fn get_cstate_root(&self, user: &str, contract: &str) -> Result<Option<String>> {
        let key = Self::key_cstate(user, contract);
        match self.db.get(key.as_bytes()) {
            Ok(Some(val)) => {
                let s = String::from_utf8(val.to_vec())
                    .map_err(|e| AgentError::Storage(e.to_string()))?;
                Ok(Some(s))
            }
            Ok(None) => Ok(None),
            Err(e) => Err(AgentError::Storage(e.to_string())),
        }
    }

    async fn append_tx_stack(&self, session_id: &str, new_hash: &str) -> Result<()> {
        let key = Self::key_tx_stack(session_id);
        self.db
            .insert(key.as_bytes(), new_hash.as_bytes())
            .map_err(|e| AgentError::Storage(e.to_string()))?;
        Ok(())
    }

    async fn get_tx_stack(&self, session_id: &str) -> Result<Option<String>> {
        let key = Self::key_tx_stack(session_id);
        match self.db.get(key.as_bytes()) {
            Ok(Some(val)) => {
                let s = String::from_utf8(val.to_vec())
                    .map_err(|e| AgentError::Storage(e.to_string()))?;
                Ok(Some(s))
            }
            Ok(None) => Ok(None),
            Err(e) => Err(AgentError::Storage(e.to_string())),
        }
    }

    async fn save_checkpoint(&self, ckpt: &Checkpoint) -> Result<()> {
        let key = Self::key_checkpoint();
        let json = serde_json::to_string(ckpt)?;
        self.db
            .insert(key.as_bytes(), json.as_bytes())
            .map_err(|e| AgentError::Storage(e.to_string()))?;
        Ok(())
    }

    async fn get_latest_checkpoint(&self) -> Result<Option<Checkpoint>> {
        let key = Self::key_checkpoint();
        match self.db.get(key.as_bytes()) {
            Ok(Some(val)) => {
                let s = String::from_utf8(val.to_vec())
                    .map_err(|e| AgentError::Storage(e.to_string()))?;
                let ckpt: Checkpoint = serde_json::from_str(&s)?;
                Ok(Some(ckpt))
            }
            Ok(None) => Ok(None),
            Err(e) => Err(AgentError::Storage(e.to_string())),
        }
    }

    async fn put_nonce(&self, user: &str, nonce: u64) -> Result<()> {
        let key = Self::key_nonce(user);
        let bytes = nonce.to_le_bytes();
        self.db
            .insert(key.as_bytes(), &bytes)
            .map_err(|e| AgentError::Storage(e.to_string()))?;
        Ok(())
    }

    async fn get_nonce(&self, user: &str) -> Result<Option<u64>> {
        let key = Self::key_nonce(user);
        match self.db.get(key.as_bytes()) {
            Ok(Some(val)) => {
                let bytes: [u8; 8] = val.as_ref()
                    .try_into()
                    .map_err(|_| AgentError::Storage("Invalid nonce bytes".to_string()))?;
                Ok(Some(u64::from_le_bytes(bytes)))
            }
            Ok(None) => Ok(None),
            Err(e) => Err(AgentError::Storage(e.to_string())),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_ucon_storage() {
        let store = SledStore::new_temp().unwrap();
        
        store.put_ucon_root("0x123", "0xabc").await.unwrap();
        let root = store.get_ucon_root("0x123").await.unwrap();
        assert_eq!(root, Some("0xabc".to_string()));
        
        let none = store.get_ucon_root("0x999").await.unwrap();
        assert_eq!(none, None);
    }

    #[tokio::test]
    async fn test_checkpoint_storage() {
        let store = SledStore::new_temp().unwrap();
        
        let ckpt = Checkpoint {
            chain_id: 11155111,
            block_number: 12345,
            block_hash: "0xabc".to_string(),
            state_root: "0xdef".to_string(),
            timestamp: 1234567890,
        };
        
        store.save_checkpoint(&ckpt).await.unwrap();
        let loaded = store.get_latest_checkpoint().await.unwrap();
        assert_eq!(loaded, Some(ckpt));
    }

    #[tokio::test]
    async fn test_nonce_storage() {
        let store = SledStore::new_temp().unwrap();
        
        store.put_nonce("0x123", 42).await.unwrap();
        let nonce = store.get_nonce("0x123").await.unwrap();
        assert_eq!(nonce, Some(42));
    }
}
