//! 链上交易执行器
//! 
//! 负责将 End Cap 中的状态变化真正执行到链上

use crate::{CfcCall, StateDelta, EndCapPublic, Checkpoint};
use anyhow::{Result, bail};
use ethers::prelude::*;
use std::sync::Arc;

/// ERC20 转账参数
#[derive(Debug, Clone)]
pub struct TransferParams {
    pub from: Address,
    pub to: Address,
    pub token: Address,
    pub amount: U256,
}

/// 链上交易执行器
pub struct OnChainExecutor {
    provider: Arc<Provider<Http>>,
    chain_id: u64,
}

impl OnChainExecutor {
    /// 创建新的执行器
    pub fn new(rpc_url: &str, chain_id: u64) -> Result<Self> {
        let provider = Provider::<Http>::try_from(rpc_url)?;
        Ok(Self {
            provider: Arc::new(provider),
            chain_id,
        })
    }

    /// 验证用户有足够的代币余额
    pub async fn verify_balance(
        &self,
        user: Address,
        token: Address,
        required_amount: U256,
    ) -> Result<bool> {
        // ERC20 balanceOf 函数
        let balance_of = encode_balance_of(user);
        
        let tx = TransactionRequest::new()
            .to(token)
            .data(balance_of);

        let result = self.provider.call(&tx.into(), None).await?;
        let balance = U256::from_big_endian(&result);

        Ok(balance >= required_amount)
    }

    /// 获取用户的 ETH 余额
    pub async fn get_eth_balance(&self, user: Address) -> Result<U256> {
        let balance = self.provider.get_balance(user, None).await?;
        Ok(balance)
    }

    /// 执行单笔 ERC20 转账
    /// 
    /// 注意：这需要私钥签名，目前返回未签名的交易
    pub async fn prepare_transfer(
        &self,
        from: Address,
        to: Address,
        token: Address,
        amount: U256,
    ) -> Result<TransactionRequest> {
        // ERC20 transfer(address to, uint256 amount)
        let transfer_data = encode_transfer(to, amount);

        let tx = TransactionRequest::new()
            .from(from)
            .to(token)
            .data(transfer_data)
            .chain_id(self.chain_id);

        Ok(tx)
    }

    /// 批量执行 End Cap 中的所有交易
    /// 
    /// 返回交易请求列表（需要用户签名）
    pub async fn prepare_endcap_transactions(
        &self,
        endcap: &EndCapPublic,
        deltas: &[StateDelta],
        user: Address,
    ) -> Result<Vec<TransactionRequest>> {
        let mut txs = Vec::new();

        // 从 deltas 中提取转账信息
        // 注意：当前 StateDelta 没有存储转账细节，需要扩展
        tracing::warn!("⚠️  StateDelta 需要扩展以包含转账细节");

        // TODO: 解析 delta 并构造转账交易
        // 这需要在 StateDelta 中添加 transfer_details 字段

        Ok(txs)
    }

    /// 估算交易的 Gas
    pub async fn estimate_gas(&self, tx: &TransactionRequest) -> Result<U256> {
        let gas = self.provider.estimate_gas(&tx.clone().into(), None).await?;
        Ok(gas)
    }
}

/// 编码 balanceOf(address) 调用
fn encode_balance_of(account: Address) -> Bytes {
    use ethers::abi::{encode, Token};
    
    // balanceOf(address) 的函数选择器
    let selector = &ethers::utils::keccak256(b"balanceOf(address)")[..4];
    
    let params = encode(&[Token::Address(account)]);
    
    let mut data = Vec::from(selector);
    data.extend_from_slice(&params);
    
    data.into()
}

/// 编码 transfer(address, uint256) 调用
fn encode_transfer(to: Address, amount: U256) -> Bytes {
    use ethers::abi::{encode, Token};
    
    // transfer(address,uint256) 的函数选择器
    let selector = &ethers::utils::keccak256(b"transfer(address,uint256)")[..4];
    
    let params = encode(&[
        Token::Address(to),
        Token::Uint(amount),
    ]);
    
    let mut data = Vec::from(selector);
    data.extend_from_slice(&params);
    
    data.into()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_executor_creation() {
        let executor = OnChainExecutor::new(
            "https://rpc.sepolia.org",
            11155111,
        );
        assert!(executor.is_ok());
    }

    #[test]
    fn test_encode_balance_of() {
        let account = "0x1234567890123456789012345678901234567890"
            .parse::<Address>()
            .unwrap();
        let data = encode_balance_of(account);
        
        // 应该以 balanceOf 选择器开头: 0x70a08231
        assert_eq!(&data[..4], &[0x70, 0xa0, 0x82, 0x31]);
    }

    #[test]
    fn test_encode_transfer() {
        let to = "0x1234567890123456789012345678901234567890"
            .parse::<Address>()
            .unwrap();
        let amount = U256::from(1000);
        let data = encode_transfer(to, amount);
        
        // 应该以 transfer 选择器开头: 0xa9059cbb
        assert_eq!(&data[..4], &[0xa9, 0x05, 0x9c, 0xbb]);
    }
}
