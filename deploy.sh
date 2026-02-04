#!/bin/bash

# 小红书文案生成器 - 服务器部署脚本
# 使用方法: chmod +x deploy.sh && ./deploy.sh

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# 配置
APP_NAME="xiaohongshu"
APP_DIR="/var/www/${APP_NAME}"
LOG_DIR="/var/log/${APP_NAME}"

# 检查 Node.js
check_node() {
    if ! command -v node &> /dev/null; then
        log_error "Node.js 未安装，请先安装 Node.js 20+"
        exit 1
    fi
    log_info "Node.js 版本: $(node -v)"
}

# 检查 pnpm
check_pnpm() {
    if ! command -v pnpm &> /dev/null; then
        log_info "安装 pnpm..."
        npm install -g pnpm
    fi
    log_info "pnpm 版本: $(pnpm -v)"
}

# 检查 PM2
check_pm2() {
    if ! command -v pm2 &> /dev/null; then
        log_info "安装 PM2..."
        npm install -g pm2
    fi
    log_info "PM2 版本: $(pm2 -v)"
}

# 创建目录
setup_dirs() {
    log_info "创建目录..."
    sudo mkdir -p ${APP_DIR}
    sudo mkdir -p ${LOG_DIR}
    sudo chown -R $USER:$USER ${APP_DIR}
    sudo chown -R $USER:$USER ${LOG_DIR}
}

# 安装依赖
install_deps() {
    log_info "安装依赖..."
    cd ${APP_DIR}
    pnpm install --frozen-lockfile --prod
}

# 数据库迁移
migrate_db() {
    log_info "执行数据库迁移..."
    cd ${APP_DIR}
    npx prisma migrate deploy
    npx prisma generate
}

# 构建应用
build_app() {
    log_info "构建应用..."
    cd ${APP_DIR}
    pnpm build
}

# 启动/重启应用
start_app() {
    cd ${APP_DIR}

    if pm2 list | grep -q ${APP_NAME}; then
        log_info "重启应用..."
        pm2 reload ${APP_NAME}
    else
        log_info "启动应用..."
        pm2 start ecosystem.config.js
    fi

    pm2 save
}

# 设置开机自启
setup_startup() {
    log_info "设置开机自启..."
    pm2 startup systemd -u $USER --hp $HOME
    pm2 save
}

# 检查环境变量
check_env() {
    if [ ! -f "${APP_DIR}/.env" ]; then
        log_warn ".env 文件不存在！"
        log_info "请复制 .env.example 并配置环境变量："
        echo ""
        echo "  cp .env.example .env"
        echo "  vim .env"
        echo ""
        exit 1
    fi
}

# 显示状态
show_status() {
    echo ""
    log_info "========== 部署完成 =========="
    echo ""
    pm2 status
    echo ""
    log_info "应用地址: http://localhost:3000"
    log_info "管理后台: http://localhost:3000/admin"
    log_info "日志查看: pm2 logs ${APP_NAME}"
    log_info "监控面板: pm2 monit"
    echo ""
}

# 主流程
main() {
    log_info "开始部署 ${APP_NAME}..."

    check_node
    check_pnpm
    check_pm2
    setup_dirs

    # 如果当前目录不是 APP_DIR，复制文件
    if [ "$(pwd)" != "${APP_DIR}" ]; then
        log_info "复制文件到 ${APP_DIR}..."
        rsync -av --exclude='node_modules' --exclude='.next' --exclude='.git' ./ ${APP_DIR}/
    fi

    check_env
    install_deps
    migrate_db
    build_app
    start_app
    setup_startup
    show_status
}

# Docker 部署
deploy_docker() {
    log_info "使用 Docker 部署..."

    if ! command -v docker &> /dev/null; then
        log_error "Docker 未安装"
        exit 1
    fi

    # 检查 .env 文件
    if [ ! -f ".env" ]; then
        log_warn "请先创建 .env 文件"
        cp .env.example .env
        log_info "已创建 .env 文件，请编辑配置后重新运行"
        exit 1
    fi

    # 构建并启动
    docker compose up -d --build

    # 等待数据库就绪
    log_info "等待数据库就绪..."
    sleep 10

    # 执行数据库迁移
    docker compose exec app npx prisma migrate deploy

    log_info "========== Docker 部署完成 =========="
    docker compose ps
    echo ""
    log_info "应用地址: http://localhost:3000"
    log_info "查看日志: docker compose logs -f app"
}

# 帮助信息
show_help() {
    echo "小红书文案生成器 - 部署脚本"
    echo ""
    echo "用法: ./deploy.sh [命令]"
    echo ""
    echo "命令:"
    echo "  (无参数)    使用 PM2 部署"
    echo "  docker      使用 Docker 部署"
    echo "  restart     重启应用"
    echo "  stop        停止应用"
    echo "  logs        查看日志"
    echo "  status      查看状态"
    echo "  help        显示帮助"
}

# 命令处理
case "$1" in
    docker)
        deploy_docker
        ;;
    restart)
        pm2 reload ${APP_NAME}
        ;;
    stop)
        pm2 stop ${APP_NAME}
        ;;
    logs)
        pm2 logs ${APP_NAME}
        ;;
    status)
        pm2 status
        ;;
    help)
        show_help
        ;;
    *)
        main
        ;;
esac
