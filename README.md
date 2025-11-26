# Psy Wallet Agent

<p align="center">
  <img src="./img/Psy(transparent).png" width="200">
</p>

**为 Psy Protocol 构建的 ZK-Native 钱包代理**

## 🌟 核心特性

- **本地证明会话（UPS）**：在本地执行交易并生成 ZK 证明
- **可编程安全（SDKey）**：支持自定义消费限额、时间窗口等策略
- **隐私优先（PARTH）**：敏感数据不离开本地，只提交证明
- **真实数据集成**：连接 EVM 测试网和价格源

## 🏗️ 架构

```
crates/
├── agent-core       # 核心类型、状态管理、存储
├── agent-proofs     # 证明生成与验证（RISC Zero host）
├── circuits-cfc     # 合约函数电路（RISC Zero guest）
├── circuits-sdkey   # SDKey 策略电路（RISC Zero guest）
├── agent-cli        # 命令行工具
└── realm-sink       # 接收端 API（演示用）
```

## 🚀 快速开始

### 前置要求

- Rust 1.75+
- RISC Zero 工具链（可选，用于完整证明）

### 构建

```bash
# 检查所有 crates
cargo check --workspace

# 构建发布版本
cargo build --release
```

### 运行

```bash
# 启动 Realm 接收端
cargo run -p realm-sink

# 使用 CLI 工具
cargo run -p agent-cli -- balance --address 0x...
cargo run -p agent-cli -- session-start
```

## 📚 核心概念

### PARTH（并行状态架构）
- 每个用户有独立的 UCON（用户合约树）
- 每个用户对每个合约有独立的 CSTATE（合约状态树）
- 写操作仅影响本用户状态
- 读操作访问历史全局状态

### UPS（用户证明会话）
1. **开始会话**：基于历史 checkpoint 初始化
2. **执行交易**：本地执行 CFC 并生成证明
3. **链接证明**：递归验证前一步
4. **生成 End Cap**：用 SDKey 签名授权
5. **提交网络**：发送 End Cap + 状态增量

### SDKey（软件定义密钥）
- 公钥 = Hash(签名电路 verifier data + 参数)
- 支持自定义策略逻辑
- 示例：每日限额、时间窗口、多签

## 🔧 开发指南

### 添加新的 CFC 类型

1. 在 `agent-core/src/types.rs` 添加枚举：
```rust
pub enum CfcCall {
    YourNewCall { /* fields */ },
}
```

2. 在 `circuits-cfc/src/main.rs` 实现逻辑

3. 更新 `agent-proofs/src/cfc_prover.rs`

### 自定义 SDKey 策略

编辑 `circuits-sdkey/src/main.rs` 添加新的约束检查。

## 📊 API 端点（Realm Sink）

### POST /ingest
接收 End Cap 提交

```json
{
  "endcap": {
    "start_user_leaf_hash": "0x...",
    "end_user_leaf_hash": "0x...",
    "checkpoint_root_hash": "0x...",
    "tx_stack_hash": "0x...",
    "tx_count": 2,
    "nonce": 42
  },
  "endcap_receipt": [/* bytes */],
  "deltas": [/* StateDelta[] */]
}
```

### GET /metrics
获取聚合指标

```json
{
  "total_submissions": 123,
  "guta_tree_layers": [...]
}
```

## 🌍 多语言支持

所有面向用户的文本支持中英文切换：
- 后端日志：通过环境变量 `LANG=zh_CN` 或 `LANG=en_US`
- 前端界面：浏览器扩展内置语言切换

## 🧪 测试

```bash
# 运行所有测试
cargo test --workspace

# 测试单个 crate
cargo test -p agent-core

# 集成测试
cargo test --test integration
```

## 📖 文档

详细技术说明：
- [agent.md](./agent.md) - Rust 后端开发指南
- [frontend-prompt.md](./frontend-prompt.md) - 浏览器扩展开发指南
- [Psy docs/](./Psy%20docs/) - Psy 协议文档

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License

## 🔗 相关链接

- [Psy Protocol](https://psy.xyz)
- [RISC Zero](https://risczero.com)
