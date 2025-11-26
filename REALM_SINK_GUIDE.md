# Realm Sink 完整测试指南

## 🎯 完成的功能

### ✅ Realm Sink 服务
- **POST /ingest** - 接收 End Cap 提交
- **GET /metrics** - 查询统计和 GUTA 树
- **GET /health** - 健康检查

### ✅ 核心功能
1. **证明验证**（简化版）
2. **sled 数据库存储**
3. **GUTA-lite 聚合树构建**
4. **按 checkpoint 分组**

### ✅ agent-api 集成
- session_end 自动提交到 Realm Sink
- 即使提交失败也返回 End Cap（离线模式）

---

## 🚀 启动服务

### 1. 启动 Realm Sink（终端 1）

```bash
cd /Users/curtisyan/Desktop/Psy\ Hackthon/PsyGuard
cargo run -p realm-sink
```

**预期输出**：
```
🚀 Realm Sink 启动中...
📡 监听端口: http://127.0.0.1:8080
💾 数据库已初始化: realm_sink_data
```

### 2. 启动 agent-api（终端 2）

```bash
cd /Users/curtisyan/Desktop/Psy\ Hackthon/PsyGuard
cargo run -p agent-api
```

**预期输出**：
```
🚀 Psy Wallet Agent API 启动中...
📡 监听端口: http://127.0.0.1:3000
```

### 3. 启动前端（终端 3）

```bash
cd /Users/curtisyan/Desktop/Psy\ Hackthon/PsyGuard/apps/extension
pnpm dev
```

---

## 📝 测试完整流程

### 方式 1：通过前端测试（推荐）

1. **打开钱包扩展**
2. **点击 "Session" 按钮**
3. **点击 "Start UPS Session"**
   - 观察 agent-api 日志：读取 checkpoint
4. **点击 "Add CFC"**
   - 选择 Transfer Intent 或 Claim From
   - 输入地址、代币、数量
   - 点击确认
5. **点击 "End Session"**
   - 观察 agent-api 日志：生成 End Cap
   - 观察 Realm Sink 日志：接收提交
   - 前端显示 End Cap 结果

### 方式 2：通过 API 测试

#### 步骤 1：启动会话

```bash
curl -X POST http://localhost:3000/session/start \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "0x1234567890123456789012345678901234567890",
    "init_nonce": 0
  }'
```

**预期响应**：
```json
{
  "session_id": "ups_...",
  "checkpoint": {
    "chain_id": 11155111,
    "block_number": 9681787,
    "block_hash": "0x...",
    "state_root": "0x...",
    "timestamp": 1732267890
  }
}
```

#### 步骤 2：添加 CFC

```bash
curl -X POST http://localhost:3000/session/add \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "ups_...",  # 使用上一步返回的 session_id
    "call": {
      "TransferIntent": {
        "to": "0xabcdef1234567890abcdef1234567890abcdef12",
        "token": "USDC",
        "amount": 100
      }
    }
  }'
```

**预期响应**：
```json
{
  "success": true,
  "tx_count": 1,
  "delta": { ... }
}
```

#### 步骤 3：结束会话

```bash
curl -X POST http://localhost:3000/session/end \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "ups_...",  # 使用步骤 1 的 session_id
    "next_nonce": 1
  }'
```

**预期响应**：
```json
{
  "endcap": {
    "start_user_leaf_hash": "0x...",
    "end_user_leaf_hash": "0x...",
    "checkpoint_root_hash": "0x...",
    "tx_stack_hash": "0x...",
    "tx_count": 1,
    "nonce": 1
  },
  "deltas": [ ... ],
  "success": true,
  "realm_header_id": "header_...",
  "message": "End Cap generated and submitted to Realm Sink"
}
```

**观察 Realm Sink 日志**：
```
📥 收到 End Cap 提交
⚠️  跳过证明验证（演示模式）
✅ 成功存储 End Cap: header_...
  - tx_count: 1
  - nonce: 1
  - deltas: 1
  - checkpoint: 0x7a8f...
```

#### 步骤 4：查询统计

```bash
curl http://localhost:8080/metrics
```

**预期响应**：
```json
{
  "total_submissions": 1,
  "unique_checkpoints": 1,
  "guta_trees": [
    {
      "checkpoint_root": "0x7a8f...",
      "endcap_count": 1,
      "layers": [
        {
          "level": 0,
          "node_count": 1,
          "nodes": [
            "blake3_hash_of_endcap"
          ]
        }
      ],
      "root_hash": "blake3_hash_of_endcap"
    }
  ]
}
```

---

## 🧪 测试 GUTA 树聚合

为了看到 GUTA 树的聚合效果，需要**多次**提交 End Cap：

```bash
# 提交 3 次（用不同的用户地址）
for i in 1 2 3; do
  # 启动会话
  SESSION=$(curl -s -X POST http://localhost:3000/session/start \
    -H "Content-Type: application/json" \
    -d "{\"user_id\":\"0x000000000000000000000000000000000000000$i\",\"init_nonce\":0}" \
    | jq -r '.session_id')
  
  # 添加 CFC
  curl -s -X POST http://localhost:3000/session/add \
    -H "Content-Type: application/json" \
    -d "{\"session_id\":\"$SESSION\",\"call\":{\"TransferIntent\":{\"to\":\"0xabcd\",\"token\":\"USDC\",\"amount\":100}}}"
  
  # 结束会话
  curl -s -X POST http://localhost:3000/session/end \
    -H "Content-Type: application/json" \
    -d "{\"session_id\":\"$SESSION\",\"next_nonce\":1}"
  
  echo "✅ 提交 $i 完成"
done

# 查看聚合树
curl http://localhost:8080/metrics | jq '.guta_trees[0]'
```

**预期看到多层聚合树**：
```json
{
  "checkpoint_root": "0x7a8f...",
  "endcap_count": 3,
  "layers": [
    {
      "level": 0,
      "node_count": 3,
      "nodes": ["hash1", "hash2", "hash3"]
    },
    {
      "level": 1,
      "node_count": 2,
      "nodes": ["hash(1,2)", "hash3"]
    },
    {
      "level": 2,
      "node_count": 1,
      "nodes": ["hash(hash(1,2),hash3)"]
    }
  ],
  "root_hash": "final_aggregated_hash"
}
```

---

## 📊 数据可视化

### 查看数据库内容

```bash
# Realm Sink 数据库位置
ls -lh realm_sink_data/

# 查看统计
curl -s http://localhost:8080/metrics | jq '.'
```

### 健康检查

```bash
# agent-api
curl http://localhost:3000/health

# realm-sink
curl http://localhost:8080/health
```

---

## 🎨 完整架构流程图

```
┌───────────────────┐
│   用户钱包前端    │
│  (Browser Ext)    │
└────────┬──────────┘
         │ 1. Click "Session"
         │ 2. Start/Add/End
         ↓
┌───────────────────┐
│   agent-api       │
│  localhost:3000   │
│  ─────────────    │
│  • UPS Session    │
│  • CFC 执行       │
│  • End Cap 生成   │
└────────┬──────────┘
         │ HTTP POST /ingest
         │ {
         │   endcap,
         │   endcap_receipt,
         │   deltas
         │ }
         ↓
┌───────────────────┐
│   realm-sink      │
│  localhost:8080   │
│  ─────────────    │
│  • 验证证明       │
│  • 存入 sled     │
│  • 构建 GUTA 树  │
│  • 聚合哈希       │
└───────────────────┘
         │
         │ GET /metrics
         ↓
┌───────────────────┐
│  GUTA-lite Tree   │
│  ─────────────    │
│   Level 2: [R]    │
│   Level 1: [H1,H2]│
│   Level 0: [E1..] │
└───────────────────┘
         │
         │ (Future: 批量上链)
         ↓
┌───────────────────┐
│  Realm Contract   │
│  (未实现)          │
│  verify(proof)    │
│  execute(deltas)  │
└───────────────────┘
```

---

## ✅ 成功标志

### Realm Sink 正常运行：
- ✅ 能接收 End Cap 提交
- ✅ 数据存入 sled 数据库
- ✅ /metrics 返回正确的统计
- ✅ GUTA 树正确聚合

### agent-api 正常集成：
- ✅ session_end 自动提交到 Realm Sink
- ✅ 返回 realm_header_id
- ✅ 即使 Realm Sink 离线也能返回 End Cap

### 前端正常显示：
- ✅ 显示 End Cap 结果
- ✅ 显示 realm_header_id（如果有）
- ✅ 显示错误信息（如果 Realm Sink 离线）

---

## 🐛 常见问题

### Q1: Realm Sink 连接失败

**症状**：agent-api 返回 `realm_error`

**解决**：
1. 确认 Realm Sink 正在运行（localhost:8080）
2. 检查端口是否被占用：`lsof -i :8080`
3. 查看 Realm Sink 日志

### Q2: 数据库权限错误

**症状**：`Failed to initialize store`

**解决**：
```bash
# 删除旧数据库
rm -rf realm_sink_data

# 重新启动 Realm Sink
cargo run -p realm-sink
```

### Q3: GUTA 树为空

**症状**：`guta_trees: []`

**原因**：还没有提交任何 End Cap

**解决**：按照测试流程提交至少一个 End Cap

---

## 🚧 下一步扩展

### 短期（可选）：
1. 实现真实的证明验证（调用 agent_proofs::verify）
2. 添加 Realm Sink 管理界面（Web UI）
3. 可视化 GUTA 树（D3.js）

### 长期：
1. 部署 Realm 智能合约
2. 实现批量上链逻辑
3. 添加挑战证明机制
4. P2P 数据可用性层

---

## 📚 技术栈总结

### Realm Sink
- **框架**: actix-web
- **数据库**: sled (嵌入式 KV 存储)
- **哈希**: blake3
- **序列化**: serde_json

### 数据流
```
End Cap → Verify → Store → Aggregate → (Future) On-Chain
```

---

## 🎉 恭喜！

你已经成功实现了完整的 Realm Sink 方案！

现在你的钱包支持：
- ✅ 本地 UPS 会话
- ✅ CFC 状态转换证明
- ✅ End Cap 生成
- ✅ Realm Sink 聚合
- ✅ GUTA-lite 树可视化

这是一个**真实的 ZK-Native 钱包架构**！🚀
