//! UPS 会话的 WASM 绑定
//! 
//! 参考: 教程第4步 - WASM API 设计

use wasm_bindgen::prelude::*;
use psyguard_core::*;
use psyguard_provers::{MockProver, MockNetworkState, MockSubmitter};
use std::sync::Arc;
use crate::utils::to_js_error;

/// WASM UPS 会话包装器
#[wasm_bindgen]
pub struct WasmUpsSession {
    session: ups::UpsSession,
    network: Arc<MockNetworkState>,
    prover: Arc<MockProver>,
    submitter: Arc<MockSubmitter>,
}

#[wasm_bindgen]
impl WasmUpsSession {
    /// 初始化新会话
    /// 参考: 《5-Local Proving (UPS).md》- UPS 启动
    #[wasm_bindgen(constructor)]
    pub fn new(user_id: String) -> std::result::Result<WasmUpsSession, JsValue> {
        log::info!("初始化 UPS 会话: {}", user_id);

        // 创建 Mock 后端
        let network = Arc::new(MockNetworkState::new());
        let prover = Arc::new(MockProver::new());
        let submitter = Arc::new(MockSubmitter::new());

        // 添加测试用户
        network.add_user(UserId(user_id.clone()), 10000);

        // 创建会话
        let session = ups::UpsSession::new(
            UserId(user_id),
            network.clone(),
            prover.clone(),
        ).map_err(to_js_error)?;

        Ok(WasmUpsSession {
            session,
            network,
            prover,
            submitter,
        })
    }

    /// 执行 CFC (合约函数调用)
    /// 参考: 《5-Local Proving (UPS).md》- CFC 执行与集成
    #[wasm_bindgen]
    pub fn exec_cfc(
        &mut self,
        contract_id: String,
        function_name: String,
        args_json: String,
    ) -> std::result::Result<JsValue, JsValue> {
        log::info!("执行 CFC: {}::{}", contract_id, function_name);

        let cfc_id = CfcId {
            contract_id: ContractId(contract_id.clone()),
            function_name: function_name.clone(),
        };

        let inputs = CfcInputs {
            function_args: args_json.into_bytes(),
            caller: self.session.header().user_id.clone(),
            contract_state_root: [0u8; 32],
        };

        // 构建 Mock CFT 证明
        let cft_proof = CftInclusionProof {
            merkle_path: vec![],
            cft_root: CftRoot([0u8; 32]),
        };

        // 执行 CFC
        let tx_end_ctx = self.session
            .execute_cfc(&cfc_id, &inputs, &cft_proof)
            .map_err(to_js_error)?;

        // 返回执行结果
        let result = serde_json::json!({
            "success": tx_end_ctx.success,
            "gas_used": tx_end_ctx.gas_used,
            "state_root": hex::encode(tx_end_ctx.end_contract_state_root),
        });

        serde_wasm_bindgen::to_value(&result).map_err(|e| JsValue::from_str(&e.to_string()))
    }

    /// 终结会话并生成 End Cap
    /// 参考: 《5-Local Proving (UPS).md》- End Cap 终结
    #[wasm_bindgen]
    pub fn finalize_endcap(&self, policy_json: String) -> std::result::Result<JsValue, JsValue> {
        log::info!("终结 End Cap");

        // 解析策略
        let policy: SdkeyPolicy = serde_json::from_str(&policy_json)
            .map_err(|e| to_js_error(format!("策略解析失败: {}", e)))?;

        // 生成 End Cap
        let endcap = self.session
            .finalize(&policy)
            .map_err(to_js_error)?;

        // 返回 End Cap 信息
        let result = serde_json::json!({
            "session_id": endcap.ups_header.session_id,
            "step_count": endcap.final_step.step_number,
            "timestamp": endcap.timestamp,
            "ucon_root": hex::encode(endcap.final_step.current_ucon_root),
        });

        serde_wasm_bindgen::to_value(&result).map_err(|e| JsValue::from_str(&e.to_string()))
    }

    /// 提交 End Cap
    /// 参考: 《5-Local Proving (UPS).md》- End Cap 提交
    #[wasm_bindgen]
    pub fn submit_endcap(&self, policy_json: String) -> std::result::Result<JsValue, JsValue> {
        log::info!("提交 End Cap");

        // 解析策略
        let policy: SdkeyPolicy = serde_json::from_str(&policy_json)
            .map_err(|e| to_js_error(format!("策略解析失败: {}", e)))?;

        // 生成 End Cap
        let endcap = self.session
            .finalize(&policy)
            .map_err(to_js_error)?;

        // 提交
        let receipt = self.submitter
            .submit_endcap(&endcap, self.session.state_deltas().to_vec())
            .map_err(to_js_error)?;

        // 返回收据
        let result = serde_json::json!({
            "receipt_id": receipt.receipt_id,
            "timestamp": receipt.timestamp,
            "guta_path": receipt.guta_path.as_ref().map(|p| serde_json::json!({
                "realm_segment": p.realm_segment,
                "coordinator_segment": p.coordinator_segment,
                "global_root": hex::encode(p.global_root),
            })),
        });

        serde_wasm_bindgen::to_value(&result).map_err(|e| JsValue::from_str(&e.to_string()))
    }

    /// 获取会话信息
    #[wasm_bindgen]
    pub fn get_session_info(&self) -> std::result::Result<JsValue, JsValue> {
        let header = self.session.header();
        let step = self.session.current_step();

        let result = serde_json::json!({
            "user_id": header.user_id.0,
            "session_id": header.session_id,
            "block_number": header.checkpoint_ref.block_number,
            "step_count": step.step_number,
            "balance": header.user_leaf_ctx.balance,
            "nonce": header.user_leaf_ctx.nonce,
        });

        serde_wasm_bindgen::to_value(&result).map_err(|e| JsValue::from_str(&e.to_string()))
    }
}
