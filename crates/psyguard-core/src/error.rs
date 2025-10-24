use thiserror::Error;

#[derive(Error, Debug)]
pub enum PsyGuardError {
    #[error("CFT 校验失败: 函数指纹 {0} 不在白名单中")]
    CftVerificationFailed(String),

    #[error("UPS 会话错误: {0}")]
    UpsSessionError(String),

    #[error("证明生成失败: {0}")]
    ProofGenerationFailed(String),

    #[error("状态转换无效: {0}")]
    InvalidStateTransition(String),

    #[error("SDKey 策略违规: {0}")]
    SdkeyPolicyViolation(String),

    #[error("网络错误: {0}")]
    NetworkError(String),

    #[error("序列化错误: {0}")]
    SerializationError(String),

    #[error("未找到: {0}")]
    NotFound(String),

    #[error("内部错误: {0}")]
    InternalError(String),
}

pub type Result<T> = std::result::Result<T, PsyGuardError>;
