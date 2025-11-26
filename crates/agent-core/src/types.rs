//! 核心数据类型定义
//! 
//! 对齐 Psy 协议的 PARTH、UPS、SDKey 语义

use serde::{Deserialize, Serialize};

/// 与"上一区块"绑定的历史快照（全局只读）
/// 
/// 所有 UPS 会话都必须基于一个历史 checkpoint
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct Checkpoint {
    /// EVM 链 ID（例如：Sepolia=11155111）
    pub chain_id: u64,
    /// 区块号（latest - 1，确保已最终化）
    pub block_number: u64,
    /// 区块哈希
    pub block_hash: String,
    /// 状态树根
    pub state_root: String,
    /// 时间戳（Unix 秒）
    pub timestamp: u64,
}

/// 用户全局叶子（简化版）：与 PARTH/UCON 对齐
/// 
/// 代表 GUSR 树中的一个用户叶子节点
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct UserLeaf {
    /// 用户 ID（直接使用 EVM 地址 0x...）
    pub user_id: String,
    /// 用户合约树根（UCON root）
    pub ucon_root: String,
    /// 防重放计数器
    pub nonce: u64,
    /// 上次同步的 checkpoint 区块号
    pub last_checkpoint_block: u64,
    /// 可选：用户余额（简化版不存储在链上）
    #[serde(default)]
    pub balance: Option<u128>,
}

/// 用户对某合约的 CSTATE（仅本用户）
/// 
/// PARTH 架构：每个用户对每个合约都有独立的状态树
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct CState {
    /// 合约 ID（例如 "erc20:USDC" 或 GCON 索引）
    pub contract_id: String,
    /// KV 树根哈希
    pub tree_root: String,
}

/// UPS 会话头（随每步变更）
/// 
/// 追踪会话的当前状态、交易栈、债务树等
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpsHeader {
    /// 基于的历史 checkpoint
    pub checkpoint: Checkpoint,
    /// 会话开始时的用户叶子哈希
    pub start_user_leaf_hash: String,
    /// 当前用户叶子状态
    pub current_user_leaf: UserLeaf,
    /// 已执行的交易数量
    pub tx_count: u32,
    /// 递归栈哈希（Blake3 或 Poseidon 摘要）
    pub tx_stack_hash: String,
    /// 延迟债务树根（本 MVP 固定为 EMPTY）
    pub deferred_debt_root: String,
    /// 内联债务树根（本 MVP 固定为 EMPTY）
    pub inline_debt_root: String,
}

/// 每笔 CFC 执行后产生的"状态差分"
/// 
/// 记录合约状态树的变化
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StateDelta {
    /// 合约 ID
    pub contract_id: String,
    /// 旧的 CSTATE 根
    pub old_cstate_root: String,
    /// 新的 CSTATE 根
    pub new_cstate_root: String,
    /// 修改的槽位数量
    pub slots_modified: u32,
    /// 可选：KV 明细（用于 DA 存储）
    #[serde(default)]
    pub kv_changes: Vec<(String, String)>, // (key, value)
    /// 转账细节（用于链上执行）
    #[serde(default)]
    pub transfer_detail: Option<TransferDetail>,
}

/// 转账细节
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TransferDetail {
    /// 转账类型
    pub transfer_type: String, // "transfer_intent" 或 "claim_from"
    /// 发送方地址
    pub from: String,
    /// 接收方地址
    pub to: String,
    /// 代币地址（ERC20）
    pub token: String,
    /// 转账数量
    pub amount: u128,
}

/// UPS 结束产物（End Cap 的公开输入集合）
/// 
/// 这是提交到 Realm 的核心数据
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EndCapPublic {
    /// 会话开始时的用户叶子哈希
    pub start_user_leaf_hash: String,
    /// 会话结束时的用户叶子哈希
    pub end_user_leaf_hash: String,
    /// 基于的 checkpoint 根哈希
    pub checkpoint_root_hash: String,
    /// 最终的交易栈哈希
    pub tx_stack_hash: String,
    /// 交易数量
    pub tx_count: u32,
    /// 最终 nonce
    pub nonce: u64,
}

/// 送交 Realm 的提交包
/// 
/// 包含 End Cap 证明和状态增量
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Submission {
    /// End Cap 公开输入
    pub endcap: EndCapPublic,
    /// RISC0 receipt 字节
    pub endcap_receipt: Vec<u8>,
    /// 状态增量列表
    pub deltas: Vec<StateDelta>,
}

/// 价格源结果
/// 
/// 从 CoinGecko 等获取的价格数据（仅展示用）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PriceFeed {
    /// 代币符号
    pub symbol: String,
    /// USD 价格
    pub usd: f64,
    /// 可选：更新时间
    #[serde(default)]
    pub updated_at: Option<u64>,
}

/// CFC 调用类型
/// 
/// 简化的合约函数调用枚举
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum CfcCall {
    /// 转账意图（发起方视角）
    TransferIntent {
        to: String,
        token: String,
        amount: u128,
    },
    /// 从他人领取（接收方视角）
    ClaimFrom {
        from: String,
        token: String,
        amount: u128,
    },
}

/// SDKey 策略参数
/// 
/// 定义可编程签名电路的约束条件
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SdKeyParams {
    /// 每日限额（USDC 单位）
    pub daily_limit_usdc: u128,
    /// 时间窗口开始（Unix 时间戳）
    pub window_start_unix: u64,
    /// 时间窗口结束（Unix 时间戳）
    pub window_end_unix: u64,
    /// 允许的电路指纹白名单
    pub circuit_fingerprint_whitelist: Vec<String>,
}

// 常量定义
pub const EMPTY_TREE_ROOT: &str = "0x0000000000000000000000000000000000000000000000000000000000000000";
pub const ZERO_HASH: &str = "0x0000000000000000000000000000000000000000000000000000000000000000";

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_checkpoint_serialization() {
        let ckpt = Checkpoint {
            chain_id: 11155111,
            block_number: 12345,
            block_hash: "0xabc".to_string(),
            state_root: "0xdef".to_string(),
            timestamp: 1234567890,
        };

        let json = serde_json::to_string(&ckpt).unwrap();
        let decoded: Checkpoint = serde_json::from_str(&json).unwrap();
        assert_eq!(ckpt, decoded);
    }

    #[test]
    fn test_cfc_call_serialization() {
        let call = CfcCall::TransferIntent {
            to: "0x123".to_string(),
            token: "USDC".to_string(),
            amount: 100,
        };

        let json = serde_json::to_string(&call).unwrap();
        let decoded: CfcCall = serde_json::from_str(&json).unwrap();
        
        match decoded {
            CfcCall::TransferIntent { to, token, amount } => {
                assert_eq!(to, "0x123");
                assert_eq!(token, "USDC");
                assert_eq!(amount, 100);
            }
            _ => panic!("Wrong variant"),
        }
    }
}
