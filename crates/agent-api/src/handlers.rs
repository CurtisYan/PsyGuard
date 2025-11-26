//! API 处理函数

use actix_web::{web, HttpResponse, Responder};
use serde::{Deserialize, Serialize};
use agent_core::*;
use std::collections::HashMap;
use std::sync::Mutex;

lazy_static::lazy_static! {
    static ref SESSIONS: Mutex<HashMap<String, UpsSession>> = Mutex::new(HashMap::new());
}

#[derive(Deserialize)]
pub struct BalanceRequest {
    pub address: String,
    pub token_address: Option<String>,
}

#[derive(Serialize)]
pub struct BalanceResponse {
    pub balance: String,
    pub symbol: String,
}

pub async fn get_balance(
    state: web::Data<super::AppState>,
    req: web::Json<BalanceRequest>,
) -> impl Responder {
    let balance = if let Some(token_addr) = &req.token_address {
        // ERC-20 余额
        match state.datasource.get_erc20_balance(&req.address, token_addr).await {
            Ok(b) => b,
            Err(e) => {
                return HttpResponse::InternalServerError().json(serde_json::json!({
                    "error": format!("Failed to get ERC-20 balance: {}", e)
                }));
            }
        }
    } else {
        // ETH 余额
        match state.datasource.get_eth_balance(&req.address).await {
            Ok(b) => b,
            Err(e) => {
                return HttpResponse::InternalServerError().json(serde_json::json!({
                    "error": format!("Failed to get ETH balance: {}", e)
                }));
            }
        }
    };

    // 格式化余额（假设 18 decimals for ETH, 6 for USDC）
    let decimals = if req.token_address.is_some() { 6 } else { 18 };
    let divisor = 10u128.pow(decimals);
    let formatted = (balance as f64) / (divisor as f64);

    HttpResponse::Ok().json(BalanceResponse {
        balance: format!("{:.2}", formatted),
        symbol: if req.token_address.is_some() { "USDC".to_string() } else { "ETH".to_string() },
    })
}

pub async fn get_checkpoint(state: web::Data<super::AppState>) -> impl Responder {
    match state.datasource.get_checkpoint(11155111).await {
        Ok(ckpt) => HttpResponse::Ok().json(ckpt),
        Err(e) => HttpResponse::InternalServerError().json(serde_json::json!({
            "error": format!("Failed to get checkpoint: {}", e)
        })),
    }
}

pub async fn get_price(
    state: web::Data<super::AppState>,
    symbol: web::Path<String>,
) -> impl Responder {
    match state.datasource.get_price(&symbol).await {
        Ok(price) => HttpResponse::Ok().json(price),
        Err(e) => HttpResponse::NotFound().json(serde_json::json!({
            "error": format!("Price not found: {}", e)
        })),
    }
}

#[derive(Deserialize)]
pub struct SessionStartRequest {
    pub user_id: String,
    pub init_nonce: u64,
}

#[derive(Serialize)]
pub struct SessionStartResponse {
    pub session_id: String,
    pub checkpoint: Checkpoint,
}

pub async fn session_start(
    state: web::Data<super::AppState>,
    req: web::Json<SessionStartRequest>,
) -> impl Responder {
    // 获取 checkpoint
    let checkpoint = match state.datasource.get_checkpoint(11155111).await {
        Ok(ckpt) => ckpt,
        Err(e) => {
            return HttpResponse::InternalServerError().json(serde_json::json!({
                "error": format!("Failed to get checkpoint: {}", e)
            }));
        }
    };

    // 获取或初始化 UCON
    let ucon_root = state.store.get_ucon_root(&req.user_id)
        .await
        .unwrap_or(None)
        .unwrap_or_else(|| EMPTY_TREE_ROOT.to_string());

    // 创建会话
    let session = match UpsSession::start(
        checkpoint.clone(),
        req.user_id.clone(),
        ucon_root,
        req.init_nonce,
        state.store.clone(),
    ).await {
        Ok(s) => s,
        Err(e) => {
            return HttpResponse::InternalServerError().json(serde_json::json!({
                "error": format!("Failed to start session: {}", e)
            }));
        }
    };

    let session_id = session.session_id().to_string();

    // 保存会话到全局 map
    SESSIONS.lock().unwrap().insert(session_id.clone(), session);

    HttpResponse::Ok().json(SessionStartResponse {
        session_id,
        checkpoint,
    })
}

#[derive(Deserialize)]
pub struct SessionAddTxRequest {
    pub session_id: String,
    pub call: CfcCall,
}

#[derive(Serialize)]
pub struct SessionAddTxResponse {
    pub success: bool,
    pub tx_count: u32,
    pub delta: StateDelta,
}

pub async fn session_add_tx(
    _state: web::Data<super::AppState>,
    req: web::Json<SessionAddTxRequest>,
) -> impl Responder {
    let mut sessions = SESSIONS.lock().unwrap();
    
    let session = match sessions.get_mut(&req.session_id) {
        Some(s) => s,
        None => {
            return HttpResponse::NotFound().json(serde_json::json!({
                "error": "Session not found"
            }));
        }
    };

    match session.exec_cfc(req.call.clone()).await {
        Ok(delta) => {
            let tx_count = session.header().tx_count;
            HttpResponse::Ok().json(SessionAddTxResponse {
                success: true,
                tx_count,
                delta,
            })
        }
        Err(e) => HttpResponse::InternalServerError().json(serde_json::json!({
            "error": format!("Failed to execute CFC: {}", e)
        })),
    }
}

#[derive(Deserialize)]
pub struct SessionEndRequest {
    pub session_id: String,
    pub next_nonce: u64,
}

#[derive(Serialize)]
pub struct SessionEndResponse {
    pub endcap: EndCapPublic,
    pub deltas: Vec<StateDelta>,
    pub success: bool,
}

pub async fn session_end(
    _state: web::Data<super::AppState>,
    req: web::Json<SessionEndRequest>,
) -> impl Responder {
    let mut sessions = SESSIONS.lock().unwrap();
    
    let session = match sessions.remove(&req.session_id) {
        Some(s) => s,
        None => {
            return HttpResponse::NotFound().json(serde_json::json!({
                "error": "Session not found"
            }));
        }
    };

    // 默认的 SDKey 参数
    let sdkey_params = SdKeyParams {
        daily_limit_usdc: 10000,
        window_start_unix: 0,
        window_end_unix: u64::MAX,
        circuit_fingerprint_whitelist: vec![],
    };

    match session.end(req.next_nonce, sdkey_params).await {
        Ok((endcap, receipt, deltas)) => {
            // 构造提交包
            let submission = Submission {
                endcap: endcap.clone(),
                endcap_receipt: receipt,
                deltas: deltas.clone(),
            };

            // 提交到 Realm Sink
            let realm_result = submit_to_realm_sink(&submission).await;
            
            match realm_result {
                Ok(header_id) => {
                    println!("✅ 已提交到 Realm Sink: {}", header_id);
                    HttpResponse::Ok().json(serde_json::json!({
                        "endcap": endcap,
                        "deltas": deltas,
                        "success": true,
                        "realm_header_id": header_id,
                        "message": "End Cap generated and submitted to Realm Sink"
                    }))
                }
                Err(e) => {
                    println!("⚠️  提交到 Realm Sink 失败: {}", e);
                    // 即使提交失败，也返回 End Cap（离线模式）
                    HttpResponse::Ok().json(serde_json::json!({
                        "endcap": endcap,
                        "deltas": deltas,
                        "success": true,
                        "realm_error": format!("{}", e),
                        "message": "End Cap generated (Realm Sink submission failed)"
                    }))
                }
            }
        }
        Err(e) => HttpResponse::InternalServerError().json(serde_json::json!({
            "error": format!("Failed to end session: {}", e)
        })),
    }
}

/// 提交 End Cap 到 Realm Sink
async fn submit_to_realm_sink(submission: &Submission) -> anyhow::Result<String> {
    let client = reqwest::Client::new();
    let realm_url = "http://127.0.0.1:8080/ingest";

    let response = client
        .post(realm_url)
        .json(submission)
        .send()
        .await?;

    if !response.status().is_success() {
        let error_text = response.text().await?;
        anyhow::bail!("Realm Sink rejected submission: {}", error_text);
    }

    let result: serde_json::Value = response.json().await?;
    let header_id = result["header_id"]
        .as_str()
        .unwrap_or("unknown")
        .to_string();

    Ok(header_id)
}
