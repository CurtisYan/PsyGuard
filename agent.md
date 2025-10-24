PsyGuard 开发纲要（给 AI 的从零到一实操步骤 | Psy × Rust × Wallet 插件）

目标：用 Rust+WASM 做一个浏览器钱包插件，落地 Psy 的 UPS 本地证明 → End Cap 提交 → GUTA 聚合 全流程；内置 SDKey 安全策略、CFT 指纹白名单风控、PARTH 收件箱式转账 等关键特性。前端（UI/交互）可由另一个 AI 优化。

⸻

0) 仓库与目录结构

psyguard/
├─ apps/
│  └─ extension/               # 浏览器插件（TS/React/Vite），仅做壳和可视化
│
├─ crates/
│  ├─ psyguard-core/           # Rust 核心：UPS编排/证明接口、CFT校验、UCON/CSTATE增量、End Cap打包
│  ├─ psyguard-wasm/           # Rust→WASM 绑定层（wasm-bindgen导出给前端）
│  └─ psyguard-provers/        # 证明接口抽象 + 本地/委托两种后端实现（可先Mock）
│
├─ services/
│  └─ relay/                   # 轻量中继(可选)：与 Realm/Coordinator/DA 拉取/提交数据
│
├─ psy-docs/                   # 你放的 7 份 Psy 文档
│
├─ scripts/                    # 一键构建/打包/集成测试脚本
└─ Makefile


⸻

1) 环境初始化（一次性）

Rust & WASM 工具链
	•	安装 rustup, wasm32-unknown-unknown 目标、wasm-bindgen-cli、wasm-pack。
	•	crates 最低稳定版 Rust；若后续用到高级特性再切 nightly。

前端
	•	apps/extension 用 Vite + React + TS，接入 wasm-bindgen 输出的 .wasm + JS glue。

开发基线
	•	采用接口驱动 + Mock：先以 trait 抽象 ZK 证明与网络交互（Realm/Coordinator/DA），跑通“从本地 UPS 到 End Cap 包”的链路，再逐步替换为真实实现。UPS/End Cap/GUTA 的流程要与 Psy 文档一致（UPS 本地执行 CFC → 递归合成 End Cap；End Cap 进 Realm/GUTA，再到全局聚合） ￼  ￼。

⸻

2) 关键概念对齐（实现时必须遵守的协议点）
	•	UPS（User Proving Session）：本地执行一串交易，每个交易跑对应 CFC 的 ZK 证明，并在 UPS 内递归合并，最终生成 End Cap 作为该用户本块的“压缩证明” ￼  ￼  ￼。
	•	CFT（Contract Function Tree）：合约的函数指纹白名单（每个 CFC 的 verifier data hash 为叶），UPS 在集成某次 CFC 证明时必须校验其 fingerprint 在 CFT 内，以防未授权逻辑 ￼。
	•	PARTH 状态模型：每个用户每个合约各自 CSTATE，聚合在用户的 UCON 下；用户只能写自己的状态，但可读上个区块的全局历史状态（读时带 Merkle 证明） ￼  ￼。
	•	SDKey（可编程钥）：Psy 的“公钥”是签名电路验证器数据哈希（+参数）；签名本身是 ZK 证明，可写入 2FA/限额/时间锁或外链签名验证逻辑（EVM/BTC 兼容） ￼  ￼。
	•	GUTA 聚合：Realm 接收 End Cap，验证并递归合并用户在 GUSR 上的状态变更，Coordinator 继续汇总直至全局根（同一 CHKP 上下文一致性） ￼  ￼。
	•	DA Miners：持久化 CSTATE 叶与增量，向用户/Realm 提供可用性与历史读（带随机挑战可用性证明） ￼  ￼。

⸻

3) 步骤一：定义核心接口（Rust）

在 crates/psyguard-core/src/lib.rs 先定义协议相容的数据结构与流程接口（面向 UPS/CFT/UCON/End Cap），真实实现可逐步替换：
	•	CheckpointRef { chkp_root, block_number }：UPS 绑定的全局历史根（会从 Realm/Coordinator 拉取最新 finalized CHKP） ￼。
	•	UserLeafCtx { uleaf_hash, ucon_root, balance, nonce }：UPS 启动时需要的用户上下文（从 GUSR 中以 Merkle 证明取回） ￼。
	•	CfcFingerprint(hex32) / CftInclusionProof { merkle_path, cft_root }：函数指纹与其在 CFT 的包含证明 ￼。
	•	CstateDeltaProof / UconDeltaProof（Delta Merkle）：证明 CSTATE/UCON 根从旧到新的过渡（写入时必须提交） ￼  ￼。
	•	UpsHeader / UpsStepProof / EndCapProof：UPS 头、步骤证明与最终 End Cap；End Cap 是提交给 Realm 的对象 ￼  ￼。

Traits（先Mock）

trait NetworkState {
  fn latest_finalized_chkp(&self) -> CheckpointRef;
  fn fetch_user_leaf(&self, user_id: &UserId, chkp: &CheckpointRef) -> UserLeafCtx; // with Merkle proof
  fn fetch_contract_meta(&self, contract_id: ContractId) -> (CftRoot, CstateHeight); // from GCON
}

trait Prover {
  fn prove_cfc(&self, cfc: &CfcId, inputs: &CfcInputs, start_cstate_root: Hash)
      -> (CfcProof, TxEndCtx); // 见文档中 CFC 输出 end_contract_state_tree_root 等
  fn ups_integrate_step(&self, prev: &UpsStepProof, cfc_proof: &CfcProof, cft_proof: &CftInclusionProof,
      ucon_delta: &UconDeltaProof, debts_delta: &DebtDeltaProof) -> UpsStepProof;
  fn finalize_endcap(&self, last_step: &UpsStepProof, sdkey_sig: &SignatureProof) -> EndCapProof;
}

trait Submitter {
  fn submit_endcap(&self, endcap: &EndCapProof, state_deltas: Vec<CstateDelta>) -> SubmitReceipt;
}

以上接口严格对应：CFC 本地执行与证明 → UPS 集成校验 CFT & UCON/CSTATE 过渡 → End Cap 生成与提交 的链路 ￼  ￼。

Definition of Done
	•	能在 Mock prover 下串起：start_session → prove_cfc xN → ups_integrate xN → finalize_endcap → submit（提交时附上 CSTATE 变更叶） ￼。

⸻

4) 步骤二：WASM 绑定与前端调用面

在 crates/psyguard-wasm/ 用 wasm-bindgen 暴露以下 JS API（仅关键）：
	•	init_session(user_id)：内部抓取 CHKP + ULEAF，构建 UpsHeader（锚定全局历史） ￼。
	•	exec_cfc(contract_id, func_id, args)：下载 CFC 与 verifier data，校验 fingerprint ∈ CFT，执行 & 产出 CfcProof + TxEndCtx，并返回“预测将改动的槽位/数量”（供风控 UI 高亮） ￼。
	•	integrate_step(step_ctx)：做 UPSCFCStandardTransactionCircuit 等价步骤（或由 prover 后端完成） ￼。
	•	finalize_endcap(sdkey_policy)：对接 SDKey 签名电路，以策略（限额/白名单/时间锁等）生成签名证明并封装 End Cap ￼。
	•	submit_endcap()：返回包含 GUTA 路径/收据的提交结果（前端可据此可视化 GUTA 汇聚动画） ￼。

⸻

5) 步骤三：最小合约与 CFT 构建（Dapen）

为演示至少准备 1–2 个小型合约（如 transfer, claim）：
	•	用 Dapen 编译生成 CFC 与 verifier data、fingerprint，并在部署路径生成 CFT（函数指纹 Merkle）；部署后把 CFT root 记入 GCON.CLEAF（合约元信息） ￼  ￼。
	•	前端/wasm 在首次执行某函数时，验证 fingerprint 在 CFT 中（需 CFT Merkle 路径）再本地执行 CFC，保证风控基线 ￼  ￼。

⸻

6) 步骤四：UPS 批处理与 End Cap

实现 UPS 批量签逻辑（多个 CFC 依次纳入），每步：
	1.	校验 CFT 包含；
	2.	计算并证明 UCON 的 Delta（某 contract_id 对应 CSTATE root 从 old→new） ￼；
	3.	递归组合上一步证明；
	4.	结束时调用 End Cap 终结电路（含 SDKey 签名） ￼。

提交到 Realm 时携带 state deltas（变更的具体 CSTATE 叶），以便 DA/Realm 持久化与服务后续读取 ￼。

⸻

7) 步骤五：风控层（CFT & 只读预演）
	•	函数指纹白名单（CFT）：在 exec_cfc() 前根据合约 CLEAF.CFT root 做指纹校验；不在白名单直接拒绝调用 ￼。
	•	只读预演：从 DA/Realm 拉取需要的历史 CSTATE 叶值 + Merkle 证明，做本地只读执行，得出“将改动的槽位/数量/阈值触发”等，供前端高亮（不提交） ￼。

⸻

8) 步骤六：SDKey 安全策略（最小可用）

在 psyguard-core 内提供策略描述到“签名电路输入”的映射：
	•	日限额 / 受信合约白名单 / 时间锁 / 2FA 等策略参数，作为签名电路的公共输入，生成“签名即证明”。公钥 = 该签名电路 verifier data 哈希（+参数） ￼  ￼。
	•	预留“外链签名验证逻辑”接口（如 secp256k1/ed25519 验证 gadget）以实现 跨链统一账户体验 ￼。

⸻

9) 步骤七：GUTA 路径可视化（只读）
	•	submit_endcap() 后，查询 Realm 产生的 GUTA headers（或事件），以 NCA 合并顺序展示“你在 GUSR 上的变更如何往上汇总到分段根、再到全局根” ￼  ￼。
	•	所有聚合需与同一 CHKP 对齐，并受电路白名单/指纹约束（显示这些元数据） ￼。

⸻

10) 可选：收件箱式转账（PARTH 范式）

实现 send → claim 两段式交互：
A 在自己的 CSTATE 记一条 sent_to_others，B 之后用 claim_from_others 读历史并写入自己的 CSTATE（避免并发写冲突）；这与 Psy 的“各自用户态写+历史全局读”的范式一致（读需提供历史证明） ￼  ￼。

⸻

11) 证明后端策略（本地 / 委托）
	•	本地（默认）：Rust+WASM 在浏览器端产证；
	•	委托（性能备选）：将必要见证与电路输入发往“证明服务”，拿回证明对象；由于上链只验证明与指纹/白名单/CHKP 一致性，不信任服务器，仅信数学（配合 UPS/End Cap 结构） ￼。

⸻

12) 集成测试与验收清单
	•	Happy Path：start_session → transfer → claim → finalize → submit → guta path 全绿；
	•	风控：替换 CFC 为未登记指纹，UPS 集成应失败（CFT 校验命中）；
	•	SDKey：修改交易额超出限额，应触发策略失败或追加 2FA；
	•	可用性：断网/委托模式切换；
	•	数据一致性：提交时带上的 CSTATE deltas 可被 DA/Realm 查询与重放验证 ￼。

⸻

13) 开发里程碑（建议 3 个迭代）
	1.	M1：链路打通（Mock）
	•	psyguard-core 全接口 + MockProver + MockNetworkState；
	•	WASM 暴露 API，前端能跑通 UPS→End Cap（无真实电路）。
	2.	M2：CFT/风控/最小 SDKey
	•	真实 CFT 校验（Merkle ），最小 SDKey（限额/白名单）；
	•	只读预演（从 “DA/Realm Mock” 提供历史证明）。
	3.	M3：对接真实节点/可视化 GUTA
	•	替换部分 Mock 为真实网络/证明服务；
	•	GUTA 路径动画 + 收件箱式转账原型。

⸻

14) 与文档的对应关系（落地时请反查）
	•	UPS → End Cap 全流程：启动、CFC 本地执行、UPS 集成、End Cap 终结与提交 ￼  ￼  ￼。
	•	CFT 指纹白名单：函数级校验与 GCON 绑定 ￼  ￼。
	•	SDKey：签名电路即账户公钥/签名，支持策略与外链签名兼容 ￼  ￼。
	•	GUTA 聚合与收据：Realm→Coordinator 的递归聚合、NCA 合并、同一 CHKP 上下文 ￼  ￼。
	•	DA/状态读取：CSTATE 增量与历史可用性、只读证明 ￼  ￼。

⸻

15) Makefile（示意）

wasm:
	cargo build -p psyguard-wasm --target wasm32-unknown-unknown --release
	wasm-bindgen --target web --out-dir ../apps/extension/public/wasm \
		target/wasm32-unknown-unknown/release/psyguard_wasm.wasm

dev:
	cd apps/extension && pnpm dev

test:
	cargo test -p psyguard-core -p psyguard-provers


⸻

16) 提交物与 Demo 脚本（裁判友好）
	•	一键 UPS 批量签 → End Cap 一次提交（进度条）
	•	风控面板：函数指纹是否在 CFT、即将改动的槽位/数量
	•	SDKey 面板：限额/白名单/时间锁开关 + 本次签名满足哪些约束
	•	GUTA 动画：展示从 Realm 段到全局根的合并路径与统计头部（header）要素 ￼。

⸻

备注：实现时，AI 请优先阅读 psy-docs/ 中的以下文件并在代码注释中引用段落编号：
	•	《5-Local Proving (UPS).md》、 《6-Smart Contracts.md》、 《4_Global User Tree Aggregation (GUTA).md》、 《3-How a Block is Made.md》、 《2-Miners & Roles on Psy.md》、 《7-Psy Jargon.md》、 《1-Introduction.md》。上述纲要的每个小节已标注与其对应的规则/流程行文出处，便于逐条对齐与回归测试。