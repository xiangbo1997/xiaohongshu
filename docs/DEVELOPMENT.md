# 开发文档

小红书爆款文案生成器 - 本地开发指南

## 目录

- [环境要求](#环境要求)
- [快速开始](#快速开始)
- [项目结构](#项目结构)
- [开发规范](#开发规范)
- [调试技巧](#调试技巧)
- [常见问题](#常见问题)

---

## 环境要求

### 必需软件

| 软件 | 版本要求 | 说明 |
|------|---------|------|
| Node.js | >= 18.0.0 | 推荐使用 LTS 版本 |
| pnpm | >= 8.0.0 | 包管理器 |
| PostgreSQL | >= 14.0 | 数据库 |
| Redis | >= 6.0 | 缓存（可选） |

### 推荐工具

- **IDE**: VS Code + 推荐扩展
  - ESLint
  - Prettier
  - Prisma
  - Tailwind CSS IntelliSense
- **API 测试**: Postman / Insomnia
- **数据库管理**: TablePlus / DBeaver
- **Git 客户端**: SourceTree / GitKraken

---

## 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/your-repo/xiaohongshu.git
cd xiaohongshu
```

### 2. 安装依赖

```bash
pnpm install
```

### 3. 配置环境变量

复制环境变量模板：

```bash
cp .env.example .env
```

编辑 `.env` 文件，填写必要的配置：

```env
# 数据库配置（必填）
DATABASE_URL="postgresql://postgres:password@localhost:5432/xiaohongshu"

# JWT 密钥（必填，生产环境请使用强密码）
JWT_SECRET="your-super-secret-jwt-key-change-in-production"

# 加密密钥（必填，用于兑换码等敏感数据加密）
ENCRYPTION_SECRET="your-encryption-secret-key"

# 管理员密码（必填）
ADMIN_PASSWORD="your-admin-password"

# AI API Keys（至少配置一个）
OPENAI_API_KEY="sk-xxx"
OPENAI_BASE_URL="https://api.openai.com/v1"  # 可选，使用代理时配置

ANTHROPIC_API_KEY="sk-ant-xxx"
ANTHROPIC_BASE_URL=""  # 可选

DEEPSEEK_API_KEY="sk-xxx"

ZHIPU_API_KEY="xxx"

# Redis（可选，不配置则使用内存缓存）
REDIS_URL="redis://localhost:6379"

# 支付配置（可选，开发环境可不配置）
# 虎皮椒支付
XUNHU_APPID=""
XUNHU_APPSECRET=""
XUNHU_NOTIFY_URL="https://your-domain.com/api/payment/notify"

# 支付宝
ALIPAY_APP_ID=""
ALIPAY_PRIVATE_KEY=""
ALIPAY_PUBLIC_KEY=""
ALIPAY_NOTIFY_URL="https://your-domain.com/api/payment/notify"
ALIPAY_RETURN_URL="https://your-domain.com/payment/result"

# 微信支付
WECHAT_APP_ID=""
WECHAT_MCH_ID=""
WECHAT_API_KEY=""
WECHAT_API_V3_KEY=""
WECHAT_SERIAL_NO=""
WECHAT_PRIVATE_KEY=""
WECHAT_PLATFORM_PUBLIC_KEY=""
WECHAT_NOTIFY_URL="https://your-domain.com/api/payment/notify"
```

### 4. 初始化数据库

```bash
# 运行数据库迁移
npx prisma migrate dev

# 生成 Prisma Client
npx prisma generate
```

### 5. 启动开发服务器

```bash
pnpm dev
```

访问 http://localhost:3000

### 6. 运行测试

```bash
# 运行所有测试
pnpm test

# 运行测试并生成覆盖率报告
pnpm test:coverage

# 监听模式运行测试
pnpm test:watch
```

---

## 项目结构

```
xiaohongshu/
├── prisma/                    # 数据库相关
│   ├── schema.prisma         # 数据库模型定义
│   └── migrations/           # 数据库迁移文件
├── src/
│   ├── app/                  # Next.js App Router
│   │   ├── api/             # API 路由
│   │   │   ├── auth/        # 认证接口
│   │   │   ├── generate/    # 文案生成接口
│   │   │   ├── payment/     # 支付接口
│   │   │   ├── redeem/      # 兑换码接口
│   │   │   ├── user/        # 用户接口
│   │   │   ├── admin/       # 管理后台接口
│   │   │   └── config/      # 配置接口
│   │   ├── admin/           # 管理后台页面
│   │   ├── payment/         # 支付页面
│   │   ├── profile/         # 用户中心
│   │   ├── layout.tsx       # 全局布局
│   │   ├── page.tsx         # 首页
│   │   └── globals.css      # 全局样式
│   ├── components/          # React 组件
│   │   ├── ui/             # 基础 UI 组件
│   │   ├── layout/         # 布局组件
│   │   ├── GeneratorForm.tsx    # 文案生成表单
│   │   ├── ResultCard.tsx       # 结果展示卡片
│   │   ├── AuthModal.tsx        # 认证弹窗
│   │   ├── PricingModal.tsx     # 定价弹窗
│   │   └── ...
│   ├── lib/                 # 核心业务逻辑
│   │   ├── ai.ts           # AI 服务集成
│   │   ├── auth.ts         # 认证逻辑
│   │   ├── payment.ts      # 支付逻辑
│   │   ├── redemption.ts   # 兑换码逻辑
│   │   ├── points-config.ts # 点数配置
│   │   ├── db.ts           # 数据库连接
│   │   ├── cache.ts        # 缓存管理
│   │   ├── prompts.ts      # AI Prompt 模板
│   │   ├── templates.ts    # 爆款文案模板
│   │   ├── validations.ts  # 数据验证
│   │   └── ...
│   ├── types/              # TypeScript 类型定义
│   │   └── index.ts
│   └── generated/          # Prisma 生成的客户端
│       └── prisma/
├── tests/                   # 测试文件
│   ├── unit/               # 单元测试
│   ├── integration/        # 集成测试
│   ├── e2e/                # E2E 测试
│   ├── fixtures/           # 测试数据
│   ├── helpers.ts          # 测试辅助函数
│   └── setup.ts            # 测试环境设置
├── docs/                    # 文档
│   ├── API.md              # API 文档
│   ├── DEVELOPMENT.md      # 开发文档（本文件）
│   └── ARCHITECTURE.md     # 架构文档
├── public/                  # 静态资源
├── .env.example            # 环境变量模板
├── .gitignore
├── package.json
├── tsconfig.json
├── vitest.config.ts        # 测试配置
├── next.config.ts          # Next.js 配置
├── tailwind.config.ts      # Tailwind CSS 配置
└── README.md
```

---

## 开发规范

### 代码风格

项目使用 ESLint 和 Prettier 进行代码格式化：

```bash
# 检查代码风格
pnpm lint

# 自动修复
pnpm lint:fix
```

### Git 提交规范

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
- `style`: 代码格式（不影响代码运行）
- `refactor`: 重构
- `perf`: 性能优化
- `test`: 测试相关
- `chore`: 构建过程或辅助工具的变动

**示例：**

```bash
git commit -m "feat(auth): 添加手机号登录功能"
git commit -m "fix(payment): 修复支付回调验签失败问题"
git commit -m "docs(api): 更新 API 文档"
```

### 分支管理

- `main`: 主分支，保持稳定
- `develop`: 开发分支
- `feature/*`: 功能分支
- `fix/*`: 修复分支
- `hotfix/*`: 紧急修复分支

**工作流程：**

```bash
# 1. 从 develop 创建功能分支
git checkout develop
git pull
git checkout -b feature/user-profile

# 2. 开发并提交
git add .
git commit -m "feat(user): 添加用户资料页面"

# 3. 推送到远程
git push origin feature/user-profile

# 4. 创建 Pull Request 到 develop
```

### 数据库迁移

**创建迁移：**

```bash
# 修改 prisma/schema.prisma 后
npx prisma migrate dev --name add_user_avatar
```

**应用迁移：**

```bash
# 开发环境
npx prisma migrate dev

# 生产环境
npx prisma migrate deploy
```

**重置数据库（谨慎使用）：**

```bash
npx prisma migrate reset
```

### API 开发规范

1. **路由命名**：使用 RESTful 风格
   - GET `/api/users` - 获取列表
   - GET `/api/users/:id` - 获取详情
   - POST `/api/users` - 创建
   - PUT `/api/users/:id` - 更新
   - DELETE `/api/users/:id` - 删除

2. **响应格式**：统一使用 JSON
   ```typescript
   // 成功
   return NextResponse.json({
     success: true,
     data: { ... }
   })

   // 失败
   return NextResponse.json({
     success: false,
     error: '错误信息'
   }, { status: 400 })
   ```

3. **错误处理**：使用 try-catch 包裹
   ```typescript
   try {
     // 业务逻辑
   } catch (error) {
     console.error('Error:', error)
     return NextResponse.json({
       success: false,
       error: '服务器错误'
     }, { status: 500 })
   }
   ```

4. **数据验证**：使用 Zod Schema
   ```typescript
   import { validateRequest, loginSchema } from '@/lib/validations'

   const result = validateRequest(loginSchema, data)
   if (!result.success) {
     return NextResponse.json({
       success: false,
       error: result.error
     }, { status: 400 })
   }
   ```

### 组件开发规范

1. **文件命名**：使用 PascalCase
   - `UserProfile.tsx`
   - `GeneratorForm.tsx`

2. **组件结构**：
   ```typescript
   // 1. 导入
   import { useState } from 'react'
   import { Button } from '@/components/ui/button'

   // 2. 类型定义
   interface UserProfileProps {
     userId: string
   }

   // 3. 组件
   export function UserProfile({ userId }: UserProfileProps) {
     // 状态
     const [loading, setLoading] = useState(false)

     // 副作用
     useEffect(() => {
       // ...
     }, [])

     // 事件处理
     const handleSubmit = () => {
       // ...
     }

     // 渲染
     return (
       <div>
         {/* ... */}
       </div>
     )
   }
   ```

3. **样式**：优先使用 Tailwind CSS
   ```tsx
   <div className="flex items-center gap-4 p-4 bg-white rounded-lg shadow">
     <Button className="bg-blue-500 hover:bg-blue-600">
       提交
     </Button>
   </div>
   ```

---

## 调试技巧

### 1. 使用 VS Code 调试器

创建 `.vscode/launch.json`：

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Next.js: debug server-side",
      "type": "node-terminal",
      "request": "launch",
      "command": "pnpm dev"
    },
    {
      "name": "Next.js: debug client-side",
      "type": "chrome",
      "request": "launch",
      "url": "http://localhost:3000"
    }
  ]
}
```

### 2. 查看数据库数据

```bash
# 打开 Prisma Studio
npx prisma studio
```

访问 http://localhost:5555

### 3. 查看 API 请求

在浏览器开发者工具的 Network 标签中查看请求和响应。

### 4. 日志调试

```typescript
// 开发环境日志
if (process.env.NODE_ENV === 'development') {
  console.log('Debug info:', data)
}

// 使用 logger
import { logger } from '@/lib/logger'
logger.info('User logged in', { userId })
logger.error('Payment failed', { error })
```

### 5. 测试 API

使用 curl 或 Postman：

```bash
# 注册
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"phone":"13800138000","password":"123456"}'

# 登录
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phone":"13800138000","password":"123456"}'

# 生成文案（需要 token）
curl -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -H "Cookie: token=<your-token>" \
  -d '{"contentType":"note","category":"beauty","topic":"夏日防晒"}'
```

---

## 常见问题

### 1. 数据库连接失败

**问题：** `Error: Can't reach database server`

**解决：**
- 检查 PostgreSQL 是否运行：`pg_ctl status`
- 检查 `DATABASE_URL` 配置是否正确
- 检查数据库是否已创建：`createdb xiaohongshu`

### 2. Prisma Client 未生成

**问题：** `Cannot find module '@prisma/client'`

**解决：**
```bash
npx prisma generate
```

### 3. 端口被占用

**问题：** `Port 3000 is already in use`

**解决：**
```bash
# 查找占用端口的进程
lsof -i :3000

# 杀死进程
kill -9 <PID>

# 或使用其他端口
PORT=3001 pnpm dev
```

### 4. AI API 调用失败

**问题：** `AI generation failed`

**解决：**
- 检查 API Key 是否正确
- 检查网络连接
- 检查 API 额度是否用完
- 使用代理时检查 `BASE_URL` 配置

### 5. 测试失败

**问题：** 测试运行失败

**解决：**
```bash
# 清除缓存
rm -rf node_modules/.vitest

# 重新安装依赖
pnpm install

# 检查测试数据库配置
# 确保 tests/setup.ts 中的数据库连接正确
```

### 6. 类型错误

**问题：** TypeScript 类型错误

**解决：**
```bash
# 重新生成 Prisma Client
npx prisma generate

# 检查 tsconfig.json 配置
# 重启 TypeScript 服务器（VS Code: Cmd+Shift+P -> Restart TS Server）
```

---

## 性能优化建议

### 1. 数据库查询优化

```typescript
// ❌ 不好：N+1 查询
const users = await prisma.user.findMany()
for (const user of users) {
  const orders = await prisma.order.findMany({ where: { userId: user.id } })
}

// ✅ 好：使用 include
const users = await prisma.user.findMany({
  include: { orders: true }
})
```

### 2. 缓存使用

```typescript
import { cache } from '@/lib/cache'

// 缓存热点数据
const config = await cache.get('points_config', async () => {
  return await prisma.settings.findUnique({ where: { key: 'points_config' } })
}, 60) // 缓存 60 秒
```

### 3. 图片优化

```tsx
import Image from 'next/image'

// 使用 Next.js Image 组件
<Image
  src="/avatar.jpg"
  alt="Avatar"
  width={100}
  height={100}
  priority // 首屏图片
/>
```

### 4. 代码分割

```tsx
import dynamic from 'next/dynamic'

// 动态导入大组件
const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <div>Loading...</div>
})
```

---

## 部署前检查清单

- [ ] 所有测试通过
- [ ] 代码已通过 lint 检查
- [ ] 环境变量已配置
- [ ] 数据库迁移已应用
- [ ] 生产环境 API Keys 已配置
- [ ] JWT_SECRET 已更换为强密码
- [ ] 管理员密码已更换
- [ ] 支付回调 URL 已配置
- [ ] 错误监控已配置（如 Sentry）
- [ ] 日志系统已配置
- [ ] 备份策略已制定

---

## 相关资源

- [Next.js 文档](https://nextjs.org/docs)
- [Prisma 文档](https://www.prisma.io/docs)
- [Tailwind CSS 文档](https://tailwindcss.com/docs)
- [Vitest 文档](https://vitest.dev/)
- [TypeScript 文档](https://www.typescriptlang.org/docs)

---

## 获取帮助

- 查看 [API 文档](./API.md)
- 查看 [架构文档](./ARCHITECTURE.md)
- 提交 Issue: https://github.com/your-repo/xiaohongshu/issues
- 联系开发团队

---

最后更新：2024-01-08
