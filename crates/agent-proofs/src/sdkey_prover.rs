//! SDKey 证明生成器
//! 
//! 为会话授权生成 ZK 签名证明

use agent_core::{EndCapPublic, SdKeyParams, error::Result};
use crate::engine::ProofEngine;

pub struct SdKeyProver {
    engine: Box<dyn ProofEngine>,
}

impl SdKeyProver {
    pub fn new(engine: Box<dyn ProofEngine>) -> Self {
        Self { engine }
    }

    /// 生成 SDKey 签名证明
    /// 
    /// 验证策略约束并授权 EndCapPublic
    pub fn prove_signature(
        &self,
        endcap: &EndCapPublic,
        params: &SdKeyParams,
    ) -> Result<Vec<u8>> {
        // TODO: 序列化输入并调用 guest
        
        // 占位返回
        let receipt = self.engine.prove(b"placeholder")?;
        Ok(receipt)
    }
}
