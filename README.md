# PsyGuard - Psy 协议钱包插件

基于 Rust + WASM 的浏览器钱包插件，实现 Psy 协议的 UPS 本地证明、End Cap 提交、GUTA 聚合等核心功能。

## 🎯 项目特性

- **UPS 本地证明**: 用户在本地执行交易并生成 ZK 证明
- **CFT 指纹白名单**: 函数级安全校验，防止未授权逻辑执行
- **SDKey 安全策略**: 可编程钥匙，支持限额、白名单、时间锁、2FA 等策略
- **End Cap 提交**: 递归合并证明并提交到 Realm
- **GUTA 聚合**: 可视化展示从 Realm 到全局根的聚合路径
- **PARTH 状态模型**: 收件箱式转账，避免并发写冲突

## 📁 项目结构

```
psyguard/
├─ apps/
│  └─ extension/               # 浏览器插件前端 (React + Vite + TS)
│
├─ crates/
│  ├─ psyguard-core/           # Rust 核心：UPS/CFT/SDKey/状态管理
│  ├─ psyguard-wasm/           # WASM 绑定层
│  └─ psyguard-provers/        # 证明器实现 (Mock + 真实)
│
├─ Psy docs/                   # Psy 协议文档
├─ scripts/                    # 构建脚本
└─ Makefile                    # 构建命令
```

## 🚀 快速开始

### 1. 安装依赖

```bash
# 安装 Rust 工具链和 WASM 相关工具
make install-deps

# 安装前端依赖
cd apps/extension
npm install
```

### 2. 构建 WASM 模块

```bash
make wasm
```

### 3. 启动开发服务器

```bash
make dev
```

访问 http://localhost:5173 查看应用。

### 4. 运行测试

```bash
make test
```

## 🔧 核心模块

### psyguard-core

核心 Rust 库，实现 Psy 协议的关键功能：

- **types.rs**: 数据类型定义 (CheckpointRef, UserLeafCtx, CfcProof, EndCapProof 等)
- **traits.rs**: 核心接口 (NetworkState, Prover, Submitter)
- **ups.rs**: UPS 会话管理
- **cft.rs**: CFT 指纹白名单校验
- **sdkey.rs**: SDKey 安全策略验证
- **state.rs**: UCON/CSTATE 状态管理

### psyguard-wasm

WASM 绑定层，将 Rust 功能暴露给 JavaScript:

- `WasmUpsSession`: UPS 会话包装器
- `init_session()`: 初始化会话
- `exec_cfc()`: 执行合约函数调用
- `finalize_endcap()`: 终结会话
- `submit_endcap()`: 提交 End Cap

### psyguard-provers

证明器实现：

- **MockProver**: Mock 证明器，用于开发测试
- **MockNetworkState**: Mock 网络状态
- **MockSubmitter**: Mock 提交器

## 📖 使用示例

### 创建 UPS 会话

```typescript
import { createSession } from './lib/wasm'

const session = await createSession('alice')
const info = await session.get_session_info()
console.log('会话信息:', info)
```

### 执行 CFC

```typescript
const result = await session.exec_cfc(
  'token_contract',
  'transfer',
  JSON.stringify({ to: 'bob', amount: 100 })
)
console.log('交易结果:', result)
```

### 提交 End Cap

```typescript
const policy = JSON.stringify({
  daily_limit: 10000,
  trusted_contracts: ['token_contract'],
  time_lock_until: null,
  require_2fa: false,
})

const receipt = await session.submit_endcap(policy)
console.log('提交收据:', receipt)
```

## 🔐 安全特性

### CFT 指纹白名单

每个合约函数都有唯一的指纹 (verifier data hash)，只有在 CFT (Contract Function Tree) 中的函数才能被调用。

```rust
// 校验函数指纹
let verified = CftVerifier::verify_inclusion(&fingerprint, &proof)?;
if !verified {
    return Err(PsyGuardError::CftVerificationFailed(fingerprint));
}
```

### SDKey 安全策略

可编程的签名电路，支持多种安全策略：

- **日限额**: 限制每日最大交易金额
- **合约白名单**: 只允许与受信合约交互
- **时间锁**: 在指定时间前禁止交易
- **2FA**: 要求双因素认证

```rust
let policy = SdkeyPolicyBuilder::new()
    .with_daily_limit(10000)
    .with_trusted_contracts(vec![contract_id])
    .with_time_lock(unlock_time)
    .with_2fa()
    .build();
```

## 📚 参考文档

项目严格遵循 Psy 协议文档：

- 《5-Local Proving (UPS).md》- UPS 本地证明流程
- 《6-Smart Contracts.md》- CFT 指纹白名单
- 《4_Global User Tree Aggregation (GUTA).md》- GUTA 聚合
- 《3-How a Block is Made.md》- 区块生成流程
- 《2-Miners & Roles on Psy.md》- 角色与职责
- 《7-Psy Jargon.md》- 术语表
- 《1-Introduction.md》- 协议介绍

## 🛠️ 开发命令

```bash
make help          # 显示帮助信息
make install-deps  # 安装依赖
make wasm          # 构建 WASM 模块
make dev           # 启动开发服务器
make test          # 运行测试
make clean         # 清理构建产物
```

## 📝 开发路线图

### M1: 链路打通 (Mock)
- [x] psyguard-core 全接口
- [x] MockProver + MockNetworkState
- [x] WASM 暴露 API
- [x] 前端基础 UI

### M2: CFT/风控/SDKey
- [ ] 真实 CFT 校验 (Merkle)
- [ ] 最小 SDKey (限额/白名单)
- [ ] 只读预演

### M3: 对接真实节点
- [ ] 替换部分 Mock 为真实网络/证明服务
- [ ] GUTA 路径动画
- [ ] 收件箱式转账原型

## 📄 许可证

MIT

## 👥 贡献

欢迎提交 Issue 和 Pull Request!

---

**PsyGuard** - 基于 Psy 协议的安全钱包插件
