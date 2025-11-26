//! Psy Wallet Agent API Server
//! 
//! 提供 REST API 供浏览器扩展调用

use actix_web::{web, App, HttpServer, HttpResponse, Responder};
use actix_cors::Cors;
use serde::{Deserialize, Serialize};
use agent_core::*;
use std::sync::Arc;

mod handlers;

#[derive(Clone)]
struct AppState {
    store: Arc<SledStore>,
    datasource: Arc<EvmDataSource>,
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    // 初始化日志
    tracing_subscriber::fmt::init();

    // 创建存储
    let store = Arc::new(SledStore::new("./data/agent.db").expect("Failed to open database"));
    
    // 创建数据源（Sepolia）
    let datasource = Arc::new(EvmDataSource::sepolia());

    let state = AppState { store, datasource };

    println!("🚀 Psy Wallet Agent API 启动中...");
    println!("📡 监听端口: http://127.0.0.1:3000");
    println!("📊 允许 CORS: *");

    HttpServer::new(move || {
        let cors = Cors::permissive();
        
        App::new()
            .app_data(web::Data::new(state.clone()))
            .wrap(cors)
            .route("/health", web::get().to(health))
            .route("/balance", web::post().to(handlers::get_balance))
            .route("/checkpoint", web::get().to(handlers::get_checkpoint))
            .route("/price/{symbol}", web::get().to(handlers::get_price))
            .route("/session/start", web::post().to(handlers::session_start))
            .route("/session/add", web::post().to(handlers::session_add_tx))
            .route("/session/end", web::post().to(handlers::session_end))
    })
    .bind(("127.0.0.1", 3000))?
    .run()
    .await
}

async fn health() -> impl Responder {
    HttpResponse::Ok().json(serde_json::json!({
        "status": "ok",
        "service": "psy-wallet-agent-api",
        "version": "0.1.0"
    }))
}
