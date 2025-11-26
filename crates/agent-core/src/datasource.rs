//! 外部数据源接口
//! 
//! EVM RPC 和价格源集成

use crate::error::{AgentError, Result};
use crate::types::{Checkpoint, PriceFeed};
use async_trait::async_trait;

/// 数据源 trait
#[async_trait]
pub trait DataSource: Send + Sync {
    /// 获取最新的 checkpoint（latest-1）
    async fn get_checkpoint(&self, chain_id: u64) -> Result<Checkpoint>;
    
    /// 获取地址的 ETH 余额
    async fn get_eth_balance(&self, address: &str) -> Result<u128>;
    
    /// 获取 ERC-20 余额
    async fn get_erc20_balance(&self, address: &str, token_address: &str) -> Result<u128>;
    
    /// 获取代币价格
    async fn get_price(&self, symbol: &str) -> Result<PriceFeed>;
}

/// EVM RPC 数据源（使用 ethers-rs）
pub struct EvmDataSource {
    rpc_url: String,
}

impl EvmDataSource {
    pub fn new(rpc_url: impl Into<String>) -> Self {
        Self {
            rpc_url: rpc_url.into(),
        }
    }

    /// 创建默认的 Sepolia 数据源
    pub fn sepolia() -> Self {
        Self::new("https://eth-sepolia.g.alchemy.com/v2/demo")
    }
}

#[async_trait]
impl DataSource for EvmDataSource {
    async fn get_checkpoint(&self, chain_id: u64) -> Result<Checkpoint> {
        use ethers::providers::{Provider, Http, Middleware};
        
        let provider = Provider::<Http>::try_from(&self.rpc_url)
            .map_err(|e| AgentError::Network(e.to_string()))?;
        
        // 获取最新区块
        let latest_block_number = provider.get_block_number()
            .await
            .map_err(|e| AgentError::Network(e.to_string()))?;
        
        // 使用 latest-1 确保已最终化
        let block_number = if latest_block_number.as_u64() > 0 {
            latest_block_number.as_u64() - 1
        } else {
            0
        };
        
        // 获取区块详情
        let block = provider.get_block(block_number)
            .await
            .map_err(|e| AgentError::Network(e.to_string()))?
            .ok_or_else(|| AgentError::NotFound(format!("Block {} not found", block_number)))?;
        
        Ok(Checkpoint {
            chain_id,
            block_number,
            block_hash: format!("{:?}", block.hash.unwrap_or_default()),
            state_root: format!("{:?}", block.state_root),
            timestamp: block.timestamp.as_u64(),
        })
    }
    
    async fn get_eth_balance(&self, address: &str) -> Result<u128> {
        use ethers::providers::{Provider, Http, Middleware};
        use ethers::types::Address;
        
        let provider = Provider::<Http>::try_from(&self.rpc_url)
            .map_err(|e| AgentError::Network(e.to_string()))?;
        
        let addr: Address = address.parse()
            .map_err(|e| AgentError::InvalidUserState(format!("Invalid address: {}", e)))?;
        
        let balance = provider.get_balance(addr, None)
            .await
            .map_err(|e| AgentError::Network(e.to_string()))?;
        
        Ok(balance.as_u128())
    }
    
    async fn get_erc20_balance(&self, address: &str, token_address: &str) -> Result<u128> {
        use ethers::providers::{Provider, Http, Middleware};
        use ethers::types::{Address, U256};
        use ethers::abi::{Token, Function, Param, ParamType};
        use ethers::contract::Contract;
        
        let provider = Provider::<Http>::try_from(&self.rpc_url)
            .map_err(|e| AgentError::Network(e.to_string()))?;
        
        let addr: Address = address.parse()
            .map_err(|e| AgentError::InvalidUserState(format!("Invalid address: {}", e)))?;
        let token: Address = token_address.parse()
            .map_err(|e| AgentError::InvalidUserState(format!("Invalid token address: {}", e)))?;
        
        // 简化：直接调用 balanceOf
        let balance_of = Function {
            name: "balanceOf".to_string(),
            inputs: vec![Param {
                name: "account".to_string(),
                kind: ParamType::Address,
                internal_type: None,
            }],
            outputs: vec![Param {
                name: "".to_string(),
                kind: ParamType::Uint(256),
                internal_type: None,
            }],
            constant: Some(true),
            state_mutability: ethers::abi::StateMutability::View,
        };
        
        let data = balance_of.encode_input(&[Token::Address(addr)])
            .map_err(|e| AgentError::Network(e.to_string()))?;
        
        let tx = ethers::types::transaction::eip2718::TypedTransaction::Legacy(
            ethers::types::TransactionRequest {
                to: Some(ethers::types::NameOrAddress::Address(token)),
                data: Some(data.into()),
                ..Default::default()
            }
        );
        
        let result = provider.call(&tx, None)
            .await
            .map_err(|e| AgentError::Network(e.to_string()))?;
        
        let balance = U256::from_big_endian(&result);
        Ok(balance.as_u128())
    }
    
    async fn get_price(&self, symbol: &str) -> Result<PriceFeed> {
        // 使用 CoinGecko API
        let coin_id = match symbol {
            "ETH" | "ETHEREUM" => "ethereum",
            "USDC" => "usd-coin",
            "USDT" => "tether",
            "DAI" => "dai",
            _ => return Err(AgentError::NotFound(format!("Unknown symbol: {}", symbol))),
        };
        
        let url = format!(
            "https://api.coingecko.com/api/v3/simple/price?ids={}&vs_currencies=usd",
            coin_id
        );
        
        let client = reqwest::Client::new();
        let response: serde_json::Value = client.get(&url)
            .header("User-Agent", "Psy-Wallet-Agent/0.1.0")
            .send()
            .await
            .map_err(|e| AgentError::Network(e.to_string()))?
            .json()
            .await
            .map_err(|e| AgentError::Network(e.to_string()))?;
        
        let usd = response[coin_id]["usd"]
            .as_f64()
            .ok_or_else(|| AgentError::NotFound(format!("Price not found for {}", symbol)))?;
        
        Ok(PriceFeed {
            symbol: symbol.to_string(),
            usd,
            updated_at: Some(chrono::Utc::now().timestamp() as u64),
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_checkpoint() {
        let ds = EvmDataSource::new("https://eth-sepolia.example.com");
        let ckpt = ds.get_checkpoint(11155111).await.unwrap();
        assert_eq!(ckpt.chain_id, 11155111);
    }
}
