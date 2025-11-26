//! 指标收集和 GUTA-lite 聚合树

use agent_core::EndCapPublic;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RealmMetrics {
    pub total_submissions: u64,
    pub unique_checkpoints: u64,
    pub guta_trees: Vec<GutaTree>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GutaTree {
    pub checkpoint_root: String,
    pub endcap_count: u32,
    pub layers: Vec<GutaLayer>,
    pub root_hash: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GutaLayer {
    pub level: u32,
    pub node_count: u32,
    pub nodes: Vec<String>,
}

/// 构建 GUTA-lite 聚合树
/// 
/// 将同一 checkpoint 下的 End Cap 聚合成二叉树
pub fn build_guta_tree(checkpoint_root: &str, endcaps: &[EndCapPublic]) -> GutaTree {
    if endcaps.is_empty() {
        return GutaTree {
            checkpoint_root: checkpoint_root.to_string(),
            endcap_count: 0,
            layers: vec![],
            root_hash: "empty".to_string(),
        };
    }

    // 第 0 层：所有 End Cap 的哈希
    let mut current_layer: Vec<String> = endcaps
        .iter()
        .map(|ec| {
            // 计算 End Cap 的哈希
            let data = format!(
                "{}:{}:{}:{}",
                ec.start_user_leaf_hash,
                ec.end_user_leaf_hash,
                ec.tx_stack_hash,
                ec.nonce
            );
            blake3::hash(data.as_bytes()).to_string()
        })
        .collect();

    let mut layers = vec![GutaLayer {
        level: 0,
        node_count: current_layer.len() as u32,
        nodes: current_layer.clone(),
    }];

    // 构建二叉树的各层
    let mut level = 1;
    while current_layer.len() > 1 {
        let mut next_layer = Vec::new();

        for chunk in current_layer.chunks(2) {
            let hash = if chunk.len() == 2 {
                // Hash(left || right)
                let combined = format!("{}:{}", chunk[0], chunk[1]);
                blake3::hash(combined.as_bytes()).to_string()
            } else {
                // 奇数个节点，最后一个直接提升
                chunk[0].clone()
            };
            next_layer.push(hash);
        }

        layers.push(GutaLayer {
            level,
            node_count: next_layer.len() as u32,
            nodes: next_layer.clone(),
        });

        current_layer = next_layer;
        level += 1;
    }

    let root_hash = current_layer.first().cloned().unwrap_or_default();

    GutaTree {
        checkpoint_root: checkpoint_root.to_string(),
        endcap_count: endcaps.len() as u32,
        layers,
        root_hash,
    }
}
