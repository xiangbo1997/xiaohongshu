#!/bin/bash
# 小红书文案生成器 - 服务器部署脚本
# 适用于内存较小的服务器（本地构建，服务器只运行）
# 域名: 需要配置

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# 配置 - 请根据实际情况修改
DOMAIN="xiaohongshu.example.com"  # 修改为你的域名
APP_PORT="3001"                    # 应用端口（避免与其他项目冲突）
APP_NAME="xiaohongshu"
PROJECT_DIR="/www/xiaohongshu"
LOG_DIR="/var/log/xiaohongshu"
CERT_DIR="/tmp/letsencrypt-xiaohongshu"

# 生成随机字符串
generate_random_string() {
    cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w "${1:-32}" | head -n 1
}

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# 显示菜单
show_menu() {
    clear
    echo -e "${CYAN}========================================${NC}"
    echo -e "${CYAN}  小红书文案生成器 - 服务器管理工具${NC}"
    echo -e "${CYAN}  域名: ${DOMAIN}${NC}"
    echo -e "${CYAN}  端口: ${APP_PORT}${NC}"
    echo -e "${CYAN}========================================${NC}"
    echo ""
    echo -e "${GREEN}1.${NC} 首次安装部署"
    echo -e "${GREEN}2.${NC} 更新部署（保留数据）"
    echo -e "${GREEN}3.${NC} 启动服务"
    echo -e "${GREEN}4.${NC} 停止服务"
    echo -e "${GREEN}5.${NC} 重启服务"
    echo -e "${GREEN}6.${NC} 查看状态"
    echo -e "${GREEN}7.${NC} 查看日志"
    echo -e "${GREEN}8.${NC} 配置 Nginx（共用现有 Nginx）"
    echo -e "${GREEN}9.${NC} 申请/续期 HTTPS 证书"
    echo -e "${GREEN}10.${NC} 数据库迁移"
    echo -e "${GREEN}11.${NC} 卸载清理"
    echo -e "${GREEN}0.${NC} 退出"
    echo ""
    echo -e "${YELLOW}请输入选项 [0-11]:${NC} "
}

# 检查 Node.js
check_node() {
    if ! command -v node &> /dev/null; then
        log_error "Node.js 未安装"
        echo "请先安装 Node.js 20+:"
        echo "  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -"
        echo "  sudo apt-get install -y nodejs"
        return 1
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

# 检查必要文件
check_files() {
    if [ ! -d "${PROJECT_DIR}/.next" ]; then
        log_error ".next 目录不存在！"
        echo "请确保已从本地上传构建产物"
        return 1
    fi

    if [ ! -f "${PROJECT_DIR}/package.json" ]; then
        log_error "package.json 不存在！"
        return 1
    fi

    log_info "构建产物检查通过"
}

# 创建目录
setup_dirs() {
    log_info "创建目录..."
    mkdir -p ${PROJECT_DIR}
    mkdir -p ${LOG_DIR}
    chown -R $USER:$USER ${PROJECT_DIR} 2>/dev/null || true
    chown -R $USER:$USER ${LOG_DIR} 2>/dev/null || true
}

# 创建 .env 文件
setup_env() {
    if [ ! -f "${PROJECT_DIR}/.env" ]; then
        log_warn ".env 文件不存在，创建模板..."

        JWT_SECRET=$(generate_random_string 32)
        ADMIN_PASSWORD=$(generate_random_string 16)

        cat > ${PROJECT_DIR}/.env << EOF
# 数据库配置
DATABASE_URL="postgresql://postgres:your_password@localhost:5432/xiaohongshu"

# JWT 密钥
JWT_SECRET="${JWT_SECRET}"

# 管理员密码
ADMIN_PASSWORD="${ADMIN_PASSWORD}"

# AI API Keys（至少配置一个）
OPENAI_API_KEY=""
OPENAI_BASE_URL=""
ANTHROPIC_API_KEY=""
ANTHROPIC_BASE_URL=""
DEEPSEEK_API_KEY=""
ZHIPU_API_KEY=""

# 虎皮椒支付（可选）
XUNHU_APPID=""
XUNHU_APPSECRET=""
XUNHU_NOTIFY_URL="https://${DOMAIN}/api/payment/notify"

# Redis（可选）
REDIS_URL=""
EOF

        echo ""
        echo -e "${YELLOW}========================================${NC}"
        echo -e "${YELLOW}  重要：请编辑 .env 文件配置数据库和 API Keys${NC}"
        echo -e "${YELLOW}========================================${NC}"
        echo -e "文件位置: ${BLUE}${PROJECT_DIR}/.env${NC}"
        echo -e "JWT 密钥: ${GREEN}${JWT_SECRET}${NC}"
        echo -e "管理员密码: ${GREEN}${ADMIN_PASSWORD}${NC}"
        echo -e "${YELLOW}========================================${NC}"
        echo ""
        echo "请编辑 .env 文件后重新运行安装"
        return 1
    else
        log_info ".env 文件已存在"
    fi
}

# 安装依赖并生成 Prisma 客户端
install_deps() {
    log_info "安装依赖..."
    cd ${PROJECT_DIR}

    # 安装所有依赖（包括 Prisma CLI，用于生成客户端）
    pnpm install --frozen-lockfile 2>/dev/null || pnpm install || npm install

    # 【关键】在服务器重新生成 Prisma 客户端
    # 原因：Prisma 客户端包含平台特定的二进制文件
    # 本地 Mac 构建的客户端无法在 Linux 服务器运行
    if [ -d "prisma" ]; then
        log_info "生成 Prisma 客户端（Linux 平台）..."
        npx prisma generate
        log_info "Prisma 客户端生成完成"
    fi

    log_info "依赖安装完成"
}

# 修复 Turbopack 构建的依赖问题
fix_turbopack_deps() {
    log_info "修复 Turbopack 构建依赖..."
    cd ${PROJECT_DIR}

    # 从构建文件中提取哈希化的依赖名
    if [ -d ".next/server/chunks" ]; then
        # 查找 @prisma/client 的哈希版本
        PRISMA_HASH=$(grep -ohE '@prisma/client-[a-f0-9]{16}' .next/server/chunks/*.js 2>/dev/null | head -1 | sed 's/@prisma\///')
        if [ -n "$PRISMA_HASH" ]; then
            log_info "创建 Prisma 客户端符号链接: $PRISMA_HASH"
            ln -sf client node_modules/@prisma/$PRISMA_HASH 2>/dev/null || true

            # 创建 query_compiler_fast 符号链接
            if [ -d "node_modules/@prisma/client/runtime" ]; then
                cd node_modules/@prisma/client/runtime
                ln -sf query_compiler_bg.postgresql.mjs query_compiler_fast_bg.postgresql.mjs 2>/dev/null || true
                ln -sf query_compiler_bg.postgresql.wasm-base64.mjs query_compiler_fast_bg.postgresql.wasm-base64.mjs 2>/dev/null || true
                cd ${PROJECT_DIR}
            fi
        fi

        # 查找 pg 的哈希版本
        PG_HASH=$(grep -ohE 'pg-[a-f0-9]{16}' .next/server/chunks/*.js 2>/dev/null | head -1)
        if [ -n "$PG_HASH" ]; then
            log_info "创建 pg 符号链接: $PG_HASH"
            ln -sf pg node_modules/$PG_HASH 2>/dev/null || true
        fi
    fi

    log_info "Turbopack 依赖修复完成"
}

# 数据库迁移
migrate_db() {
    log_info "执行数据库迁移..."
    cd ${PROJECT_DIR}

    # 生成 Prisma 客户端（如果需要）
    if [ -d "prisma" ]; then
        npx prisma generate 2>/dev/null || true
        npx prisma migrate deploy
        log_info "数据库迁移完成"
    else
        log_warn "未找到 prisma 目录，跳过迁移"
    fi
}

# 创建 PM2 配置
create_pm2_config() {
    log_info "创建 PM2 配置..."

    cat > ${PROJECT_DIR}/ecosystem.config.js << EOF
module.exports = {
  apps: [
    {
      name: '${APP_NAME}',
      script: 'node_modules/.bin/next',
      args: 'start -p ${APP_PORT}',
      cwd: '${PROJECT_DIR}',
      instances: 1,  // 内存小的服务器建议单实例
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: ${APP_PORT},
      },
      // 日志配置
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: '${LOG_DIR}/error.log',
      out_file: '${LOG_DIR}/out.log',
      merge_logs: true,
      // 内存限制（适合小内存服务器）
      max_memory_restart: '512M',
      restart_delay: 3000,
      max_restarts: 10,
      // 监控
      watch: false,
      // 优雅重启
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
    },
  ],
}
EOF

    log_info "PM2 配置已创建"
}

# 启动应用
start_app() {
    cd ${PROJECT_DIR}

    if pm2 list | grep -q ${APP_NAME}; then
        log_info "重启应用..."
        pm2 reload ${APP_NAME}
    else
        log_info "启动应用..."
        pm2 start ecosystem.config.js
    fi

    pm2 save
    log_info "应用已启动"
}

# 停止应用
stop_app() {
    if pm2 list | grep -q ${APP_NAME}; then
        log_info "停止应用..."
        pm2 stop ${APP_NAME}
        log_info "应用已停止"
    else
        log_warn "应用未运行"
    fi
}

# 设置开机自启
setup_startup() {
    log_info "设置开机自启..."
    pm2 startup systemd -u $USER --hp $HOME 2>/dev/null || pm2 startup
    pm2 save
}

# 1. 首次安装部署
install_deploy() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}  开始首次安装部署${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""

    check_node || return 1
    check_pnpm
    check_pm2
    setup_dirs
    check_files || return 1
    setup_env || return 1
    install_deps
    fix_turbopack_deps
    create_pm2_config
    migrate_db
    start_app
    setup_startup

    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}  安装完成！${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo -e "应用地址: ${BLUE}http://localhost:${APP_PORT}${NC}"
    echo -e "管理后台: ${BLUE}http://localhost:${APP_PORT}/admin${NC}"
    echo ""
    echo -e "${YELLOW}下一步：配置 Nginx 反向代理（选项 8）${NC}"
    echo ""
}

# 2. 更新部署
update_deploy() {
    echo -e "${BLUE}更新部署（保留数据）...${NC}"

    check_files || return 1

    # 停止应用
    stop_app

    # 重新安装依赖
    install_deps

    # 修复 Turbopack 依赖
    fix_turbopack_deps

    # 数据库迁移
    migrate_db

    # 启动应用
    start_app

    echo -e "${GREEN}✓ 更新完成${NC}"
}

# 3. 启动服务
start_services() {
    start_app
}

# 4. 停止服务
stop_services() {
    stop_app
}

# 5. 重启服务
restart_services() {
    log_info "重启服务..."
    cd ${PROJECT_DIR}
    pm2 reload ${APP_NAME} 2>/dev/null || start_app
    log_info "服务已重启"
}

# 6. 查看状态
show_status() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}  服务状态${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""

    echo -e "${CYAN}PM2 进程:${NC}"
    pm2 list
    echo ""

    echo -e "${CYAN}健康检查:${NC}"
    if curl -s http://127.0.0.1:${APP_PORT} > /dev/null 2>&1; then
        echo -e "${GREEN}✓ 应用正常响应${NC}"
    else
        echo -e "${RED}✗ 应用无响应${NC}"
    fi
    echo ""

    echo -e "${CYAN}内存使用:${NC}"
    pm2 show ${APP_NAME} 2>/dev/null | grep -E "memory|cpu" || echo "无法获取"
    echo ""

    echo -e "${CYAN}访问地址:${NC}"
    echo -e "  本地: http://localhost:${APP_PORT}"
    if [ -n "${DOMAIN}" ]; then
        echo -e "  域名: https://${DOMAIN}"
    fi
    echo ""
}

# 7. 查看日志
show_logs() {
    echo -e "${BLUE}选择要查看的日志:${NC}"
    echo "1. 实时日志（pm2 logs）"
    echo "2. 错误日志"
    echo "3. 输出日志"
    read -p "请选择 [1-3]: " log_choice

    case $log_choice in
        1) pm2 logs ${APP_NAME} --lines 100 ;;
        2) tail -f ${LOG_DIR}/error.log ;;
        3) tail -f ${LOG_DIR}/out.log ;;
        *) echo "无效选项" ;;
    esac
}

# 8. 配置 Nginx（共用现有 Nginx）
setup_nginx() {
    echo -e "${BLUE}配置 Nginx 反向代理...${NC}"

    # 检查 Nginx
    if ! command -v nginx &> /dev/null; then
        log_error "Nginx 未安装，请先安装 Nginx"
        return 1
    fi

    # 询问域名
    read -p "请输入域名 [${DOMAIN}]: " input_domain
    DOMAIN=${input_domain:-$DOMAIN}

    # 创建 Nginx 配置（仅 HTTP，后续可添加 HTTPS）
    NGINX_CONF="/etc/nginx/conf.d/${APP_NAME}.conf"

    cat > ${NGINX_CONF} << EOF
# 小红书文案生成器 - Nginx 配置
# 生成时间: $(date)

server {
    listen 80;
    server_name ${DOMAIN};

    # 日志
    access_log /var/log/nginx/${APP_NAME}_access.log;
    error_log /var/log/nginx/${APP_NAME}_error.log;

    # 请求体大小限制
    client_max_body_size 10M;

    # 反向代理到 Next.js 应用
    location / {
        proxy_pass http://127.0.0.1:${APP_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;

        # 超时设置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # 静态资源缓存
    location /_next/static {
        proxy_pass http://127.0.0.1:${APP_PORT};
        proxy_cache_valid 200 60m;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    # 健康检查
    location /health {
        access_log off;
        return 200 'OK';
        add_header Content-Type text/plain;
    }
}
EOF

    log_info "Nginx 配置已创建: ${NGINX_CONF}"

    # 测试配置
    nginx -t
    if [ $? -eq 0 ]; then
        # 重载 Nginx
        nginx -s reload 2>/dev/null || systemctl reload nginx
        log_info "Nginx 配置已生效"
        echo ""
        echo -e "访问地址: ${BLUE}http://${DOMAIN}${NC}"
        echo -e "${YELLOW}提示：运行选项 9 申请 HTTPS 证书${NC}"
    else
        log_error "Nginx 配置测试失败，请检查配置"
    fi
}

# 9. 申请 HTTPS 证书
setup_https() {
    echo -e "${BLUE}配置 HTTPS 证书...${NC}"

    # 询问域名
    read -p "请输入域名 [${DOMAIN}]: " input_domain
    DOMAIN=${input_domain:-$DOMAIN}

    # 安装 certbot
    if ! command -v certbot &> /dev/null; then
        log_info "安装 Certbot..."
        if command -v yum &> /dev/null; then
            yum install -y certbot python3-certbot-nginx
        else
            apt-get update && apt-get install -y certbot python3-certbot-nginx
        fi
    fi

    # 使用 certbot nginx 插件自动配置
    certbot --nginx -d ${DOMAIN} --non-interactive --agree-tos --email admin@${DOMAIN} 2>/dev/null || {
        log_warn "自动配置失败，尝试交互式申请..."
        certbot --nginx -d ${DOMAIN}
    }

    if [ $? -eq 0 ]; then
        log_info "HTTPS 证书配置成功"
        echo -e "访问地址: ${BLUE}https://${DOMAIN}${NC}"

        # 设置自动续期
        echo "0 0 * * * root certbot renew --quiet" > /etc/cron.d/certbot-renew
        log_info "已设置证书自动续期"
    else
        log_error "HTTPS 配置失败"
    fi
}

# 10. 数据库迁移
run_migration() {
    migrate_db
}

# 11. 卸载清理
uninstall() {
    echo -e "${RED}========================================${NC}"
    echo -e "${RED}  警告：即将卸载服务${NC}"
    echo -e "${RED}========================================${NC}"
    echo ""
    read -p "是否保留项目文件和数据？[Y/n]: " keep_data
    read -p "确认卸载？[y/N]: " confirm

    if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
        echo "取消卸载"
        return
    fi

    log_info "停止 PM2 进程..."
    pm2 stop ${APP_NAME} 2>/dev/null || true
    pm2 delete ${APP_NAME} 2>/dev/null || true
    pm2 save

    log_info "删除 Nginx 配置..."
    rm -f /etc/nginx/conf.d/${APP_NAME}.conf
    nginx -s reload 2>/dev/null || systemctl reload nginx 2>/dev/null || true

    if [ "$keep_data" = "n" ] || [ "$keep_data" = "N" ]; then
        log_info "删除项目文件..."
        rm -rf ${PROJECT_DIR}
        rm -rf ${LOG_DIR}
    fi

    log_info "卸载完成"
}

# 主循环
main() {
    while true; do
        show_menu
        read choice

        case $choice in
            1) install_deploy ;;
            2) update_deploy ;;
            3) start_services ;;
            4) stop_services ;;
            5) restart_services ;;
            6) show_status ;;
            7) show_logs ;;
            8) setup_nginx ;;
            9) setup_https ;;
            10) run_migration ;;
            11) uninstall ;;
            0) echo "退出"; exit 0 ;;
            *) echo -e "${RED}无效选项${NC}" ;;
        esac

        echo ""
        read -p "按回车键继续..."
    done
}

# 支持命令行参数
if [ $# -gt 0 ]; then
    case $1 in
        install) install_deploy ;;
        update) update_deploy ;;
        start) start_services ;;
        stop) stop_services ;;
        restart) restart_services ;;
        status) show_status ;;
        logs) show_logs ;;
        nginx) setup_nginx ;;
        https) setup_https ;;
        migrate) run_migration ;;
        uninstall) uninstall ;;
        *)
            echo "小红书文案生成器 - 服务器部署脚本"
            echo ""
            echo "用法: $0 {install|update|start|stop|restart|status|logs|nginx|https|migrate|uninstall}"
            echo ""
            echo "命令:"
            echo "  install   - 首次安装部署"
            echo "  update    - 更新部署（保留数据）"
            echo "  start     - 启动服务"
            echo "  stop      - 停止服务"
            echo "  restart   - 重启服务"
            echo "  status    - 查看状态"
            echo "  logs      - 查看日志"
            echo "  nginx     - 配置 Nginx"
            echo "  https     - 申请 HTTPS 证书"
            echo "  migrate   - 数据库迁移"
            echo "  uninstall - 卸载清理"
            ;;
    esac
else
    main
fi
