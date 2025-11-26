//! 数据存储层

use agent_core::{EndCapPublic, Submission};
use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::sync::Arc;

/// 存储的 End Cap 记录
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EndCapRecord {
    pub header_id: String,
    pub submission: Submission,
    pub received_at: i64,
    pub checkpoint_root: String,
}

/// Realm 数据存储
pub struct RealmStore {
    db: Arc<sled::Db>,
}

impl RealmStore {
    /// 创建新的存储实例
    pub fn new(db_path: &str) -> Result<Self> {
        let db = sled::open(db_path)?;
        Ok(Self { db: Arc::new(db) })
    }

    /// 存储 End Cap 提交
    pub fn store_submission(&self, header_id: &str, submission: &Submission) -> Result<()> {
        let record = EndCapRecord {
            header_id: header_id.to_string(),
            submission: submission.clone(),
            received_at: chrono::Utc::now().timestamp(),
            checkpoint_root: submission.endcap.checkpoint_root_hash.clone(),
        };

        let key = format!("endcap:{}", header_id);
        let value = serde_json::to_vec(&record)?;
        self.db.insert(key.as_bytes(), value)?;

        // 按 checkpoint 分组存储
        let checkpoint_key = format!("checkpoint:{}", submission.endcap.checkpoint_root_hash);
        self.db
            .open_tree(checkpoint_key)?
            .insert(header_id.as_bytes(), header_id.as_bytes())?;

        Ok(())
    }

    /// 获取 End Cap 记录
    pub fn get_endcap(&self, header_id: &str) -> Result<Option<EndCapRecord>> {
        let key = format!("endcap:{}", header_id);
        if let Some(data) = self.db.get(key.as_bytes())? {
            let record: EndCapRecord = serde_json::from_slice(&data)?;
            Ok(Some(record))
        } else {
            Ok(None)
        }
    }

    /// 获取同一 checkpoint 下的所有 End Cap
    pub fn get_endcaps_by_checkpoint(&self, checkpoint_root: &str) -> Result<Vec<EndCapRecord>> {
        let tree_name = format!("checkpoint:{}", checkpoint_root);
        let tree = self.db.open_tree(tree_name)?;

        let mut records = Vec::new();
        for item in tree.iter() {
            let (_, header_id_bytes) = item?;
            let header_id = String::from_utf8(header_id_bytes.to_vec())?;
            if let Some(record) = self.get_endcap(&header_id)? {
                records.push(record);
            }
        }

        Ok(records)
    }

    /// 获取所有 End Cap 数量
    pub fn get_total_count(&self) -> Result<u64> {
        let count = self
            .db
            .iter()
            .filter(|item| {
                if let Ok((key, _)) = item {
                    String::from_utf8_lossy(key).starts_with("endcap:")
                } else {
                    false
                }
            })
            .count();
        Ok(count as u64)
    }

    /// 获取所有唯一的 checkpoint
    pub fn get_all_checkpoints(&self) -> Result<Vec<String>> {
        let mut checkpoints = std::collections::HashSet::new();

        for item in self.db.iter() {
            let (key, _) = item?;
            let key_str = String::from_utf8_lossy(&key);
            if key_str.starts_with("endcap:") {
                if let Some(data) = self.db.get(&key)? {
                    let record: EndCapRecord = serde_json::from_slice(&data)?;
                    checkpoints.insert(record.checkpoint_root);
                }
            }
        }

        Ok(checkpoints.into_iter().collect())
    }
}
