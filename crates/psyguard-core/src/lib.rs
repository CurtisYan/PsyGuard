//! PsyGuard Core - Psy 协议核心实现
//! 
//! 本模块实现 UPS (User Proving Session) 本地证明、End Cap 提交、
//! GUTA 聚合等核心功能，严格遵循 Psy 文档规范。
//! 
//! 参考文档：
//! - 《5-Local Proving (UPS).md》
//! - 《6-Smart Contracts.md》
//! - 《4_Global User Tree Aggregation (GUTA).md》

pub mod types;
pub mod traits;
pub mod ups;
pub mod cft;
pub mod sdkey;
pub mod state;
pub mod error;
pub mod preview;
pub mod queue;

pub use types::*;
pub use traits::*;
pub use error::{PsyGuardError, Result};
