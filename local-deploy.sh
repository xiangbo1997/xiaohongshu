#!/bin/bash
# 小红书文案生成器 - 本地打包上传脚本
# 用于内存较小的服务器：本地构建，上传到服务器运行

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# 配置 - 请根据实际情况修改
SERVER_IP="47.92.154.229"
SERVER_USER="root"
REMOTE_DIR="/www/xiaohongshu"
PACKAGE_NAME="xiaohongshu-deploy.tar.gz"

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# 显示菜单
show_menu() {
    clear
    echo -e "${CYAN}========================================${NC}"
    echo -e "${CYAN}  小红书文案生成器 - 本地部署工具${NC}"
    echo -e "${CYAN}  服务器: ${SERVER_IP}${NC}"
    echo -e "${CYAN}========================================${NC}"
    echo ""
    echo -e "${GREEN}1.${NC} 完整部署（构建 + 打包 + 上传）"
    echo -e "${GREEN}2.${NC} 仅构建"
    echo -e "${GREEN}3.${NC} 仅打包"
    echo -e "${GREEN}4.${NC} 仅上传"
    echo -e "${GREEN}5.${NC} 查看服务器状态"
    echo -e "${GREEN}6.${NC} SSH 连接服务器"
    echo -e "${GREEN}7.${NC} 修改配置"
    echo -e "${GREEN}0.${NC} 退出"
    echo ""
    echo -e "${YELLOW}请输入选项 [0-7]:${NC} "
}

# 检查本地环境
check_local_env() {
    log_info "检查本地环境..."

    if ! command -v node &> /dev/null; then
        log_error "Node.js 未安装"
        exit 1
    fi

    if ! command -v pnpm &> /dev/null; then
        log_error "pnpm 未安装，请执行: npm install -g pnpm"
        exit 1
    fi

    log_info "Node.js: $(node -v)"
    log_info "pnpm: $(pnpm -v)"
}

# 安装依赖
install_deps() {
    log_info "安装依赖..."
    pnpm install
}

# 生成 Prisma 客户端（本地构建用）
generate_prisma() {
    if [ -d "prisma" ]; then
        log_info "生成 Prisma 客户端（本地 macOS 平台）..."
        npx prisma generate
        log_warn "注意：Prisma 客户端是平台特定的，服务器部署时会自动重新生成 Linux 版本"
    fi
}

# 构建项目
build_project() {
    log_info "开始构建项目..."

    # 安装依赖
    install_deps

    # 生成 Prisma
    generate_prisma

    # 构建 Next.js
    log_info "构建 Next.js 应用..."
    pnpm build

    if [ -d ".next" ]; then
        log_info "构建成功！"
    else
        log_error "构建失败：.next 目录不存在"
        exit 1
    fi
}

# 检查构建产物
check_build() {
    if [ ! -d ".next" ]; then
        log_error ".next 目录不存在，请先执行构建"
        return 1
    fi
    log_info "构建产物检查通过"
}

# 打包文件
create_package() {
    log_info "开始打包文件..."

    # 删除旧包
    rm -f ${PACKAGE_NAME}

    # 打包必要文件（排除开发依赖和源码中不需要的部分）
    tar -czvf ${PACKAGE_NAME} \
        --exclude='node_modules' \
        --exclude='.git' \
        --exclude='.env' \
        --exclude='*.tar.gz' \
        .next \
        prisma \
        src/generated \
        public \
        package.json \
        pnpm-lock.yaml \
        .env.example \
        server-deploy.sh \
        ecosystem.config.js \
        next.config.ts \
        2>&1 | tail -10

    local size=$(ls -lh ${PACKAGE_NAME} | awk '{print $5}')
    log_info "打包完成: ${PACKAGE_NAME} (${size})"
}

# 上传到服务器
upload_to_server() {
    log_info "上传到服务器 ${SERVER_USER}@${SERVER_IP}:${REMOTE_DIR}..."

    # 检查压缩包
    if [ ! -f "${PACKAGE_NAME}" ]; then
        log_error "压缩包不存在，请先执行打包"
        return 1
    fi

    # 创建远程目录
    ssh ${SERVER_USER}@${SERVER_IP} "mkdir -p ${REMOTE_DIR}"

    # 上传压缩包
    scp ${PACKAGE_NAME} ${SERVER_USER}@${SERVER_IP}:${REMOTE_DIR}/

    log_info "上传完成"
}

# 远程解压并设置权限
extract_on_server() {
    log_info "在服务器上解压..."

    ssh ${SERVER_USER}@${SERVER_IP} << EOF
cd ${REMOTE_DIR}
tar -xzf ${PACKAGE_NAME}
rm -f ${PACKAGE_NAME}
chmod +x server-deploy.sh
echo "解压完成"
EOF

    log_info "解压完成"
}

# 显示后续步骤
show_next_steps() {
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}  上传完成！${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo -e "文件已上传到: ${BLUE}${SERVER_USER}@${SERVER_IP}:${REMOTE_DIR}${NC}"
    echo ""
    echo -e "${YELLOW}下一步操作:${NC}"
    echo ""
    echo "1. SSH 登录服务器:"
    echo -e "   ${BLUE}ssh ${SERVER_USER}@${SERVER_IP}${NC}"
    echo ""
    echo "2. 进入项目目录:"
    echo -e "   ${BLUE}cd ${REMOTE_DIR}${NC}"
    echo ""
    echo "3. 首次部署运行:"
    echo -e "   ${BLUE}./server-deploy.sh install${NC}"
    echo ""
    echo "4. 更新部署运行:"
    echo -e "   ${BLUE}./server-deploy.sh update${NC}"
    echo ""
    echo "或者使用交互式菜单:"
    echo -e "   ${BLUE}./server-deploy.sh${NC}"
    echo ""
    echo -e "${CYAN}提示：服务器脚本会自动重新生成 Prisma 客户端（Linux 平台）${NC}"
    echo ""
}

# 1. 完整部署
full_deploy() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}  开始完整部署流程${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""

    check_local_env
    build_project
    check_build || return 1
    create_package
    upload_to_server
    extract_on_server
    show_next_steps
}

# 2. 仅构建
build_only() {
    check_local_env
    build_project
    log_info "构建完成！"
}

# 3. 仅打包
package_only() {
    check_build || return 1
    create_package
}

# 4. 仅上传
upload_only() {
    if [ ! -f "${PACKAGE_NAME}" ]; then
        log_error "压缩包不存在，请先执行打包"
        return 1
    fi
    upload_to_server
    extract_on_server
    show_next_steps
}

# 5. 查看服务器状态
check_server_status() {
    log_info "查看服务器状态..."
    ssh ${SERVER_USER}@${SERVER_IP} << EOF
echo "========== PM2 进程 =========="
pm2 list 2>/dev/null || echo "PM2 未安装或无进程"
echo ""
echo "========== 磁盘使用 =========="
df -h | grep -E "^/dev|Filesystem"
echo ""
echo "========== 内存使用 =========="
free -h
echo ""
echo "========== 项目目录 =========="
ls -la ${REMOTE_DIR} 2>/dev/null || echo "目录不存在"
EOF
}

# 6. SSH 连接服务器
ssh_to_server() {
    log_info "连接到服务器..."
    ssh ${SERVER_USER}@${SERVER_IP}
}

# 7. 修改配置
modify_config() {
    echo ""
    echo -e "${CYAN}当前配置:${NC}"
    echo -e "  服务器 IP: ${BLUE}${SERVER_IP}${NC}"
    echo -e "  用户名:    ${BLUE}${SERVER_USER}${NC}"
    echo -e "  远程目录:  ${BLUE}${REMOTE_DIR}${NC}"
    echo ""

    read -p "服务器 IP [${SERVER_IP}]: " new_ip
    read -p "用户名 [${SERVER_USER}]: " new_user
    read -p "远程目录 [${REMOTE_DIR}]: " new_dir

    SERVER_IP=${new_ip:-$SERVER_IP}
    SERVER_USER=${new_user:-$SERVER_USER}
    REMOTE_DIR=${new_dir:-$REMOTE_DIR}

    echo ""
    log_info "配置已更新（仅本次会话有效）"
    echo -e "${YELLOW}如需永久修改，请编辑脚本文件${NC}"
}

# 显示帮助
show_help() {
    echo "小红书文案生成器 - 本地部署脚本"
    echo ""
    echo "用法: ./local-deploy.sh [命令]"
    echo ""
    echo "命令:"
    echo "  (无参数)    显示交互式菜单"
    echo "  deploy      完整部署（构建 + 打包 + 上传）"
    echo "  build       仅构建"
    echo "  package     仅打包"
    echo "  upload      仅上传"
    echo "  status      查看服务器状态"
    echo "  ssh         SSH 连接服务器"
    echo "  help        显示帮助"
    echo ""
    echo "配置:"
    echo "  服务器: ${SERVER_USER}@${SERVER_IP}"
    echo "  目录:   ${REMOTE_DIR}"
    echo ""
    echo "示例:"
    echo "  ./local-deploy.sh deploy    # 完整部署"
    echo "  ./local-deploy.sh build     # 仅本地构建"
    echo "  ./local-deploy.sh upload    # 仅上传已打包文件"
}

# 主循环
main_menu() {
    while true; do
        show_menu
        read choice

        case $choice in
            1) full_deploy ;;
            2) build_only ;;
            3) package_only ;;
            4) upload_only ;;
            5) check_server_status ;;
            6) ssh_to_server ;;
            7) modify_config ;;
            0) echo "退出"; exit 0 ;;
            *) echo -e "${RED}无效选项${NC}" ;;
        esac

        echo ""
        read -p "按回车键继续..."
    done
}

# 主入口
case "${1:-}" in
    deploy)
        full_deploy
        ;;
    build)
        build_only
        ;;
    package)
        package_only
        ;;
    upload)
        upload_only
        ;;
    status)
        check_server_status
        ;;
    ssh)
        ssh_to_server
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        main_menu
        ;;
esac
