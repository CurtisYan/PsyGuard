//! WASM 工具函数

use wasm_bindgen::prelude::*;

/// 将错误转换为 JsValue
pub fn to_js_error<E: std::fmt::Display>(err: E) -> JsValue {
    JsValue::from_str(&format!("错误: {}", err))
}

/// 日志宏包装
#[wasm_bindgen]
pub fn log_info(msg: &str) {
    log::info!("{}", msg);
}

#[wasm_bindgen]
pub fn log_error(msg: &str) {
    log::error!("{}", msg);
}

#[wasm_bindgen]
pub fn log_warn(msg: &str) {
    log::warn!("{}", msg);
}
