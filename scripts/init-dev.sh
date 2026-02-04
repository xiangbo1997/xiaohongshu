#!/bin/bash

# 开发环境初始化脚本
# 用于快速搭建本地开发环境

set -e

echo "🚀 开始初始化开发环境..."
echo ""

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 检查命令是否存在
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# 1. 检查必需软件
echo "📋 检查必需软件..."

if ! command_exists node; then
    echo -e "${RED}❌ Node.js 未安装${NC}"
    echo "请访问 https://nodejs.org/ 安装 Node.js"
    exit 1
fi
echo -e "${GREEN}✅ Node.js $(node -v)${NC}"

if ! command_exists pnpm; then
    echo -e "${YELLOW}⚠️  pnpm 未安装，正在安装...${NC}"
    npm install -g pnpm
fi
echo -e "${GREEN}✅ pnpm $(pnpm -v)${NC}"

if ! command_exists psql; then
    echo -e "${YELLOW}⚠️  PostgreSQL 未安装${NC}"
    echo "请访问 https://www.postgresql.org/download/ 安装 PostgreSQL"
    echo "或使用 Homebrew: brew install postgresql@14"
fi

echo ""

# 2. 安装依赖
echo "📦 安装项目依赖..."
pnpm install
echo -e "${GREEN}✅ 依赖安装完成${NC}"
echo ""

# 3. 配置环境变量
if [ ! -f .env ]; then
    echo "⚙️  配置环境变量..."
    cp .env.example .env
    echo -e "${GREEN}✅ 已创建 .env 文件${NC}"
    echo -e "${YELLOW}⚠️  请编辑 .env 文件，填写必要的配置${NC}"
    echo ""
else
    echo -e "${GREEN}✅ .env 文件已存在${NC}"
    echo ""
fi

# 4. 数据库设置
echo "🗄️  设置数据库..."
read -p "是否需要创建数据库？(y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    read -p "请输入数据库名称 [xiaohongshu]: " DB_NAME
    DB_NAME=${DB_NAME:-xiaohongshu}
    
    echo "正在创建数据库 $DB_NAME..."
    createdb $DB_NAME 2>/dev/null || echo "数据库可能已存在"
    echo -e "${GREEN}✅ 数据库设置完成${NC}"
fi
echo ""

# 5. 生成 Prisma Client
echo "🔧 生成 Prisma Client..."
pnpm db:generate
echo -e "${GREEN}✅ Prisma Client 生成完成${NC}"
echo ""

# 6. 运行数据库迁移
echo "🔄 运行数据库迁移..."
read -p "是否运行数据库迁移？(y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    pnpm db:migrate
    echo -e "${GREEN}✅ 数据库迁移完成${NC}"
fi
echo ""

# 7. 播种测试数据
echo "🌱 播种测试数据..."
read -p "是否播种测试数据？(y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    pnpm tsx prisma/seed.ts
    echo -e "${GREEN}✅ 测试数据播种完成${NC}"
fi
echo ""

# 8. 运行测试
echo "🧪 运行测试..."
read -p "是否运行测试？(y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    pnpm test
    echo -e "${GREEN}✅ 测试通过${NC}"
fi
echo ""

# 完成
echo "✨ 开发环境初始化完成！"
echo ""
echo "📝 下一步："
echo "  1. 编辑 .env 文件，填写必要的配置（数据库、API Keys 等）"
echo "  2. 运行 pnpm dev 启动开发服务器"
echo "  3. 访问 http://localhost:3000"
echo ""
echo "🔗 有用的命令："
echo "  pnpm dev          - 启动开发服务器"
echo "  pnpm test         - 运行测试"
echo "  pnpm test:watch   - 监听模式运行测试"
echo "  pnpm db:studio    - 打开 Prisma Studio"
echo "  pnpm lint         - 运行代码检查"
echo ""
echo "📚 文档："
echo "  - 开发文档: docs/DEVELOPMENT.md"
echo "  - API 文档: docs/API.md"
echo "  - 架构文档: docs/ARCHITECTURE.md"
echo ""
