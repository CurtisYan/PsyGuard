//! CFT (Contract Function Tree) 指纹白名单校验
//! 
//! 参考: 《6-Smart Contracts.md》- CFT 指纹白名单

use crate::types::*;
use crate::error::{PsyGuardError, Result};
use sha2::{Sha256, Digest};

pub use crate::types::CftVerificationResult;

/// CFT 校验器
pub struct CftVerifier;

impl CftVerifier {
    /// 校验函数指纹是否在 CFT 中
    /// 参考: 《6-Smart Contracts.md》- 函数指纹 Merkle 校验
    pub fn verify_inclusion(
        fingerprint: &CfcFingerprint,
        proof: &CftInclusionProof,
    ) -> Result<bool> {
        // 1. 计算指纹哈希
        let leaf_hash = Self::hash_fingerprint(fingerprint);

        // 2. 沿 Merkle 路径向上计算
        let mut current_hash = leaf_hash;
        for sibling in &proof.merkle_path {
            current_hash = Self::hash_pair(&current_hash, sibling);
        }

        // 3. 验证是否等于 CFT 根
        Ok(current_hash == proof.cft_root.0)
    }

    /// 完整的 CFT 校验,返回详细结果
    /// 用于前端展示
    pub fn verify_with_details(
        fingerprint: &CfcFingerprint,
        proof: &CftInclusionProof,
    ) -> Result<CftVerificationResult> {
        let in_cft = Self::verify_inclusion(fingerprint, proof)?;
        
        Ok(CftVerificationResult {
            fingerprint: fingerprint.clone(),
            in_cft,
            cft_root: proof.cft_root.clone(),
            depth: proof.merkle_path.len(),
            merkle_path: Some(proof.merkle_path.clone()),
            source: "GCON.CLEAF".to_string(),
        })
    }

    /// 计算指纹哈希
    fn hash_fingerprint(fingerprint: &CfcFingerprint) -> Hash {
        let mut hasher = Sha256::new();
        hasher.update(fingerprint.0.as_bytes());
        let result = hasher.finalize();
        let mut hash = [0u8; 32];
        hash.copy_from_slice(&result);
        hash
    }

    /// 计算两个哈希的父节点
    fn hash_pair(left: &Hash, right: &Hash) -> Hash {
        let mut hasher = Sha256::new();
        hasher.update(left);
        hasher.update(right);
        let result = hasher.finalize();
        let mut hash = [0u8; 32];
        hash.copy_from_slice(&result);
        hash
    }

    /// 构建 CFT (从函数指纹列表)
    /// 参考: 《6-Smart Contracts.md》- 部署时生成 CFT
    pub fn build_cft(fingerprints: &[CfcFingerprint]) -> CftRoot {
        if fingerprints.is_empty() {
            return CftRoot([0u8; 32]);
        }

        // 1. 计算所有叶节点哈希
        let mut level: Vec<Hash> = fingerprints
            .iter()
            .map(|fp| Self::hash_fingerprint(fp))
            .collect();

        // 2. 逐层向上构建 Merkle 树
        while level.len() > 1 {
            let mut next_level = Vec::new();
            for chunk in level.chunks(2) {
                if chunk.len() == 2 {
                    next_level.push(Self::hash_pair(&chunk[0], &chunk[1]));
                } else {
                    // 奇数个节点，最后一个直接提升
                    next_level.push(chunk[0]);
                }
            }
            level = next_level;
        }

        CftRoot(level[0])
    }

    /// 生成 Merkle 包含证明
    pub fn generate_proof(
        fingerprints: &[CfcFingerprint],
        target_index: usize,
    ) -> Result<CftInclusionProof> {
        if target_index >= fingerprints.len() {
            return Err(PsyGuardError::NotFound(format!(
                "指纹索引 {} 超出范围",
                target_index
            )));
        }

        // 1. 计算所有叶节点
        let mut level: Vec<Hash> = fingerprints
            .iter()
            .map(|fp| Self::hash_fingerprint(fp))
            .collect();

        let mut merkle_path = Vec::new();
        let mut current_index = target_index;

        // 2. 逐层收集兄弟节点
        while level.len() > 1 {
            let sibling_index = if current_index % 2 == 0 {
                current_index + 1
            } else {
                current_index - 1
            };

            if sibling_index < level.len() {
                merkle_path.push(level[sibling_index]);
            }

            // 构建下一层
            let mut next_level = Vec::new();
            for chunk in level.chunks(2) {
                if chunk.len() == 2 {
                    next_level.push(Self::hash_pair(&chunk[0], &chunk[1]));
                } else {
                    next_level.push(chunk[0]);
                }
            }

            level = next_level;
            current_index /= 2;
        }

        let cft_root = CftRoot(level[0]);

        Ok(CftInclusionProof {
            merkle_path,
            cft_root,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_cft_build_and_verify() {
        let fingerprints = vec![
            CfcFingerprint("func1".to_string()),
            CfcFingerprint("func2".to_string()),
            CfcFingerprint("func3".to_string()),
        ];

        let cft_root = CftVerifier::build_cft(&fingerprints);
        let proof = CftVerifier::generate_proof(&fingerprints, 1).unwrap();

        assert_eq!(proof.cft_root.0, cft_root.0);

        let verified = CftVerifier::verify_inclusion(&fingerprints[1], &proof).unwrap();
        assert!(verified);
    }
}
