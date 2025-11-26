#!/bin/bash

echo "🚀 启动 Psy Wallet Agent API..."
echo ""

# 创建数据目录
mkdir -p data

# 启动 API 服务器
cargo run -p agent-api
