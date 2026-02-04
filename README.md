# 小红书爆款文案生成器

AI 驱动的小红书爆款文案生成工具，支持多种 AI 模型，一键生成种草笔记、教程攻略、生活日常等多种类型文案。

## 功能特性

- 🤖 **多 AI 支持**：OpenAI、Claude、DeepSeek、智谱 AI
- 📝 **多内容类型**：种草笔记、教程攻略、生活日常
- 🎯 **垂类优化**：美妆、美食、穿搭、旅行、健身等
- 📊 **多版本生成**：一次生成多个版本供选择
- 💾 **历史记录**：保存生成记录，支持收藏
- 💰 **商业变现**：会员系统 + 虎皮椒支付
- 📈 **管理后台**：数据统计看板

## 技术栈

- **前端**：Next.js 16 + TypeScript + TailwindCSS
- **后端**：Next.js API Routes
- **数据库**：PostgreSQL + Prisma 7
- **支付**：虎皮椒支付

## 快速开始

### 1. 安装依赖

```bash
pnpm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env`，填写配置：

```bash
cp .env.example .env
```

主要配置项：

```env
# 数据库
DATABASE_URL="postgresql://user:password@localhost:5432/xiaohongshu"

# JWT
JWT_SECRET="your-jwt-secret"

# AI API Keys（至少配置一个）
OPENAI_API_KEY=""
ANTHROPIC_API_KEY=""
DEEPSEEK_API_KEY=""
ZHIPU_API_KEY=""

# 虎皮椒支付
XUNHU_APPID=""
XUNHU_APPSECRET=""
XUNHU_NOTIFY_URL=""
```

### 3. 初始化数据库

```bash
npx prisma migrate dev
```

### 4. 启动开发服务器

```bash
pnpm dev
```

访问 http://localhost:3000

## 部署

### Vercel 部署

1. Fork 本项目
2. 在 Vercel 导入项目
3. 配置环境变量
4. 部署

### 数据库

推荐使用：
- Vercel Postgres（免费层）
- Supabase
- Neon

## 变现模式

### 层级一：流量变现
- 接入 Google AdSense
- CPS 推广链接

### 层级二：功能变现
- 免费用户：3 次/天
- 日卡：9.9 元
- 月卡：29.9 元
- 年卡：99 元

### 层级三：源码变现
- 闲鱼/互站网出售源码

## 项目结构

```
src/
├── app/
│   ├── api/           # API 路由
│   │   ├── auth/      # 认证
│   │   ├── generate/  # 文案生成
│   │   ├── payment/   # 支付
│   │   └── user/      # 用户
│   ├── admin/         # 管理后台
│   └── page.tsx       # 主页
├── components/        # UI 组件
├── lib/
│   ├── ai.ts          # AI 服务
│   ├── auth.ts        # 认证
│   ├── db.ts          # 数据库
│   ├── prompts.ts     # Prompt 模板
│   └── templates.ts   # 爆款模板
└── types/             # 类型定义
```

## 测试

项目使用 Vitest 进行测试，包含单元测试、集成测试和 E2E 测试。

### 运行测试

```bash
# 运行所有测试
pnpm test

# 监听模式
pnpm test:watch

# 生成覆盖率报告
pnpm test:coverage

# 测试 UI
pnpm test:ui
```

### 测试覆盖

- ✅ 认证模块（密码加密、JWT、VIP 验证、点数计算）
- ✅ 兑换码模块（生成、验证、格式处理、安全性）
- ✅ 支付模块（订单生成、价格计算、VIP 到期）
- ✅ 点数配置模块（点数计算、VIP 特权、产品配置）
- ✅ 数据验证模块（Zod Schema 验证）

详见 [测试文档](./docs/TESTING.md)

---

## 文档

完整的项目文档位于 `docs/` 目录：

| 文档 | 说明 |
|------|------|
| [API.md](./docs/API.md) | API 接口文档，包含所有接口的请求参数和响应格式 |
| [DEVELOPMENT.md](./docs/DEVELOPMENT.md) | 开发文档，包含环境搭建、开发规范、调试技巧 |
| [ARCHITECTURE.md](./docs/ARCHITECTURE.md) | 架构文档，包含系统设计、数据库设计、核心模块 |
| [TESTING.md](./docs/TESTING.md) | 测试文档，包含测试指南、编写规范、CI/CD 集成 |
| [TOOLS.md](./docs/TOOLS.md) | 开发工具文档，包含脚本使用、数据库管理、测试工具 |
| [TROUBLESHOOTING.md](./docs/TROUBLESHOOTING.md) | 故障排查指南，包含常见问题诊断和解决方案 |
| [DEPLOY.md](./DEPLOY.md) | 部署文档，包含服务器部署、运维管理 |

---

## 技术亮点

### 1. 点数系统设计

- **双层点数**：每日免费点数 + 购买/兑换的永久点数
- **智能消费**：优先消耗免费点数，不足时使用购买点数
- **自动重置**：每日 0 点（UTC+8）自动重置免费额度
- **完整追溯**：所有点数变动记录到 `PointRecord` 表

### 2. 兑换码安全设计

- **HMAC 签名**：96 位随机数 + 4 字节 HMAC-SHA256 签名
- **Base32 编码**：避免歧义字符（0/O, 1/I/L），易于输入
- **时序安全**：使用 `crypto.timingSafeEqual` 防止时序攻击
- **多次使用**：支持设置最大使用次数和过期时间

### 3. 支付安全保障

- **签名验证**：RSA（支付宝）/ HMAC（微信）双重验证
- **幂等性**：订单号唯一，防止重复回调
- **金额校验**：服务端验证，防止篡改
- **事务保证**：使用数据库事务确保数据一致性

### 4. 性能优化

- **多层缓存**：Redis + 内存缓存，热点数据 60 秒缓存
- **数据库索引**：高频查询字段建立索引
- **查询优化**：使用 Prisma include 避免 N+1 查询
- **代码分割**：动态导入大组件，减少首屏加载

---

## 贡献指南

欢迎贡献代码！请遵循以下步骤：

1. Fork 本项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'feat: Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

### 提交规范

使用 Conventional Commits 规范：

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Type 类型：**
- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档更新
- `style`: 代码格式
- `refactor`: 重构
- `perf`: 性能优化
- `test`: 测试相关
- `chore`: 构建/工具变动

---

## License

MIT
