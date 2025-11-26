//! Realm Sink 服务器

use actix_web::{web, App, HttpServer};
use actix_cors::Cors;
use tracing_subscriber;

mod api;
mod metrics;
mod store;

use api::AppState;
use store::RealmStore;

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    // 初始化日志
    tracing_subscriber::fmt::init();

    println!("🚀 Realm Sink 启动中...");
    println!("📡 监听端口: http://127.0.0.1:8080");

    // 初始化数据存储
    let store = RealmStore::new("realm_sink_data")
        .expect("Failed to initialize store");
    println!("💾 数据库已初始化: realm_sink_data");

    let app_state = web::Data::new(AppState { store });

    HttpServer::new(move || {
        let cors = Cors::permissive();
        
        App::new()
            .app_data(app_state.clone())
            .wrap(cors)
            .route("/health", web::get().to(api::health))
            .route("/ingest", web::post().to(api::ingest))
            .route("/metrics", web::get().to(api::metrics))
    })
    .bind(("127.0.0.1", 8080))?
    .run()
    .await
}
