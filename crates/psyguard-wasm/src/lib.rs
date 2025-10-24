//! PsyGuard WASM 绑定层
//! 
//! 将 Rust 核心功能暴露给 JavaScript/TypeScript
//! 参考: 教程第4步 - WASM 绑定与前端调用面

use wasm_bindgen::prelude::*;
use psyguard_core::*;
use psyguard_provers::{MockProver, MockNetworkState, MockSubmitter};
use std::sync::Arc;

mod session;
mod utils;

pub use session::WasmUpsSession;
pub use utils::*;

/// 初始化 WASM 模块
#[wasm_bindgen(start)]
pub fn init() {
    // 设置 panic hook 以便在浏览器控制台看到错误
    console_error_panic_hook::set_once();
    
    // 初始化日志
    wasm_logger::init(wasm_logger::Config::default());
    
    log::info!("PsyGuard WASM 模块已初始化");
}

/// 获取版本信息
#[wasm_bindgen]
pub fn version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

/// 测试函数
#[wasm_bindgen]
pub fn test_connection() -> String {
    "PsyGuard WASM 连接成功!".to_string()
}

#[cfg(test)]
mod tests {
    use super::*;
    use wasm_bindgen_test::*;

    #[wasm_bindgen_test]
    fn test_version() {
        assert!(!version().is_empty());
    }
}
