# 小红书文案生成器 - 部署指南

## 服务器信息

| 项目 | 值 |
|------|-----|
| 服务器 IP | 47.92.154.229 |
| 项目目录 | /www/xiaohongshu |
| 应用端口 | 3001 |
| 日志目录 | /var/log/xiaohongshu |

---

## 首次部署

### 1. 本地构建上传

```bash
cd /Volumes/workSpace/study/aiProject/xiaohongshu
./local-deploy.sh deploy
```

### 2. 服务器配置

```bash
# SSH 登录
ssh root@47.92.154.229

# 进入目录
cd /www/xiaohongshu

# 修改域名（替换为你的实际域名）
sed -i 's/xiaohongshu.example.com/你的域名/g' server-deploy.sh

# 配置环境变量
cp .env.example .env
vim .env
```

### 3. 安装部署

```bash
./server-deploy.sh install
```

### 4. 配置 Nginx

```bash
./server-deploy.sh nginx
```

### 5. 申请 HTTPS（可选）

```bash
./server-deploy.sh https
```

---

## 更新部署

当代码有更新时，按以下步骤操作：

### 方式一：一键更新（推荐）

**本地执行：**

```bash
cd /Volumes/workSpace/study/aiProject/xiaohongshu
./local-deploy.sh deploy
```

**服务器执行：**

```bash
ssh root@47.92.154.229
cd /www/xiaohongshu
./server-deploy.sh update
```

### 方式二：分步更新

**本地：**

```bash
# 1. 构建
./local-deploy.sh build

# 2. 打包
./local-deploy.sh package

# 3. 上传
./local-deploy.sh upload
```

**服务器：**

```bash
# 更新部署（保留数据和配置）
./server-deploy.sh update
```

---

## 日常运维

### 服务管理

```bash
# 启动
./server-deploy.sh start

# 停止
./server-deploy.sh stop

# 重启
./server-deploy.sh restart

# 查看状态
./server-deploy.sh status
```

### 查看日志

```bash
# 交互式选择
./server-deploy.sh logs

# 或直接使用 PM2
pm2 logs xiaohongshu

# 查看错误日志
tail -f /var/log/xiaohongshu/error.log

# 查看输出日志
tail -f /var/log/xiaohongshu/out.log
```

### 数据库迁移

当 Prisma schema 有变更时：

```bash
./server-deploy.sh migrate
```

---

## 常用命令速查

### 本地命令

| 命令 | 说明 |
|------|------|
| `./local-deploy.sh` | 交互式菜单 |
| `./local-deploy.sh deploy` | 完整部署（构建+打包+上传） |
| `./local-deploy.sh build` | 仅构建 |
| `./local-deploy.sh package` | 仅打包 |
| `./local-deploy.sh upload` | 仅上传 |
| `./local-deploy.sh status` | 查看服务器状态 |
| `./local-deploy.sh ssh` | SSH 连接服务器 |

### 服务器命令

| 命令 | 说明 |
|------|------|
| `./server-deploy.sh` | 交互式菜单 |
| `./server-deploy.sh install` | 首次安装 |
| `./server-deploy.sh update` | 更新部署 |
| `./server-deploy.sh start` | 启动服务 |
| `./server-deploy.sh stop` | 停止服务 |
| `./server-deploy.sh restart` | 重启服务 |
| `./server-deploy.sh status` | 查看状态 |
| `./server-deploy.sh logs` | 查看日志 |
| `./server-deploy.sh nginx` | 配置 Nginx |
| `./server-deploy.sh https` | 申请 HTTPS |
| `./server-deploy.sh migrate` | 数据库迁移 |

### PM2 命令

```bash
pm2 list                    # 查看进程列表
pm2 logs xiaohongshu        # 查看日志
pm2 monit                   # 监控面板
pm2 reload xiaohongshu      # 热重载
pm2 stop xiaohongshu        # 停止
pm2 delete xiaohongshu      # 删除进程
```

### Nginx 命令

```bash
nginx -t                    # 测试配置
nginx -s reload             # 重载配置
systemctl status nginx      # 查看状态
```

---

## 故障排查

### 应用无法启动

```bash
# 查看详细错误
pm2 logs xiaohongshu --lines 50

# 检查端口占用
lsof -i :3001

# 检查内存
free -h
```

### Nginx 502 错误

```bash
# 检查应用是否运行
pm2 status

# 检查 Nginx 配置
nginx -t

# 查看 Nginx 错误日志
tail -f /var/log/nginx/xiaohongshu_error.log
```

### 数据库连接失败

```bash
# 检查 PostgreSQL 状态
systemctl status postgresql

# 测试连接
psql -U postgres -h localhost -d xiaohongshu

# 检查 .env 配置
cat /www/xiaohongshu/.env | grep DATABASE
```

---

## 环境变量说明

```env
# 数据库（必填）
DATABASE_URL="postgresql://用户名:密码@localhost:5432/xiaohongshu"

# JWT 密钥（自动生成）
JWT_SECRET="xxx"

# 管理员密码（自动生成）
ADMIN_PASSWORD="xxx"

# AI API Keys（至少填一个）
OPENAI_API_KEY=""
OPENAI_BASE_URL=""
ANTHROPIC_API_KEY=""
ANTHROPIC_BASE_URL=""
DEEPSEEK_API_KEY=""
ZHIPU_API_KEY=""

# 虎皮椒支付（可选）
XUNHU_APPID=""
XUNHU_APPSECRET=""
XUNHU_NOTIFY_URL="https://你的域名/api/payment/notify"

# Redis（可选）
REDIS_URL=""
```

---

## 目录结构

```
/www/xiaohongshu/
├── .next/              # Next.js 构建产物
├── prisma/             # 数据库 schema
├── src/generated/      # Prisma 生成的客户端
├── public/             # 静态资源
├── node_modules/       # 生产依赖
├── .env                # 环境变量（不要提交）
├── .env.example        # 环境变量模板
├── package.json
├── ecosystem.config.js # PM2 配置
└── server-deploy.sh    # 部署脚本

/var/log/xiaohongshu/
├── error.log           # 错误日志
└── out.log             # 输出日志

/etc/nginx/conf.d/
└── xiaohongshu.conf    # Nginx 配置
```

---

## 更新记录

| 日期 | 版本 | 说明 |
|------|------|------|
| 2024-01-08 | 1.0.0 | 初始部署 |
