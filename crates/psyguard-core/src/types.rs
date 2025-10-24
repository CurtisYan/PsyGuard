//! 核心数据类型定义
//! 
//! 严格对应 Psy 协议文档中的数据结构

use serde::{Deserialize, Serialize};

/// 哈希值类型 (32 字节)
pub type Hash = [u8; 32];

/// 用户 ID
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct UserId(pub String);

/// 合约 ID
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct ContractId(pub String);

/// CFC (Contract Function Circuit) ID
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct CfcId {
    pub contract_id: ContractId,
    pub function_name: String,
}

/// Checkpoint 引用
/// 参考: 《5-Local Proving (UPS).md》- UPS 绑定的全局历史根
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CheckpointRef {
    /// CHKP 根哈希
    pub chkp_root: Hash,
    /// 区块号
    pub block_number: u64,
}

/// 用户叶上下文
/// 参考: 《5-Local Proving (UPS).md》- UPS 启动时需要的用户上下文
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserLeafCtx {
    /// 用户叶哈希
    pub uleaf_hash: Hash,
    /// UCON (User Container) 根
    pub ucon_root: Hash,
    /// 余额
    pub balance: u64,
    /// Nonce
    pub nonce: u64,
}

/// CFC 函数指纹 (32 字节十六进制)
/// 参考: 《6-Smart Contracts.md》- CFT 指纹白名单
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct CfcFingerprint(pub String);

/// CFT (Contract Function Tree) 根
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CftRoot(pub Hash);

/// CFT 包含证明 (Merkle 路径)
/// 参考: 《6-Smart Contracts.md》- 函数指纹在 CFT 的包含证明
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CftInclusionProof {
    /// Merkle 路径
    pub merkle_path: Vec<Hash>,
    /// CFT 根
    pub cft_root: CftRoot,
}

/// CSTATE (Contract State) 高度
pub type CstateHeight = u64;

/// CSTATE Delta 证明
/// 参考: 《5-Local Proving (UPS).md》- 证明 CSTATE 根从旧到新的过渡
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CstateDeltaProof {
    pub old_root: Hash,
    pub new_root: Hash,
    pub merkle_path: Vec<Hash>,
    pub modified_leaves: Vec<(u64, Hash)>, // (index, new_value)
}

/// UCON Delta 证明
/// 参考: 《5-Local Proving (UPS).md》- 证明 UCON 根从旧到新的过渡
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UconDeltaProof {
    pub old_root: Hash,
    pub new_root: Hash,
    pub contract_id: ContractId,
    pub cstate_delta: CstateDeltaProof,
}

/// Debts Delta 证明
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DebtDeltaProof {
    pub old_debts: Vec<(ContractId, u64)>,
    pub new_debts: Vec<(ContractId, u64)>,
}

/// CFC 输入
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CfcInputs {
    pub function_args: Vec<u8>,
    pub caller: UserId,
    pub contract_state_root: Hash,
}

/// CFC 证明
/// 参考: 《5-Local Proving (UPS).md》- CFC 本地执行与证明
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CfcProof {
    pub proof_data: Vec<u8>,
    pub tx_end_ctx: TxEndCtx,
}

/// 交易结束上下文
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TxEndCtx {
    pub end_contract_state_root: Hash,
    pub gas_used: u64,
    pub success: bool,
    pub return_data: Vec<u8>,
}

/// UPS 头部
/// 参考: 《5-Local Proving (UPS).md》- UPS Header
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpsHeader {
    pub user_id: UserId,
    pub checkpoint_ref: CheckpointRef,
    pub user_leaf_ctx: UserLeafCtx,
    pub session_id: String,
}

/// UPS 步骤证明
/// 参考: 《5-Local Proving (UPS).md》- UPS 步骤证明
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpsStepProof {
    pub step_number: u32,
    pub accumulated_proof: Vec<u8>,
    pub current_ucon_root: Hash,
    pub current_debts: Vec<(ContractId, u64)>,
}

/// 签名证明 (SDKey)
/// 参考: 《7-Psy Jargon.md》- SDKey 签名电路
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SignatureProof {
    pub proof_data: Vec<u8>,
    pub public_key_hash: Hash,
    pub policy_satisfied: Vec<String>,
}

/// End Cap 证明
/// 参考: 《5-Local Proving (UPS).md》- End Cap 终结证明
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EndCapProof {
    pub ups_header: UpsHeader,
    pub final_step: UpsStepProof,
    pub signature_proof: SignatureProof,
    pub timestamp: u64,
}

/// CSTATE Delta (提交时附带的状态变更)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CstateDelta {
    pub contract_id: ContractId,
    pub modified_slots: Vec<(u64, Vec<u8>)>, // (slot_index, new_value)
}

/// 提交收据
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SubmitReceipt {
    pub receipt_id: String,
    pub timestamp: u64,
    pub guta_path: Option<GutaPath>,
}

/// GUTA 聚合路径
/// 参考: 《4_Global User Tree Aggregation (GUTA).md》
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GutaPath {
    pub realm_segment: String,
    pub coordinator_segment: String,
    pub global_root: Hash,
    pub nca_count: u32,
    pub proof_summary: String,
    pub height: u64,
}

/// CFT 校验结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CftVerificationResult {
    pub fingerprint: CfcFingerprint,
    pub in_cft: bool,
    pub cft_root: CftRoot,
    pub depth: usize,
    pub merkle_path: Option<Vec<Hash>>,
    pub source: String, // "GCON.CLEAF"
}

/// 只读预演结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReadOnlyPreviewResult {
    pub success: bool,
    pub slots_to_modify: Vec<SlotModification>,
    pub balance_changes: Vec<BalanceChange>,
    pub will_trigger_limit: bool,
    pub requires_2fa: bool,
    pub estimated_gas: u64,
    pub error_message: Option<String>,
}

/// 槽位修改信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SlotModification {
    pub slot_index: u64,
    pub old_value: Vec<u8>,
    pub new_value: Vec<u8>,
    pub description: String,
}

/// 余额变化
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BalanceChange {
    pub account: UserId,
    pub old_balance: u64,
    pub new_balance: u64,
    pub delta: i64,
}

/// UPS 队列项
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpsQueueItem {
    pub index: u32,
    pub cfc_id: CfcId,
    pub args: String,
    pub status: UpsQueueItemStatus,
    pub preview_result: Option<ReadOnlyPreviewResult>,
    pub cft_verification: Option<CftVerificationResult>,
}

/// UPS 队列项状态
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum UpsQueueItemStatus {
    Pending,
    PreviewSuccess,
    PreviewFailed,
    Executing,
    Success,
    Failed,
}

/// UPS 累积信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpsAccumulatedInfo {
    pub total_items: u32,
    pub total_proving_time_ms: u64,
    pub estimated_endcap_size_kb: u64,
    pub old_ucon_root: Hash,
    pub new_ucon_root: Hash,
}

/// SDKey 约束检查结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SdkeyConstraintCheck {
    pub limit_check: ConstraintCheckResult,
    pub whitelist_check: ConstraintCheckResult,
    pub timelock_check: ConstraintCheckResult,
    pub twofa_check: TwoFaCheckResult,
}

/// 约束检查结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConstraintCheckResult {
    pub passed: bool,
    pub message: String,
}

/// 2FA 检查结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TwoFaCheckResult {
    pub required: bool,
    pub verified: bool,
    pub message: String,
}
