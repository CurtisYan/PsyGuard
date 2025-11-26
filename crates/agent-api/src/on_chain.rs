//! 链上交易执行模块

use agent_core::{StateDelta, TransferDetail, EndCapPublic};
use anyhow::{Result, bail};
use serde::{Deserialize, Serialize};

/// 链上执行结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OnChainResult {
    pub success: bool,
    pub tx_hashes: Vec<String>,
    pub message: String,
}

/// 执行 End Cap 中的所有转账
/// 
/// 真实链上转账，使用 ethers-rs 签名并广播到 Sepolia
pub async fn execute_endcap_transfers(
    endcap: &EndCapPublic,
    deltas: &[StateDelta],
    private_key: &str,
) -> Result<OnChainResult> {
    tracing::info!("🔗 开始执行真实链上转账");
    
    let mut tx_hashes = Vec::new();
    let mut executed_count = 0;

    for (idx, delta) in deltas.iter().enumerate() {
        if let Some(transfer) = &delta.transfer_detail {
            tracing::info!("  [{}/{}] 执行转账:", idx + 1, deltas.len());
            tracing::info!("    类型: {}", transfer.transfer_type);
            tracing::info!("    从: {}", &transfer.from[..10]);
            tracing::info!("    到: {}", &transfer.to[..10]);
            tracing::info!("    代币: {}", transfer.token);
            tracing::info!("    数量: {}", transfer.amount);

            // 真实转账！
            match real_transfer(transfer, private_key).await {
                Ok(tx_hash) => {
                    tracing::info!("    ✅ 成功: {}", tx_hash);
                    tx_hashes.push(tx_hash);
                    executed_count += 1;
                }
                Err(e) => {
                    tracing::error!("    ❌ 失败: {}", e);
                    return Err(e);
                }
            }
        }
    }

    if executed_count == 0 {
        tracing::warn!("⚠️  没有需要执行的转账");
        return Ok(OnChainResult {
            success: true,
            tx_hashes: vec![],
            message: "No transfers to execute".to_string(),
        });
    }

    tracing::info!("✅ 链上执行完成: {} 笔转账", executed_count);

    Ok(OnChainResult {
        success: true,
        tx_hashes,
        message: format!("Executed {} transfers on Sepolia", executed_count),
    })
}

/// 真实的链上转账
/// 
/// 使用 ethers-rs 签名并广播到 Sepolia 测试网
async fn real_transfer(
    transfer: &TransferDetail,
    private_key: &str,
) -> Result<String> {
    use ethers::prelude::*;
    use std::sync::Arc;

    tracing::info!("    🔑 初始化签名者...");

    // 1. 连接到 Sepolia
    let provider = Provider::<Http>::try_from("https://rpc.sepolia.org")?;
    let chain_id = 11155111u64;

    // 2. 创建签名者
    let wallet: LocalWallet = private_key.parse()
        .map_err(|e| anyhow::anyhow!("Invalid private key: {}", e))?;
    let client = Arc::new(SignerMiddleware::new(
        provider,
        wallet.with_chain_id(chain_id)
    ));

    tracing::info!("    📦 构造 ERC20 transfer 交易...");

    // 3. 解析地址
    let token_address: Address = transfer.token.parse()
        .map_err(|e| anyhow::anyhow!("Invalid token address: {}", e))?;
    let to_address: Address = transfer.to.parse()
        .map_err(|e| anyhow::anyhow!("Invalid to address: {}", e))?;
    let amount = U256::from(transfer.amount);

    // 4. 构造 ERC20 transfer(address, uint256) 调用
    let transfer_fn = ethers::abi::Function {
        name: "transfer".to_string(),
        inputs: vec![
            ethers::abi::Param {
                name: "to".to_string(),
                kind: ethers::abi::ParamType::Address,
                internal_type: None,
            },
            ethers::abi::Param {
                name: "amount".to_string(),
                kind: ethers::abi::ParamType::Uint(256),
                internal_type: None,
            },
        ],
        outputs: vec![],
        constant: Some(false),
        state_mutability: ethers::abi::StateMutability::NonPayable,
    };

    let call_data = transfer_fn.encode_input(&[
        ethers::abi::Token::Address(to_address),
        ethers::abi::Token::Uint(amount),
    ])?;

    // 5. 发送交易
    let tx = TransactionRequest::new()
        .to(token_address)
        .data(call_data)
        .gas(100_000); // ERC20 transfer 通常需要 ~65k gas

    tracing::info!("    📡 发送交易到 Sepolia...");

    let pending_tx = client.send_transaction(tx, None).await
        .map_err(|e| anyhow::anyhow!("Failed to send transaction: {}", e))?;
    
    let tx_hash = format!("{:?}", pending_tx.tx_hash());
    tracing::info!("    ✅ 交易已发送: {}", tx_hash);

    // 6. 等待确认（最多等待 1 个区块）
    tracing::info!("    ⏳ 等待交易确认...");
    
    match pending_tx.confirmations(1).await {
        Ok(Some(receipt)) => {
            tracing::info!("    ✅ 交易已确认: {:?}", receipt.transaction_hash);
            Ok(format!("{:?}", receipt.transaction_hash))
        }
        Ok(None) => {
            // 交易已发送但未确认，返回交易哈希
            tracing::warn!("    ⚠️  交易已发送但未立即确认");
            Ok(tx_hash)
        }
        Err(e) => {
            tracing::error!("    ❌ 交易失败: {}", e);
            Err(anyhow::anyhow!("Transaction failed: {}", e))
        }
    }
}

