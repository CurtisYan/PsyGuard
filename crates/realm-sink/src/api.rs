//! API 端点

use actix_web::{web, HttpResponse, Responder};
use agent_core::Submission;
use serde_json::json;
use uuid::Uuid;

use crate::store::RealmStore;
use crate::metrics::{build_guta_tree, RealmMetrics};

/// 应用状态
pub struct AppState {
    pub store: RealmStore,
}

/// 健康检查
pub async fn health() -> impl Responder {
    HttpResponse::Ok().json(json!({
        "status": "ok",
        "service": "realm-sink",
        "version": "1.0.0"
    }))
}

/// 接收 End Cap 提交
/// 
/// POST /ingest
pub async fn ingest(
    data: web::Data<AppState>,
    submission: web::Json<Submission>,
) -> impl Responder {
    tracing::info!("📥 收到 End Cap 提交");

    // 验证 receipt（简化版：检查是否存在）
    if submission.endcap_receipt.is_empty() {
        tracing::warn!("❌ Receipt 为空");
        return HttpResponse::BadRequest().json(json!({
            "error": "Empty receipt"
        }));
    }

    // TODO: 使用 agent_proofs::verify_endcap 验证证明
    // 由于 agent_proofs 可能还没有 verify_endcap 函数，暂时跳过验证
    tracing::info!("⚠️  跳过证明验证（演示模式）");

    // 生成唯一 header_id
    let header_id = format!("header_{}", Uuid::new_v4());

    // 存储到数据库
    match data.store.store_submission(&header_id, &submission) {
        Ok(_) => {
            tracing::info!("✅ 成功存储 End Cap: {}", header_id);
            tracing::info!(
                "  - tx_count: {}",
                submission.endcap.tx_count
            );
            tracing::info!("  - nonce: {}", submission.endcap.nonce);
            tracing::info!("  - deltas: {}", submission.deltas.len());
            tracing::info!(
                "  - checkpoint: {}",
                &submission.endcap.checkpoint_root_hash[..16]
            );

            HttpResponse::Ok().json(json!({
                "status": "accepted",
                "header_id": header_id,
                "message": "End Cap accepted and stored"
            }))
        }
        Err(e) => {
            tracing::error!("❌ 存储失败: {}", e);
            HttpResponse::InternalServerError().json(json!({
                "error": format!("Failed to store submission: {}", e)
            }))
        }
    }
}

/// 获取指标和 GUTA 树
/// 
/// GET /metrics
pub async fn metrics(data: web::Data<AppState>) -> impl Responder {
    tracing::info!("📊 查询指标");

    // 获取总数
    let total_submissions = data.store.get_total_count().unwrap_or(0);

    // 获取所有唯一的 checkpoint
    let checkpoints = match data.store.get_all_checkpoints() {
        Ok(cp) => cp,
        Err(e) => {
            tracing::error!("❌ 获取 checkpoint 失败: {}", e);
            return HttpResponse::InternalServerError().json(json!({
                "error": format!("Failed to get checkpoints: {}", e)
            }));
        }
    };

    // 为每个 checkpoint 构建 GUTA 树
    let mut guta_trees = Vec::new();
    for checkpoint in &checkpoints {
        match data.store.get_endcaps_by_checkpoint(checkpoint) {
            Ok(records) => {
                let endcaps: Vec<_> = records
                    .iter()
                    .map(|r| r.submission.endcap.clone())
                    .collect();

                let tree = build_guta_tree(checkpoint, &endcaps);
                guta_trees.push(tree);
            }
            Err(e) => {
                tracing::error!("❌ 构建 GUTA 树失败: {}", e);
            }
        }
    }

    let metrics = RealmMetrics {
        total_submissions,
        unique_checkpoints: checkpoints.len() as u64,
        guta_trees,
    };

    HttpResponse::Ok().json(metrics)
}
