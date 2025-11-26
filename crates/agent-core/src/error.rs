//! 错误类型定义

use thiserror::Error;

#[derive(Error, Debug)]
pub enum AgentError {
    #[error("存储错误: {0}")]
    Storage(String),

    #[error("序列化错误: {0}")]
    Serialization(#[from] serde_json::Error),

    #[error("哈希计算错误: {0}")]
    Hashing(String),

    #[error("无效的 checkpoint: {0}")]
    InvalidCheckpoint(String),

    #[error("无效的用户状态: {0}")]
    InvalidUserState(String),

    #[error("UPS 会话错误: {0}")]
    SessionError(String),

    #[error("证明生成失败: {0}")]
    ProofGeneration(String),

    #[error("证明验证失败: {0}")]
    ProofVerification(String),

    #[error("网络请求失败: {0}")]
    Network(String),

    #[error("配置错误: {0}")]
    Config(String),

    #[error("未找到: {0}")]
    NotFound(String),

    #[error("其他错误: {0}")]
    Other(String),
}

pub type Result<T> = std::result::Result<T, AgentError>;
