# PsyGuard 快速启动指南

## 当前状态

✅ Rust 已通过 Homebrew 安装在 `/opt/homebrew/bin`

## 快速启动步骤

### 1. 添加 WASM 目标

```bash
rustup target add wasm32-unknown-unknown
```

如果 `rustup` 命令找不到，使用完整路径:

```bash
/opt/homebrew/bin/rustup target add wasm32-unknown-unknown
```

### 2. 安装 wasm-pack

```bash
cargo install wasm-pack
```

或使用完整路径:

```bash
/opt/homebrew/bin/cargo install wasm-pack
```

### 3. 安装前端依赖

```bash
cd apps/extension
npm install
cd ../..
```

### 4. 构建 WASM 模块

```bash
# 方式 1: 使用 Makefile
make wasm

# 方式 2: 手动构建
wasm-pack build crates/psyguard-wasm --target web --out-dir ../../apps/extension/public/wasm
```

### 5. 启动开发服务器

```bash
# 方式 1: 使用 Makefile
make dev

# 方式 2: 手动启动
cd apps/extension
npm run dev
```

## 如果遇到 PATH 问题

如果命令找不到，可以临时添加到 PATH:

```bash
export PATH="/opt/homebrew/bin:$PATH"
```

或永久添加到 shell 配置文件 (~/.zshrc 或 ~/.bashrc):

```bash
echo 'export PATH="/opt/homebrew/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

## 验证安装

```bash
# 检查 Rust
rustc --version
cargo --version

# 检查 WASM 目标
rustup target list | grep wasm32

# 检查 Node.js
node --version
npm --version
```

## 一键运行所有命令

```bash
# 1. 添加 WASM 目标
rustup target add wasm32-unknown-unknown

# 2. 安装 wasm-pack (如果还没安装)
cargo install wasm-pack

# 3. 安装前端依赖
cd apps/extension && npm install && cd ../..

# 4. 构建 WASM
wasm-pack build crates/psyguard-wasm --target web --out-dir ../../apps/extension/public/wasm

# 5. 启动开发服务器
cd apps/extension && npm run dev
```

## 测试项目

访问 http://localhost:5173 应该看到 PsyGuard 界面。

## 运行 Rust 测试

```bash
cargo test
```

## 常见问题

### Q: `rustup: command not found`

**A:** 添加 Homebrew 路径到 PATH:

```bash
export PATH="/opt/homebrew/bin:$PATH"
```

### Q: Permission denied 错误

**A:** 这是正常的，因为 rustup 试图修改配置文件但没有权限。不影响使用。

### Q: WASM 构建失败

**A:** 确保已添加 WASM 目标:

```bash
rustup target add wasm32-unknown-unknown
```
