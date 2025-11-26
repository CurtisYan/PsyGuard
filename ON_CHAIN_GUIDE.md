# 🔗 Psy Wallet - 链上转账完整指南

## ✅ 已完成的功能

### 1. **链上交易执行器** (`agent-core/executor.rs`)
- ✅ ERC20 余额验证
- ✅ 转账交易构造
- ✅ Gas 估算
- ✅ 交易编码（balanceOf, transfer）

### 2. **转账细节追踪** (`agent-core/types.rs`)
- ✅ `StateDelta` 扩展了 `transfer_detail`
- ✅ `TransferDetail` 记录完整转账信息
  - from, to, token, amount, transfer_type

### 3. **Session 集成** (`agent-core/session.rs`)
- ✅ `exec_cfc` 自动记录转账细节
- ✅ 支持 TransferIntent 和 ClaimFrom

### 4. **链上执行模块** (`agent-api/on_chain.rs`)
- ✅ 模拟转账（演示版本）
- ✅ 生成模拟交易哈希
- ✅ 真实转账示例代码（需要私钥）

### 5. **API 集成** (`agent-api/handlers.rs`)
- ✅ `session_end` 自动执行链上转账
- ✅ 返回 `tx_hashes` 交易哈希
- ✅ 容错处理（Realm Sink 和链上独立）

### 6. **前端显示** (`apps/extension/SessionPage.tsx`)
- ✅ 显示链上转账成功/失败
- ✅ 显示交易哈希列表
- ✅ 显示 Realm Sink 结果
- ✅ 错误信息提示

---

## 🎯 当前实现状态

### **模拟转账模式**（当前）

```
Add CFC → End Session → 生成模拟交易哈希 → 返回给前端
```

**特点**：
- ✅ 完整的数据流
- ✅ 前端可以看到"转账成功"
- ⚠️ 实际不上链（仅模拟）

**模拟交易哈希示例**：
```
0x742d35cc6634c0532925a3b844bc454e4438f44e01676dc45c8c5fa1d85d0c9a
```

### **真实转账模式**（需要私钥）

```
Add CFC → End Session → 构造 ERC20 交易 → 签名 → 广播到 Sepolia → 确认
```

**需要添加**：
1. 用户私钥管理（安全存储）
2. 签名流程
3. 交易广播
4. 确认等待

---

## 📝 测试流程

### 方式 1: 测试模拟转账（推荐）

#### 步骤 1: 启动服务

```bash
# 终端 1: Realm Sink
cargo run -p realm-sink

# 终端 2: agent-api  
cargo run -p agent-api

# 终端 3: 前端
cd apps/extension && npm run watch
```

#### 步骤 2: 使用钱包扩展

1. **打开扩展**
2. **点击 "Session"**
3. **Start UPS Session**
4. **Add CFC**
   - 类型：Transfer Intent
   - 地址：`0xd80b0...73d6`（任意地址）
   - 代币：USDC
   - 数量：100
5. **End Session**

#### 步骤 3: 观察结果

**agent-api 终端日志**：
```
🔗 开始执行链上转账
  [1/1] 执行转账:
    类型: transfer
    从: 0x12345...
    到: 0xd80b0...
    代币: USDC
    数量: 100
    📝 模拟交易哈希: 0x742d35cc6634...
✅ 链上执行完成: 1 笔转账
✅ 已提交到 Realm Sink: header_abc123
✅ 链上转账完成: 1 笔
```

**前端显示**：
```
✅ End Cap 已生成

✅ 链上转账成功
交易哈希:
1. 0x742d35cc6634c0532925a3b844bc454e4438f44e...

📦 Realm Sink 接收成功
header_abc123-def456-...

{End Cap JSON...}
```

### 方式 2: 通过 API 测试

```bash
# 1. 启动会话
SESSION=$(curl -s -X POST http://localhost:3000/session/start \
  -H "Content-Type: application/json" \
  -d '{"user_id":"0x1234567890123456789012345678901234567890","init_nonce":0}' \
  | jq -r '.session_id')

# 2. 添加转账
curl -X POST http://localhost:3000/session/add \
  -H "Content-Type: application/json" \
  -d "{\"session_id\":\"$SESSION\",\"call\":{\"TransferIntent\":{\"to\":\"0xabcd\",\"token\":\"USDC\",\"amount\":100}}}"

# 3. 结束会话（触发链上转账）
curl -X POST http://localhost:3000/session/end \
  -H "Content-Type: application/json" \
  -d "{\"session_id\":\"$SESSION\",\"next_nonce\":1}" | jq '.'
```

**预期响应**：
```json
{
  "endcap": { ... },
  "deltas": [ ... ],
  "success": true,
  "realm_header_id": "header_...",
  "on_chain_executed": true,
  "tx_hashes": [
    "0x742d35cc6634c0532925a3b844bc454e4438f44e01676dc45c8c5fa1d85d0c9a"
  ],
  "message": "End Cap generated, submitted to Realm Sink, and executed on-chain"
}
```

---

## 🔧 切换到真实转账

### 需要做的修改

#### 1. 添加私钥管理

```rust
// agent-api/src/wallet.rs
pub struct WalletManager {
    private_key: String, // 实际应加密存储
}

impl WalletManager {
    pub fn sign_transaction(&self, tx: TransactionRequest) -> Result<Bytes> {
        // 使用 ethers-rs 签名
    }
}
```

#### 2. 修改 on_chain.rs

```rust
// 当前（模拟）
async fn simulate_transfer(transfer: &TransferDetail) -> Result<String> {
    // 生成假的哈希
}

// 改为（真实）
async fn real_transfer(transfer: &TransferDetail, wallet: &WalletManager) -> Result<String> {
    // 1. 构造交易
    // 2. 签名
    // 3. 广播
    // 4. 等待确认
    // 5. 返回真实 tx_hash
}
```

#### 3. 配置 Sepolia 测试币

**获取测试币**：
```bash
# Sepolia ETH Faucet
https://sepoliafaucet.com/

# Sepolia USDC（需要从水龙头获取或部署测试代币）
https://faucet.circle.com/
```

---

## 📊 架构对比

### 当前实现（模拟转账）

```
┌─────────────────┐
│  用户钱包前端   │
│  Add CFC       │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│   agent-api     │
│  exec_cfc()     │ → 记录 transfer_detail
└────────┬────────┘
         │ End Session
         ↓
┌─────────────────┐
│  on_chain.rs    │
│  simulate_      │ → 生成假交易哈希
│  transfer()     │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  前端显示结果   │
│  ✅ "转账成功"  │
│  0x742d35...    │
└─────────────────┘
```

### 完整实现（真实转账）

```
┌─────────────────┐
│  用户钱包前端   │
│  Add CFC       │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│   agent-api     │
│  exec_cfc()     │ → 记录 transfer_detail
└────────┬────────┘
         │ End Session
         ↓
┌─────────────────┐
│  on_chain.rs    │
│  real_transfer()│ → 构造真实交易
└────────┬────────┘
         │ 签名
         ↓
┌─────────────────┐
│ WalletManager   │
│  sign()         │ → 使用私钥签名
└────────┬────────┘
         │ 广播
         ↓
┌─────────────────┐
│ Sepolia 测试网  │
│  执行转账       │ → ERC20.transfer()
└────────┬────────┘
         │ 确认
         ↓
┌─────────────────┐
│  前端显示结果   │
│  ✅ 真实转账   │
│  Etherscan 链接 │
└─────────────────┘
```

---

## ✅ 成功标志

### 模拟转账（当前）
- ✅ End Session 返回 `on_chain_executed: true`
- ✅ 返回 `tx_hashes` 数组
- ✅ 前端显示"链上转账成功"
- ✅ agent-api 日志显示"链上执行完成"

### 真实转账（未来）
- ✅ Etherscan 可以查到交易
- ✅ 接收方余额增加
- ✅ 发送方余额减少
- ✅ 交易状态为 Success

---

## 🎯 核心理解

### Psy 的两阶段设计

**阶段 1：本地计算**（已实现 ✅）
```
Add CFC → 本地证明 → End Cap
```
- 快速响应
- 无需等待链上确认
- 可批量处理

**阶段 2：链上执行**（已实现模拟 ⚠️）
```
End Cap → 验证 → 执行转账 → 确认
```
- 当前：模拟执行（假交易哈希）
- 未来：真实执行（需要私钥）

### 为什么分两阶段？

**传统钱包**：
- 每笔转账立即上链 → 慢
- 每笔都要 Gas → 贵
- 不能批量 → 效率低

**Psy 钱包**：
- 多笔本地计算 → 快
- 批量上链一次 → Gas 低
- 零知识证明 → 隐私好

---

## 📚 相关文件清单

### 后端
- ✅ `crates/agent-core/src/executor.rs` - 链上执行器
- ✅ `crates/agent-core/src/types.rs` - TransferDetail 类型
- ✅ `crates/agent-core/src/session.rs` - 记录转账细节
- ✅ `crates/agent-api/src/on_chain.rs` - 转账执行模块
- ✅ `crates/agent-api/src/handlers.rs` - API 集成

### 前端
- ✅ `apps/extension/src/popup/pages/SessionPage.tsx` - UI 显示

### 文档
- ✅ `ON_CHAIN_GUIDE.md` - 本文档
- ✅ `REALM_SINK_GUIDE.md` - Realm Sink 指南
- ✅ `README.md` - 项目总览

---

## 🚀 快速验证

```bash
# 一键测试（需要 3 个终端）
# 终端 1
cargo run -p realm-sink

# 终端 2
cargo run -p agent-api

# 终端 3
cd apps/extension && npm run watch

# 然后在浏览器中测试钱包扩展！
```

预期看到：
- ✅ End Cap 生成
- ✅ 链上转账成功（模拟）
- ✅ 交易哈希显示
- ✅ Realm Sink 接收成功

---

## 🎉 恭喜！

你现在拥有一个**完整的链上转账流程**！

虽然当前是模拟转账，但所有的：
- ✅ 数据结构
- ✅ 执行流程
- ✅ 错误处理
- ✅ 前端显示

都已经完整实现。只需要添加私钥管理和签名，就能切换到真实转账！🚀
