//! UPS 队列管理
//! 
//! 管理 UPS 会话中的交易队列,支持预演、执行、累积信息统计
//! 参考: 《5-Local Proving (UPS).md》

use crate::types::*;
use crate::error::{PsyGuardError, Result};
use std::time::{SystemTime, UNIX_EPOCH};

/// UPS 队列管理器
pub struct UpsQueue {
    /// 队列项
    items: Vec<UpsQueueItem>,
    /// 累积信息
    accumulated_info: UpsAccumulatedInfo,
    /// 开始时间
    start_time: u64,
}

impl UpsQueue {
    /// 创建新队列
    pub fn new(initial_ucon_root: Hash) -> Self {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_millis() as u64;

        Self {
            items: Vec::new(),
            accumulated_info: UpsAccumulatedInfo {
                total_items: 0,
                total_proving_time_ms: 0,
                estimated_endcap_size_kb: 0,
                old_ucon_root: initial_ucon_root,
                new_ucon_root: initial_ucon_root,
            },
            start_time: now,
        }
    }

    /// 添加队列项
    pub fn add_item(&mut self, cfc_id: CfcId, args: String) -> u32 {
        let index = self.items.len() as u32;
        
        let item = UpsQueueItem {
            index,
            cfc_id,
            args,
            status: UpsQueueItemStatus::Pending,
            preview_result: None,
            cft_verification: None,
        };

        self.items.push(item);
        self.accumulated_info.total_items += 1;

        index
    }

    /// 更新队列项的预演结果
    pub fn update_preview(
        &mut self, 
        index: u32, 
        preview_result: ReadOnlyPreviewResult,
    ) -> Result<()> {
        let item = self.items.get_mut(index as usize)
            .ok_or_else(|| PsyGuardError::NotFound(format!("队列项 {} 不存在", index)))?;

        item.preview_result = Some(preview_result.clone());
        item.status = if preview_result.success {
            UpsQueueItemStatus::PreviewSuccess
        } else {
            UpsQueueItemStatus::PreviewFailed
        };

        Ok(())
    }

    /// 更新队列项的 CFT 校验结果
    pub fn update_cft_verification(
        &mut self,
        index: u32,
        cft_verification: CftVerificationResult,
    ) -> Result<()> {
        let item = self.items.get_mut(index as usize)
            .ok_or_else(|| PsyGuardError::NotFound(format!("队列项 {} 不存在", index)))?;

        item.cft_verification = Some(cft_verification.clone());

        // 如果 CFT 校验失败,标记为失败
        if !cft_verification.in_cft {
            item.status = UpsQueueItemStatus::Failed;
        }

        Ok(())
    }

    /// 标记队列项开始执行
    pub fn mark_executing(&mut self, index: u32) -> Result<()> {
        let item = self.items.get_mut(index as usize)
            .ok_or_else(|| PsyGuardError::NotFound(format!("队列项 {} 不存在", index)))?;

        item.status = UpsQueueItemStatus::Executing;
        Ok(())
    }

    /// 标记队列项执行成功
    pub fn mark_success(&mut self, index: u32, proving_time_ms: u64) -> Result<()> {
        let item = self.items.get_mut(index as usize)
            .ok_or_else(|| PsyGuardError::NotFound(format!("队列项 {} 不存在", index)))?;

        item.status = UpsQueueItemStatus::Success;
        
        // 更新累积信息
        self.accumulated_info.total_proving_time_ms += proving_time_ms;
        self.accumulated_info.estimated_endcap_size_kb += 10; // Mock: 每个证明约 10KB

        Ok(())
    }

    /// 标记队列项执行失败
    pub fn mark_failed(&mut self, index: u32) -> Result<()> {
        let item = self.items.get_mut(index as usize)
            .ok_or_else(|| PsyGuardError::NotFound(format!("队列项 {} 不存在", index)))?;

        item.status = UpsQueueItemStatus::Failed;
        Ok(())
    }

    /// 更新 UCON 根
    pub fn update_ucon_root(&mut self, new_ucon_root: Hash) {
        self.accumulated_info.new_ucon_root = new_ucon_root;
    }

    /// 获取所有队列项
    pub fn get_items(&self) -> &[UpsQueueItem] {
        &self.items
    }

    /// 获取累积信息
    pub fn get_accumulated_info(&self) -> &UpsAccumulatedInfo {
        &self.accumulated_info
    }

    /// 获取成功的队列项数量
    pub fn get_success_count(&self) -> u32 {
        self.items
            .iter()
            .filter(|item| item.status == UpsQueueItemStatus::Success)
            .count() as u32
    }

    /// 获取失败的队列项数量
    pub fn get_failed_count(&self) -> u32 {
        self.items
            .iter()
            .filter(|item| item.status == UpsQueueItemStatus::Failed)
            .count() as u32
    }

    /// 检查是否所有项都完成
    pub fn is_all_completed(&self) -> bool {
        self.items.iter().all(|item| {
            item.status == UpsQueueItemStatus::Success 
            || item.status == UpsQueueItemStatus::Failed
        })
    }

    /// 检查是否可以提交 End Cap
    pub fn can_submit_endcap(&self) -> bool {
        !self.items.is_empty() && 
        self.get_success_count() > 0 &&
        self.is_all_completed()
    }

    /// 清空队列
    pub fn clear(&mut self) {
        self.items.clear();
        self.accumulated_info.total_items = 0;
        self.accumulated_info.total_proving_time_ms = 0;
        self.accumulated_info.estimated_endcap_size_kb = 0;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_ups_queue() {
        let mut queue = UpsQueue::new([0u8; 32]);

        // 添加队列项
        let index = queue.add_item(
            CfcId {
                contract_id: ContractId("token".to_string()),
                function_name: "transfer".to_string(),
            },
            r#"{"to": "bob", "amount": 100}"#.to_string(),
        );

        assert_eq!(index, 0);
        assert_eq!(queue.get_items().len(), 1);

        // 更新预演结果
        queue.update_preview(index, ReadOnlyPreviewResult {
            success: true,
            slots_to_modify: vec![],
            balance_changes: vec![],
            will_trigger_limit: false,
            requires_2fa: false,
            estimated_gas: 21000,
            error_message: None,
        }).unwrap();

        assert_eq!(queue.get_items()[0].status, UpsQueueItemStatus::PreviewSuccess);

        // 标记执行成功
        queue.mark_executing(index).unwrap();
        queue.mark_success(index, 1000).unwrap();

        assert_eq!(queue.get_success_count(), 1);
        assert!(queue.can_submit_endcap());
    }
}
