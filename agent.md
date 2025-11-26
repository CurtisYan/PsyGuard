Psy Wallet Agent（agent.md）

给 AI 工程助手（Claude）用来直接开写代码的技术说明书。
目标：用 Rust 实现“ZK-Native 钱包代理”，本地执行简化 CFC、生成 UPS End Cap、用 SDKey 电路授权，并把 End Cap + 状态增量提交到演示用 Realm 接收端。尽量使用真实数据源（EVM 公共 RPC、CoinGecko）作为“历史只读快照”。

⸻
语言策略（Language Policy）
	•	默认语言： 英文（en-US）。用户可在运行时自由切换为中文（zh-CN）。
	•	显示规则： 系统在任意时刻只显示一种语言，不会中英混合显示。
	•	适用范围： 所有面向用户的文本（命令行提示、日志输出、错误信息、Web/API 响应、人类可读提示、界面文字等）都必须使用国际化（i18n）资源文件来管理，分别提供英文和中文版本。
	•	实现要求：
	•	禁止在代码中直接硬编码文字，所有文本应通过多语言键（message key）加载。
	•	保持键名在两种语言文件中一致。
	•	用户的语言偏好需能被记忆（例如存储在本地配置或浏览器 LocalStorage 中）。
	•	术语一致性：
	•	专有名词保持英文形式（UPS、SDKey、End Cap、PARTH、GUTA 等），中文版本在资源文件中提供清晰译名。
	•	测试要求：
	•	每个多语言键必须在英文与中文两种语言包中均存在，否则视为构建错误。


0. 约束与目标
	•	语言：Rust（核心逻辑、证明、服务端、CLI 均为 Rust）
	•	Psy 要素必须落地：UPS（本地证明会话）、SDKey（可编程签名）、PARTH（仅写本用户 CSTATE、全局只读历史）、End Cap
	•	数据：尽可能“真”
	•	EVM 测试网（Sepolia/Holesky）读取历史状态（余额、ERC-20 余额、真实 Tx 哈希）
	•	CoinGecko 价源
	•	所有读取均绑定到“上一区块”的 checkpoint 摘要
	•	可扩展与安全：可插拔证明后端、白名单电路指纹、UPS 结束状态约束（无债务树）

⸻

1. 工作区结构（Claude 直接按此生成）

psy-wallet-agent/
  Cargo.toml                     # workspace
  rust-toolchain.toml            # 固定 toolchain
  justfile / Makefile            # 一键任务（可选）

  crates/
    agent-core/                  # UPS/状态/哈希/序列化
    agent-proofs/                # 证明宿主：RISC Zero host 接口、receipt 校验
    circuits-sdkey/              # 证明客体：SDKey（RISC0 guest）
    circuits-cfc/                # 证明客体：简化 CFC（RISC0 guest）
    agent-cli/                   # CLI（可选，便于演示）
    realm-sink/                  # 演示用接收端（Actix 或 axum）

  docs/
    agent.md                     # 本文件

最小依赖集合（Claude 在各 crate Cargo.toml 中添加）
	•	zkVM：risc0-zkvm = "1"（host/guest）
	•	序列化：serde, serde_json, bincode
	•	存储：sled（或 rocksdb，选其一）
	•	加密/哈希：blake3（外部）、poseidon（zk 内，见 circuits 注释）
	•	RPC：ethers = { version = "2", features = ["ws", "rustls"] }
	•	HTTP：reqwest = { version = "0.12", default-features = false, features = ["rustls-tls"] }
	•	Web 框架（sink）：actix-web = "4"（或 axum = "0.7"）
	•	测试：proptest, insta, anyhow, thiserror, tracing

⸻

2. 核心数据结构与类型（agent-core）

这些类型是各模块的“共同语义”。Claude 先实现这些 struct/trait + 序列化。

// crates/agent-core/src/types.rs
use serde::{Serialize, Deserialize};

/// 与“上一区块”绑定的历史快照（全局只读）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Checkpoint {
  pub chain_id: u64,
  pub block_number: u64,          // latest - 1
  pub block_hash: String,         // 0x...
  pub state_root: String,         // 0x...
  pub timestamp: u64,
}

/// 用户全局叶子（简化版）：与 PARTH/UCON 对齐
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserLeaf {
  pub user_id: String,            // 可直接用 EVM 地址 0x.. 作为 user_id
  pub ucon_root: String,          // 用户 UCON 树根（字符串十六进制）
  pub nonce: u64,
  pub last_checkpoint_block: u64,
  // 可扩展：balance, params...
}

/// 用户对某合约的 CSTATE（仅本用户）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CState {
  pub contract_id: String,        // 例如 "erc20:USDC" 或 GCON 索引占位
  pub tree_root: String,          // KV 树根
}

/// UPS 会话头（随每步变更）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpsHeader {
  pub checkpoint: Checkpoint,
  pub start_user_leaf_hash: String,
  pub current_user_leaf: UserLeaf,
  pub tx_count: u32,
  pub tx_stack_hash: String,      // 递归栈哈希（Blake3 或 Poseidon 摘要）
  pub deferred_debt_root: String, // 本 MVP 固定 EMPTY
  pub inline_debt_root: String,   // 本 MVP 固定 EMPTY
}

/// 每笔 CFC 执行后产生的“状态差分”
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StateDelta {
  pub contract_id: String,
  pub old_cstate_root: String,
  pub new_cstate_root: String,
  pub slots_modified: u32,
  // 可附加：KV 明细（用于 DA 存储）
}

/// UPS 结束产物（End Cap 的公开输入集合）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EndCapPublic {
  pub start_user_leaf_hash: String,
  pub end_user_leaf_hash: String,
  pub checkpoint_root_hash: String, // 从 checkpoint.state_root 派生或单独计算
  pub tx_stack_hash: String,
  pub tx_count: u32,
  pub nonce: u64,
}

/// 送交 sink 的提交包
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Submission {
  pub endcap: EndCapPublic,
  pub endcap_receipt: Vec<u8>,  // RISC0 receipt bytes
  pub deltas: Vec<StateDelta>,
}

/// 价源结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PriceFeed {
  pub symbol: String,   // "ETH", "USDC"
  pub usd: f64,
}

状态存储接口（sled 后端）

// crates/agent-core/src/store.rs
#[async_trait::async_trait]
pub trait StateStore: Send + Sync {
  async fn put_ucon_root(&self, user: &str, root: &str) -> anyhow::Result<()>;
  async fn get_ucon_root(&self, user: &str) -> anyhow::Result<Option<String>>;

  async fn put_cstate_root(&self, user: &str, contract: &str, root: &str) -> anyhow::Result<()>;
  async fn get_cstate_root(&self, user: &str, contract: &str) -> anyhow::Result<Option<String>>;

  async fn append_tx_stack(&self, session_id: &str, new_hash: &str) -> anyhow::Result<()>;
  async fn save_checkpoint(&self, ckpt: &Checkpoint) -> anyhow::Result<()>;
}


⸻

3. 真实数据接入（agent-core / agent-cli）

Claude 实现只读数据拉取，绑定 Checkpoint（latest-1）：

	•	EVM 公共 RPC（ethers-rs）
	•	读取：账户 ETH 余额、指定 ERC-20 余额（通过标准 balanceOf）、近 N 笔 Tx 哈希（可选）
	•	拿到：block_number, block_hash, state_root, timestamp
	•	用作：Checkpoint
	•	CoinGecko 价源（reqwest）
	•	获取：ETH, USDC 实时价格（USD）
	•	仅展示/记录，不参与证明计算

约束
	•	任何 CFC 的“外部读”都必须以 Checkpoint.block_number 的数据为准；EndCapPublic.checkpoint_root_hash 绑定该快照；防止读写竞态。

⸻

4. 证明后端（agent-proofs + circuits-*）

4.1 Host/Guest 分工
	•	agent-proofs（host）
	•	加载并运行 RISC0 guest 程序
	•	提供统一 ProofEngine trait：prove(input) -> receipt、verify(receipt, public_inputs)
	•	对接两个 guest：
	1.	circuits-cfc：单次 CFC 执行 → 输出 new_cstate_root + tx_item_hash
	2.	circuits-sdkey：会话授权（End Cap）→ 验证策略 + 绑定 EndCapPublic 摘要
	•	circuits-cfc（guest）
	•	语言：Rust（RISC0 guest）
	•	输入：
	•	start_cstate_root
	•	call_data（例如 TransferIntent { to, token, amount } / ClaimFrom { from, token, amount }）
	•	session_proof_tree_root（可选，先保留接口）
	•	若需要读取对方历史 CSTATE 的槽值，传入 leaf_value + merkle_proof（本 MVP 可简化：引用对方的“发送记录摘要”而非细粒度 KV）
	•	约束/输出：
	•	复现合约逻辑的“确定性状态转换”
	•	产出 end_cstate_root 与 tx_item_hash（用于 host 侧聚合 tx_stack_hash）
	•	circuits-sdkey（guest）
	•	策略例子（落地即可演示）：
	•	daily_limit <= 100 USDC（额度限制，额度以“会话内累计转出”统计传入）
	•	time_window = UTC [start, end]（时间窗，host 侧以 checkpoint.timestamp 派生）
	•	（可选）外部签名哈希对比：把 ECDSA 验签放 host，guest 仅校验“签名消息哈希”匹配，使 demo 不依赖 secp 实现
	•	输入：
	•	EndCapPublic（包含 tx_count/tx_stack_hash/nonce/...）
	•	sdkey_params（策略参数、白名单电路指纹）
	•	输出：RISC0 receipt（End Cap Proof）

注意：两种 guest 程序都要把公共输入合成固定长度的哈希（Poseidon/Blake3）并在 host 侧做一致性校验；同时输出“电路指纹（verifier data 的哈希）”以支持白名单。

4.2 摘要与哈希规范
	•	zk 内：Poseidon（库随 RISC0 guest 实现裁剪，若困难可用 sha256 变体；两侧保持一致）
	•	host 外：Blake3（仅作日志/本地索引，不参与电路安全性）
	•	tx_stack_hash：stack = Hash(prev_stack || tx_item_hash)
	•	end_user_leaf_hash：Hash(ucon_root || nonce || last_checkpoint_block || ...)（字段顺序固定）

⸻

5. UPS 状态机（agent-core）

Claude 实现一个明确的状态机，暴露以下 API（供 CLI/前端调用）：

pub struct UpsSession { /* 内含 UpsHeader、deltas、proof_tree 等 */ }

impl UpsSession {
  /// 以 checkpoint + user 初始叶子开启会话
  pub async fn start(checkpoint: Checkpoint, user: &str, init_ucon: &str, init_nonce: u64) -> anyhow::Result<Self>;

  /// 执行一笔 CFC（transfer-intent 或 claim-from），内部调用 `circuits-cfc`
  pub async fn exec_cfc(&mut self, call: CfcCall) -> anyhow::Result<StateDelta>;

  /// 结束会话：汇总 tx 栈、生成 End Cap（circuits-sdkey），返回公开输入与 receipt
  pub async fn end(self, next_nonce: u64, sdkey_params: SdKeyParams) -> anyhow::Result<(EndCapPublic, Vec<u8>)>;
}

#[derive(Clone, Serialize, Deserialize)]
pub enum CfcCall {
  TransferIntent { to: String, token: String, amount: u128 },
  ClaimFrom { from: String, token: String, amount: u128 },
}

#[derive(Clone, Serialize, Deserialize)]
pub struct SdKeyParams {
  pub daily_limit_usdc: u128,
  pub window_start_unix: u64,
  pub window_end_unix: u64,
  pub circuit_fingerprint_whitelist: Vec<String>, // 允许的 guest 指纹
}

执行要点
	•	exec_cfc：
	•	取当前用户的 CSTATE.root 作为 guest 输入
	•	返回 StateDelta，并更新 UCON（对应 contract_id 的根）
	•	tx_stack_hash 链式更新
	•	end：
	•	计算 start_user_leaf_hash / end_user_leaf_hash（字段顺序固定）
	•	调 circuits-sdkey 生成 receipt；校验 电路指纹在白名单
	•	输出 (EndCapPublic, receipt_bytes)，并把 deltas 一起交给提交层

⸻

6. Realm 接收端（realm-sink）

评审可复现的公开接收服务，记录 End Cap 与 deltas，并展示一个 GUTA-lite 聚合树（仅做可视化，不做真实递归 ZKP）。

	•	框架：actix-web
	•	端点：
	•	POST /ingest：body = Submission（见 §2），落库（sled/rocksdb）并返回 header_id
	•	GET /metrics：返回 JSON，包含
	•	已接收 End Cap 数量
	•	聚合树的层级摘要（把同一 checkpoint 的提交用二叉层级聚合，计算 Hash(left||right) 展示）
	•	逻辑：
	•	校验 endcap_receipt 通过 agent-proofs::verify（host 侧验证）
	•	校验 circuit_fingerprint 在白名单
	•	仅记录，不“执行”状态；这是展示“网络侧能接住 End Cap”的证据

⸻

7. 测试与 CI（Claude 生成）
	•	单测
	•	circuits-cfc：随机 start_cstate_root 与调用参数，证明与 end_cstate_root 关系满足代数约束（低维 KV 可直接在 guest 中做）
	•	circuits-sdkey：额度/时间窗边界值 property tests
	•	集成测试
	•	构造一个 UpsSession，连续两笔 CFC → End Cap → 本地 verify → 提交 sink → 查询 metrics 中出现
	•	快照
	•	EndCapPublic 的 JSON 使用 insta 做回归快照
	•	CI
	•	GitHub Actions：cargo fmt/clippy/test + 证明 guest 预编译缓存

⸻

8. 安全与审计清单
	•	SDKey 策略电路指纹双重校验（host 校验 + sink 校验）
	•	UPS 结束时：deferred_debt_root == EMPTY && inline_debt_root == EMPTY（guest 端硬约束）
	•	EndCapPublic 哈希绑定：checkpoint_root_hash、tx_count、tx_stack_hash、start/end leaf hash、nonce
	•	历史只读：所有 EVM 读取均以 Checkpoint.block_number 固定；超过窗口拒绝作为当前 UPS 的“历史见证”
	•	价源不入链：CoinGecko 仅展示，不参与电路判定

⸻

9. 里程碑（Claude 以此拆任务）
	1.	D1-AM
	•	初始化 workspace、公共类型与存储接口
	•	EVM/价源读取与 Checkpoint 生成
	2.	D1-PM
	•	circuits-cfc guest：transfer_intent 与 claim_from 的最小电路
	•	agent-proofs host 跑通 guest、产出 tx_item_hash + end_cstate_root
	3.	D2-AM
	•	UpsSession 状态机：多步 CFC → tx_stack_hash 链接 → UCON 更新
	•	计算 start/end_user_leaf_hash 规范
	4.	D2-PM
	•	circuits-sdkey guest：额度 + 时间窗策略
	•	生成 EndCapPublic + receipt，host 验证成功
	5.	D3
	•	realm-sink 实装：/ingest + /metrics + GUTA-lite 视图
	•	集成测试、文档与演示脚本（前端由你补）

⸻

10. 未来扩展（赛后）
	•	证明后端可替换（Plonky2/Halo2/Nova），抽象 ProofEngine
	•	SDKey 模板库：多签、2FA、社交恢复、时间锁组合
	•	CFC 扩展：批量订单、私密投票、流支付
	•	与真实 Realm/DA Miner 对接：把 deltas 发往 P2P 存储并接受挑战证明

⸻

附录 A：JSON Schema（供前后端与 sink 统一）

// EndCapPublic
{
  "start_user_leaf_hash": "0x...",
  "end_user_leaf_hash": "0x...",
  "checkpoint_root_hash": "0x...",
  "tx_stack_hash": "0x...",
  "tx_count": 2,
  "nonce": 42
}

// StateDelta
{
  "contract_id": "erc20:USDC",
  "old_cstate_root": "0x...",
  "new_cstate_root": "0x...",
  "slots_modified": 3
}

// Submission
{
  "endcap": { /* EndCapPublic */ },
  "endcap_receipt": "<base64 or bytes>",
  "deltas": [ /* StateDelta[] */ ]
}


⸻

附录 B：电路公共输入打包（两端一致）
	•	CFC guest
pub_input = H( start_cstate_root || call_data_hash || (optional) foreign_leaf_witness_hash )
输出：end_cstate_root, tx_item_hash = H(call_kind || token || addr || amount || end_cstate_root)
	•	SDKey guest
pub_input = H( endcap_public_serialized_bytes || sdkey_param_hash )
约束：now ∈ [window_start, window_end] 由 checkpoint.timestamp 推导；额度统计由 host 传入，guest 校验累计 ≤ daily_limit

⸻

附录 C：浏览器扩展 UI 规范

为保证用户体验的一致性和专业性，所有浏览器扩展的 UI 组件必须遵循以下规范：

C.1 提示与确认对话框规范
	•	禁止使用浏览器原生提示：
	  •	禁用：alert()、confirm()、prompt() 等浏览器原生对话框
	  •	原因：原生对话框样式无法自定义，不支持暗色模式，且显示"扩展程序 [插件名] 提示："的前缀，体验差
	•	必须使用插件内组件：
	  •	所有确认操作使用自定义的 ConfirmDialog 组件
	  •	所有提示信息使用 Toast 组件
	  •	组件特性：
	    - 支持暗色模式（dark mode）
	    - 支持国际化（i18n）
	    - 样式统一、美观
	    - 可自定义图标、颜色、按钮文本
	•	实现示例：
	  ```tsx
	  // ❌ 错误：使用浏览器原生对话框
	  if (confirm('确定要删除吗？')) {
	    // ...
	  }
	  
	  // ✅ 正确：使用插件内 ConfirmDialog
	  const [showConfirm, setShowConfirm] = useState(false)
	  
	  {showConfirm && (
	    <ConfirmDialog
	      title={t('confirm.delete_title')}
	      message={t('confirm.delete_message')}
	      onConfirm={handleDelete}
	      onCancel={() => setShowConfirm(false)}
	      type="danger"
	    />
	  )}
	  ```

C.2 图标规范
	•	禁止使用彩色 Emoji 图标：
	  •	禁用：🔒、🚪、📋、⚙️ 等彩色 emoji
	  •	原因：
	    - Emoji 在不同操作系统/浏览器下渲染不一致
	    - 无法适配暗色模式（永远是彩色）
	    - 视觉风格不专业、不统一
	•	必须使用灰色 SVG 图标：
	  •	使用 Heroicons、Lucide 或其他专业图标库的 SVG 图标
	  •	图标颜色使用灰度系统：
	    - 默认：text-gray-500 dark:text-gray-400
	    - 悬停：text-gray-700 dark:text-gray-200
	    - 主要操作：text-primary
	    - 危险操作：text-red-600 dark:text-red-400
	•	实现示例：
	  ```tsx
	  // ❌ 错误：使用彩色 emoji
	  <button>🔒 锁定钱包</button>
	  
	  // ✅ 正确：使用灰色 SVG 图标
	  <button className="flex items-center gap-2">
	    <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
	      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
	    </svg>
	    <span>锁定钱包</span>
	  </button>
	  ```

C.3 钱包生成规范
	•	必须使用真实的加密库：
	  •	使用 ethers.js 或 web3.js 等专业加密库生成钱包
	  •	禁止：使用随机字符串生成假私钥
	  •	原因：确保私钥和地址的真实性和安全性，可用于真实测试网交易
	•	实现示例：
	  ```tsx
	  // ❌ 错误：生成假私钥
	  const fakeKey = '0x' + Array(64).fill(0).map(() => 
	    Math.floor(Math.random() * 16).toString(16)
	  ).join('')
	  
	  // ✅ 正确：使用 ethers.js 生成真实钱包
	  import { ethers } from 'ethers'
	  const wallet = ethers.Wallet.createRandom()
	  const privateKey = wallet.privateKey  // 真实私钥
	  const address = wallet.address         // 对应的真实地址
	  ```

C.4 通用 UI 原则
	•	所有文本必须使用 i18n 国际化
	•	所有颜色必须支持暗色模式（dark:前缀）
	•	所有交互必须有明确的视觉反馈（hover、active状态）
	•	所有表单必须有完整的验证和错误提示
	•	所有加载状态必须有明确的 Loading 指示器
