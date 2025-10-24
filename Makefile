# PsyGuard Makefile
# 参考: 教程第15步 - Makefile 示意

.PHONY: help wasm dev test clean install-deps

help:
	@echo "PsyGuard 构建命令:"
	@echo "  make install-deps  - 安装依赖"
	@echo "  make wasm          - 构建 WASM 模块"
	@echo "  make dev           - 启动开发服务器"
	@echo "  make test          - 运行测试"
	@echo "  make clean         - 清理构建产物"

# 安装依赖
install-deps:
	@echo "检查 Rust 工具链..."
	@command -v rustc >/dev/null 2>&1 || { echo "请先安装 Rust: https://rustup.rs/"; exit 1; }
	@echo "Rust 版本: $$(rustc --version)"
	@echo "添加 WASM 目标..."
	@rustup target add wasm32-unknown-unknown || /opt/homebrew/bin/rustup target add wasm32-unknown-unknown
	@echo "安装 wasm-pack..."
	@command -v wasm-pack >/dev/null 2>&1 || cargo install wasm-pack || /opt/homebrew/bin/cargo install wasm-pack
	@echo "依赖安装完成!"

# 构建 WASM 模块
wasm:
	@echo "构建 WASM 模块..."
	wasm-pack build crates/psyguard-wasm --target web --out-dir ../../apps/extension/public/wasm
	@echo "WASM 构建完成!"

# 开发模式 (前端)
dev:
	@echo "启动开发服务器..."
	cd apps/extension && npm run dev

# 运行测试
test:
	@echo "运行 Rust 测试..."
	cargo test -p psyguard-core -p psyguard-provers
	@echo "测试完成!"

# 清理
clean:
	@echo "清理构建产物..."
	cargo clean
	rm -rf apps/extension/public/wasm
	@echo "清理完成!"

# 构建所有
all: wasm
	@echo "构建完成!"
