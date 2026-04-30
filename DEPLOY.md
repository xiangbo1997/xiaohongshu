# 小红书爆款文案生成器 - 部署文档

> **AI 专用指南**：本文档面向 AI 助手和开发者，包含完整的部署流程、脚本说明和故障排查指南。

---

## 快速参考

### 关键信息

| 项目 | 值 |
|------|-----|
| **服务器 IP** | `47.92.154.229` |
| **SSH 用户** | `root` |
| **部署目录** | `/www/xiaohongshu` |
| **应用端口** | `3001` |
| **日志目录** | `/var/log/xiaohongshu` |
| **技术栈** | Next.js 16.1.1 + React 19 + Prisma 7 + PostgreSQL |
| **包管理器** | pnpm |
| **进程管理** | PM2 |

### 一句话部署

```bash
# 本地：构建 + 打包 + 上传
./local-deploy.sh deploy

# 服务器：更新部署
./server-deploy.sh update
```

---

## 1. 部署策略说明

### 为什么本地构建？

服务器内存有限（1-2GB），Next.js 构建需要 4GB+ 内存。采用**本地构建、远程运行**策略：

```
┌─────────────────────┐         ┌─────────────────────┐
│      本地机器        │         │      远程服务器      │
│                     │         │                     │
│  1. pnpm install    │         │                     │
│  2. prisma generate │   SCP   │  1. 解压 tar.gz     │
│  3. pnpm build      │ ──────► │  2. pnpm install    │
│  4. tar 打包        │         │  3. prisma migrate  │
│                     │         │  4. PM2 启动        │
└─────────────────────┘         └─────────────────────┘
```

### 打包内容清单

| 文件/目录 | 必须 | 说明 |
|-----------|:----:|------|
| `.next/` | ✅ | Next.js 构建产物 |
| `prisma/` | ✅ | 数据库 schema 和迁移 |
| `src/generated/` | ✅ | Prisma 客户端（服务器会重新生成） |
| `public/` | ✅ | 静态资源 |
| `package.json` | ✅ | 依赖定义 |
| `pnpm-lock.yaml` | ✅ | 依赖锁定 |
| `server-deploy.sh` | ✅ | 服务器部署脚本 |
| `ecosystem.config.js` | ✅ | PM2 配置 |
| `next.config.ts` | ✅ | Next.js 配置 |
| `.env.example` | ⚪ | 环境变量模板 |

### ⚠️ Prisma 客户端平台问题

**重要**：Prisma 客户端包含平台特定的二进制文件（Query Engine）：
- 本地 macOS 构建的客户端**无法**在 Linux 服务器运行
- 服务器部署脚本会**自动重新生成** Linux 版本的 Prisma 客户端
- 如遇到 `Prisma Client was not yet initialized` 或版本不匹配错误，执行：

```bash
cd /www/xiaohongshu && npx prisma generate && pm2 restart xiaohongshu
```

### ⚠️ Turbopack 构建依赖问题

Next.js 使用 Turbopack 构建时，会将依赖名哈希化（如 `@prisma/client-a1b2c3d4e5f6`），导致运行时找不到模块。

服务器部署脚本会**自动修复**此问题：
- 创建 `@prisma/client` 哈希版本的符号链接
- 创建 `pg` 模块的哈希版本符号链接
- 创建 Prisma 运行时 `query_compiler_fast` 相关文件的符号链接

如遇到 `Cannot find module '@prisma/client-xxxxxx'` 错误，手动执行：

```bash
cd /www/xiaohongshu && ./server-deploy.sh update
```

### 不打包的内容

- `node_modules/` - 服务器重新安装生产依赖
- `.git/` - 版本控制目录
- `.env` - 敏感配置（服务器单独维护）
- `src/` - 源代码（已编译）
- `tests/` - 测试文件
- `scripts/` - 开发脚本

---

## 2. 本地构建流程

### 2.1 前置条件

```bash
# 检查 Node.js (需要 v20+)
node -v  # 应显示 v20.x.x 或更高

# 检查 pnpm
pnpm -v  # 应显示 9.x.x 或更高

# 如未安装 pnpm
npm install -g pnpm
```

### 2.2 手动构建步骤

```bash
# 进入项目目录
cd /Volumes/workSpace/study/aiProject/xiaohongshu

# 1. 安装依赖
pnpm install

# 2. 生成 Prisma 客户端
npx prisma generate

# 3. 构建项目
pnpm build

# 4. 打包部署文件
tar -czvf xiaohongshu-deploy.tar.gz \
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
    next.config.ts

# 5. 上传到服务器
scp xiaohongshu-deploy.tar.gz root@47.92.154.229:/www/xiaohongshu/
```

### 2.3 使用本地脚本（推荐）

```bash
# 交互式菜单
./local-deploy.sh

# 或直接执行命令
./local-deploy.sh build    # 仅构建
./local-deploy.sh package  # 仅打包
./local-deploy.sh upload   # 仅上传
./local-deploy.sh deploy   # 完整部署（构建+打包+上传）
./local-deploy.sh status   # 查看服务器状态
./local-deploy.sh ssh      # SSH 连接服务器
```

### 2.4 本地脚本配置

文件：`local-deploy.sh`（第 16-19 行）

```bash
SERVER_IP="47.92.154.229"
SERVER_USER="root"
REMOTE_DIR="/www/xiaohongshu"
PACKAGE_NAME="xiaohongshu-deploy.tar.gz"
```

---

## 3. 服务器部署流程

### 3.1 首次部署

```bash
# 1. SSH 登录服务器
ssh root@47.92.154.229

# 2. 创建目录（如不存在）
mkdir -p /www/xiaohongshu

# 3. 进入目录
cd /www/xiaohongshu

# 4. 解压文件
tar -xzf xiaohongshu-deploy.tar.gz

# 5. 赋予执行权限
chmod +x server-deploy.sh

# 6. 执行首次安装
./server-deploy.sh install
```

**首次安装会自动：**
- 检查 Node.js、pnpm、PM2
- 创建目录结构
- 生成 `.env` 模板（需手动编辑）
- 安装生产依赖
- 执行数据库迁移
- 启动 PM2 进程
- 设置开机自启

### 3.2 更新部署

```bash
# 服务器执行
cd /www/xiaohongshu
./server-deploy.sh update
```

**更新部署会：**
- 停止当前服务
- 重新安装依赖
- 执行数据库迁移
- 重启服务

### 3.3 配置环境变量

首次部署时，编辑 `.env` 文件：

```bash
vim /www/xiaohongshu/.env
```

**必须配置：**

```env
# 数据库连接（必须）
DATABASE_URL="postgresql://用户名:密码@localhost:5432/xiaohongshu"

# JWT 密钥（自动生成，可保持）
JWT_SECRET="自动生成的32位随机字符串"

# 管理员密码（自动生成，请记录）
ADMIN_PASSWORD="自动生成的16位随机字符串"

# AI API（至少配置一个）
OPENAI_API_KEY="sk-xxx"
OPENAI_BASE_URL=""  # 可选，自定义 API 地址
# 或
ANTHROPIC_API_KEY="sk-ant-xxx"
ANTHROPIC_BASE_URL=""
# 或
DEEPSEEK_API_KEY="sk-xxx"
# 或
ZHIPU_API_KEY="xxx"
```

**可选配置：**

```env
# 虎皮椒支付
XUNHU_APPID=""
XUNHU_APPSECRET=""
XUNHU_NOTIFY_URL="https://你的域名/api/payment/notify"

# Redis 缓存
REDIS_URL="redis://localhost:6379"
```

### 3.4 配置 Nginx

```bash
./server-deploy.sh nginx
# 按提示输入域名
```

### 3.5 配置 HTTPS（可选）

```bash
./server-deploy.sh https
# 使用 certbot 自动申请 Let's Encrypt 证书
```

---

## 4. 服务器脚本完整命令

### 4.1 命令列表

| 命令 | 说明 |
|------|------|
| `./server-deploy.sh` | 显示交互式菜单 |
| `./server-deploy.sh install` | 首次安装部署 |
| `./server-deploy.sh update` | 更新部署（保留数据） |
| `./server-deploy.sh start` | 启动服务 |
| `./server-deploy.sh stop` | 停止服务 |
| `./server-deploy.sh restart` | 重启服务 |
| `./server-deploy.sh status` | 查看状态 |
| `./server-deploy.sh logs` | 查看日志 |
| `./server-deploy.sh nginx` | 配置 Nginx |
| `./server-deploy.sh https` | 申请 HTTPS 证书 |
| `./server-deploy.sh migrate` | 数据库迁移 |
| `./server-deploy.sh uninstall` | 卸载清理 |

### 4.2 服务器脚本配置

文件：`server-deploy.sh`（第 17-22 行）

```bash
DOMAIN="xiaohongshu.example.com"  # 修改为你的域名
APP_PORT="3001"                    # 应用端口
APP_NAME="xiaohongshu"             # PM2 进程名
PROJECT_DIR="/www/xiaohongshu"     # 项目目录
LOG_DIR="/var/log/xiaohongshu"     # 日志目录
```

---

## 5. 日常运维

### 5.1 PM2 常用命令

```bash
pm2 list                    # 查看进程列表
pm2 logs xiaohongshu        # 查看日志
pm2 logs xiaohongshu --lines 100  # 查看最近100行
pm2 monit                   # 实时监控面板
pm2 reload xiaohongshu      # 热重载（零停机）
pm2 restart xiaohongshu     # 重启
pm2 stop xiaohongshu        # 停止
pm2 delete xiaohongshu      # 删除进程
pm2 save                    # 保存进程列表
```

### 5.2 Nginx 常用命令

```bash
nginx -t                    # 测试配置语法
nginx -s reload             # 重载配置
systemctl status nginx      # 查看状态
systemctl restart nginx     # 重启 Nginx
```

### 5.3 日志查看

```bash
# PM2 日志
pm2 logs xiaohongshu

# 错误日志
tail -f /var/log/xiaohongshu/error.log

# 输出日志
tail -f /var/log/xiaohongshu/out.log

# Nginx 访问日志
tail -f /var/log/nginx/xiaohongshu_access.log

# Nginx 错误日志
tail -f /var/log/nginx/xiaohongshu_error.log
```

---

## 6. 故障排查

### 6.1 Prisma 客户端平台不匹配（常见）

**问题**：服务器报错 `Prisma Client was not yet initialized` 或版本不匹配

```
The Prisma client was generated for "darwin-arm64" but running on "linux-x64"
```

**原因**：Prisma 客户端包含平台特定的二进制文件，本地 Mac 构建的无法在 Linux 运行

**解决**：

```bash
cd /www/xiaohongshu
npx prisma generate
pm2 restart xiaohongshu
```

**预防**：服务器部署脚本 `server-deploy.sh` 已自动处理此问题，每次部署会重新生成 Prisma 客户端。

### 6.2 TypeScript 构建失败

**问题**：TypeScript 编译错误

```
Module '@prisma/client' has no exported member 'PrismaClient'
```

**解决**：

```bash
# 检查 tsconfig.json 的 exclude 配置
cat tsconfig.json | grep -A5 '"exclude"'

# 应包含：
# "exclude": ["node_modules", "prisma", "scripts", "tests"]

# 重新生成 Prisma 客户端
npx prisma generate
```

### 6.3 PM2 启动失败

**检查步骤**：

```bash
# 1. 查看详细错误
pm2 logs xiaohongshu --lines 50

# 2. 检查 .env 文件
cat /www/xiaohongshu/.env

# 3. 检查端口占用
lsof -i :3001

# 4. 检查内存
free -h

# 5. 手动启动测试
cd /www/xiaohongshu
node node_modules/.bin/next start -p 3001
```

### 6.4 Nginx 502 Bad Gateway

**解决**：

```bash
# 1. 检查应用是否运行
pm2 status

# 2. 测试本地访问
curl http://127.0.0.1:3001

# 3. 检查 Nginx 配置
nginx -t

# 4. 查看 Nginx 错误日志
tail -20 /var/log/nginx/xiaohongshu_error.log

# 5. 重启应用
pm2 restart xiaohongshu
```

### 6.5 数据库连接失败

**解决**：

```bash
# 1. 检查 PostgreSQL 状态
systemctl status postgresql

# 2. 测试数据库连接
psql -U postgres -h localhost -d xiaohongshu

# 3. 检查 DATABASE_URL 格式
cat /www/xiaohongshu/.env | grep DATABASE_URL

# 正确格式：
# DATABASE_URL="postgresql://用户名:密码@localhost:5432/xiaohongshu"

# 4. 重新执行迁移
cd /www/xiaohongshu
npx prisma migrate deploy
```

### 6.6 内存不足

**解决**：

```bash
# 1. 检查内存使用
free -h

# 2. 检查进程内存
pm2 show xiaohongshu | grep memory

# 3. 创建 swap（如未创建）
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile swap swap defaults 0 0' >> /etc/fstab
```

---

## 7. 目录结构

```
/www/xiaohongshu/
├── .next/                  # Next.js 构建产物
│   ├── cache/
│   ├── server/
│   └── static/
├── prisma/                 # 数据库
│   ├── schema.prisma       # 数据模型定义
│   └── migrations/         # 迁移文件
├── src/generated/          # Prisma 客户端
├── public/                 # 静态资源
├── node_modules/           # 生产依赖
├── .env                    # 环境变量（敏感）
├── .env.example            # 环境变量模板
├── package.json
├── pnpm-lock.yaml
├── ecosystem.config.js     # PM2 配置
├── server-deploy.sh        # 部署脚本
└── next.config.ts          # Next.js 配置

/var/log/xiaohongshu/
├── out.log                 # 标准输出
└── error.log               # 错误日志

/etc/nginx/conf.d/
└── xiaohongshu.conf        # Nginx 配置
```

---

## 8. 快速命令复制

### 完整更新部署流程

**本地执行：**

```bash
cd /Volumes/workSpace/study/aiProject/xiaohongshu && \
pnpm install && npx prisma generate && pnpm build && \
tar -czvf xiaohongshu-deploy.tar.gz \
    --exclude='node_modules' --exclude='.git' --exclude='.env' --exclude='*.tar.gz' \
    .next prisma src/generated public package.json pnpm-lock.yaml \
    .env.example server-deploy.sh ecosystem.config.js next.config.ts && \
scp xiaohongshu-deploy.tar.gz root@47.92.154.229:/www/xiaohongshu/
```

**服务器执行：**

```bash
ssh root@47.92.154.229 "cd /www/xiaohongshu && tar -xzf xiaohongshu-deploy.tar.gz && chmod +x server-deploy.sh && ./server-deploy.sh update"
```

### 一键部署（本地脚本）

```bash
cd /Volumes/workSpace/study/aiProject/xiaohongshu && ./local-deploy.sh deploy
```

---

## 更新记录

| 日期 | 版本 | 说明 |
|------|------|------|
| 2026-02-04 | 1.1.0 | 完善 AI 友好文档，添加详细故障排查 |
| 2024-01-08 | 1.0.0 | 初始部署 |

---

**文档维护者**: Claude Code
