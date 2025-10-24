//! 核心 Trait 接口定义
//! 
//! 参考: 教程第3步 - 定义核心接口

use crate::types::*;
use crate::error::Result;

/// 网络状态接口
/// 负责从 Realm/Coordinator/DA 获取全局状态
pub trait NetworkState: Send + Sync {
    /// 获取最新的 finalized checkpoint
    /// 参考: 《3-How a Block is Made.md》
    fn latest_finalized_chkp(&self) -> Result<CheckpointRef>;

    /// 获取用户叶上下文 (带 Merkle 证明)
    /// 参考: 《5-Local Proving (UPS).md》- 从 GUSR 中取回用户上下文
    fn fetch_user_leaf(&self, user_id: &UserId, chkp: &CheckpointRef) -> Result<UserLeafCtx>;

    /// 获取合约元数据 (CFT 根和 CSTATE 高度)
    /// 参考: 《6-Smart Contracts.md》- 从 GCON 获取合约信息
    fn fetch_contract_meta(&self, contract_id: &ContractId) -> Result<(CftRoot, CstateHeight)>;

    /// 获取历史 CSTATE 叶值 (带 Merkle 证明，用于只读)
    /// 参考: 《2-Miners & Roles on Psy.md》- DA Miners 提供历史读
    fn fetch_cstate_leaf(&self, contract_id: &ContractId, slot: u64, chkp: &CheckpointRef) 
        -> Result<(Vec<u8>, Vec<Hash>)>;
}

/// 证明器接口
/// 负责生成 ZK 证明
pub trait Prover: Send + Sync {
    /// 证明 CFC 执行
    /// 参考: 《5-Local Proving (UPS).md》- CFC 本地执行与证明
    fn prove_cfc(
        &self,
        cfc: &CfcId,
        inputs: &CfcInputs,
        start_cstate_root: Hash,
    ) -> Result<(CfcProof, TxEndCtx)>;

    /// UPS 集成步骤 (递归合并)
    /// 参考: 《5-Local Proving (UPS).md》- UPS 集成校验 CFT & UCON/CSTATE 过渡
    fn ups_integrate_step(
        &self,
        prev: &UpsStepProof,
        cfc_proof: &CfcProof,
        cft_proof: &CftInclusionProof,
        ucon_delta: &UconDeltaProof,
        debts_delta: &DebtDeltaProof,
    ) -> Result<UpsStepProof>;

    /// 终结 End Cap
    /// 参考: 《5-Local Proving (UPS).md》- End Cap 终结电路
    fn finalize_endcap(
        &self,
        last_step: &UpsStepProof,
        sdkey_sig: &SignatureProof,
    ) -> Result<EndCapProof>;

    /// 生成 SDKey 签名证明
    /// 参考: 《7-Psy Jargon.md》- SDKey 签名电路
    fn sign_with_sdkey(
        &self,
        message: &[u8],
        policy: &SdkeyPolicy,
    ) -> Result<SignatureProof>;
}

/// 提交器接口
/// 负责将 End Cap 提交到 Realm
pub trait Submitter: Send + Sync {
    /// 提交 End Cap 和状态变更
    /// 参考: 《5-Local Proving (UPS).md》- End Cap 提交
    fn submit_endcap(
        &self,
        endcap: &EndCapProof,
        state_deltas: Vec<CstateDelta>,
    ) -> Result<SubmitReceipt>;
}

/// SDKey 策略
/// 参考: 《7-Psy Jargon.md》- SDKey 可编程策略
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct SdkeyPolicy {
    /// 日限额 (可选)
    pub daily_limit: Option<u64>,
    /// 受信合约白名单 (可选)
    pub trusted_contracts: Option<Vec<ContractId>>,
    /// 时间锁 (Unix 时间戳，可选)
    pub time_lock_until: Option<u64>,
    /// 需要 2FA (可选)
    pub require_2fa: bool,
}
