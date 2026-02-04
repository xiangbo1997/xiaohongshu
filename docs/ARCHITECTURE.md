# 架构文档

小红书爆款文案生成器 - 系统架构设计

## 目录

- [系统概述](#系统概述)
- [技术架构](#技术架构)
- [数据库设计](#数据库设计)
- [核心模块](#核心模块)
- [安全设计](#安全设计)
- [性能优化](#性能优化)
- [扩展性设计](#扩展性设计)

---

## 系统概述

### 项目定位

小红书爆款文案生成器是一个基于 AI 的内容创作辅助工具，帮助用户快速生成高质量的小红书文案。

### 核心功能

1. **AI 文案生成**：支持多种 AI 模型，生成种草笔记、教程攻略等多种类型文案
2. **用户系统**：注册登录、会员管理、点数系统
3. **支付系统**：支持支付宝、微信支付，VIP 会员和点数卡购买
4. **兑换码系统**：支持批量生成、多次使用、过期管理
5. **管理后台**：用户管理、数据统计、系统配置

### 技术选型理由

| 技术 | 选型理由 |
|------|---------|
| Next.js 16 | 全栈框架，SSR/SSG 支持，API Routes，优秀的开发体验 |
| TypeScript | 类型安全，提高代码质量和可维护性 |
| Prisma 7 | 现代化 ORM，类型安全，迁移管理方便 |
| PostgreSQL | 关系型数据库，ACID 保证，丰富的数据类型 |
| Redis | 高性能缓存，支持多种数据结构 |
| Tailwind CSS | 原子化 CSS，快速开发，易于维护 |
| Vitest | 快速的单元测试框架，与 Vite 生态集成 |

---

## 技术架构

### 整体架构图

```
┌─────────────────────────────────────────────────────────────┐
│                         用户层                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Web 浏览器│  │ 移动浏览器│  │  管理后台 │  │  API 客户端│   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      应用层（Next.js）                        │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                    App Router                         │   │
│  │  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐    │   │
│  │  │ 页面路由│  │ API路由 │  │ 中间件  │  │ 服务端组件│    │   │
│  │  └────────┘  └────────┘  └────────┘  └────────┘    │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                   业务逻辑层（lib/）                   │   │
│  │  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐    │   │
│  │  │ 认证服务│  │ AI服务  │  │ 支付服务│  │ 兑换码服务│    │   │
│  │  └────────┘  └────────┘  └────────┘  └────────┘    │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      数据层                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  PostgreSQL  │  │    Redis     │  │  文件存储     │     │
│  │  (主数据库)   │  │   (缓存)     │  │  (静态资源)   │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      外部服务                                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ OpenAI   │  │ Claude   │  │ 支付宝    │  │ 微信支付  │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 请求流程

```
用户请求
  │
  ▼
Next.js 中间件（认证、CSRF、频率限制）
  │
  ▼
API Route Handler
  │
  ├─► 数据验证（Zod Schema）
  │
  ├─► 业务逻辑处理（lib/）
  │   │
  │   ├─► 缓存查询（Redis）
  │   │
  │   ├─► 数据库操作（Prisma）
  │   │
  │   └─► 外部服务调用（AI/支付）
  │
  └─► 响应返回（JSON）
```

---

## 数据库设计

### ER 图

```
┌──────────────┐         ┌──────────────┐
│     User     │◄────────│  Generation  │
│              │ 1     * │              │
│ - id         │         │ - id         │
│ - phone      │         │ - userId     │
│ - email      │         │ - topic      │
│ - password   │         │ - content    │
│ - memberType │         │ - createdAt  │
│ - points     │         └──────────────┘
│ - dailyFree  │
└──────────────┘
       │ 1
       │
       │ *
┌──────────────┐         ┌──────────────┐
│    Order     │         │  Favorite    │
│              │         │              │
│ - id         │         │ - id         │
│ - userId     │         │ - userId     │
│ - productType│         │ - generationId│
│ - amount     │         └──────────────┘
│ - status     │
└──────────────┘
       │ 1
       │
       │ *
┌──────────────┐
│ PointRecord  │
│              │
│ - id         │
│ - userId     │
│ - type       │
│ - amount     │
│ - balance    │
└──────────────┘

┌──────────────┐         ┌──────────────┐
│RedemptionCode│◄────────│RedemptionRec │
│              │ 1     * │              │
│ - id         │         │ - id         │
│ - code       │         │ - codeId     │
│ - rewardType │         │ - userId     │
│ - status     │         │ - redeemedAt │
└──────────────┘         └──────────────┘
```

### 核心表设计

#### User（用户表）

```sql
CREATE TABLE "User" (
  id              TEXT PRIMARY KEY,
  phone           TEXT UNIQUE,
  email           TEXT UNIQUE,
  password        TEXT NOT NULL,
  nickname        TEXT,
  avatar          TEXT,
  
  -- 会员信息
  memberType      TEXT NOT NULL DEFAULT 'FREE',
  memberExpire    TIMESTAMP,
  
  -- 点数系统
  points          INTEGER NOT NULL DEFAULT 0,
  dailyFreeUsed   INTEGER NOT NULL DEFAULT 0,
  totalUsage      INTEGER NOT NULL DEFAULT 0,
  lastUsageDate   TIMESTAMP NOT NULL DEFAULT NOW(),
  
  createdAt       TIMESTAMP NOT NULL DEFAULT NOW(),
  updatedAt       TIMESTAMP NOT NULL
);

CREATE INDEX idx_user_phone ON "User"(phone);
CREATE INDEX idx_user_email ON "User"(email);
CREATE INDEX idx_user_memberType ON "User"(memberType);
```

**设计要点：**
- 支持手机号和邮箱双登录方式
- 点数系统：`points`（购买/兑换的永久点数）+ `dailyFreeUsed`（每日免费额度）
- 会员系统：`memberType` + `memberExpire` 控制会员状态
- 使用 `lastUsageDate` 实现每日免费额度重置

#### Generation（生成记录表）

```sql
CREATE TABLE "Generation" (
  id            TEXT PRIMARY KEY,
  userId        TEXT NOT NULL REFERENCES "User"(id),
  
  -- 输入参数
  contentType   TEXT NOT NULL,
  category      TEXT,
  topic         TEXT NOT NULL,
  keywords      TEXT,
  style         TEXT,
  aiProvider    TEXT NOT NULL,
  
  -- 生成结果
  title         TEXT NOT NULL,
  content       TEXT NOT NULL,
  tags          TEXT[],
  coverText     TEXT,
  
  createdAt     TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_generation_userId ON "Generation"(userId);
CREATE INDEX idx_generation_createdAt ON "Generation"(createdAt DESC);
CREATE INDEX idx_generation_contentType ON "Generation"(contentType);
```

**设计要点：**
- 记录完整的输入参数，便于分析和复现
- 使用数组类型存储标签（PostgreSQL 特性）
- 按用户和时间建立索引，优化查询性能

#### Order（订单表）

```sql
CREATE TABLE "Order" (
  id            TEXT PRIMARY KEY,
  orderNo       TEXT UNIQUE NOT NULL,
  userId        TEXT NOT NULL REFERENCES "User"(id),
  
  productType   TEXT NOT NULL,
  productName   TEXT,
  quantity      INTEGER NOT NULL DEFAULT 1,
  amount        INTEGER NOT NULL,
  status        TEXT NOT NULL DEFAULT 'PENDING',
  
  -- 支付信息
  payType       TEXT,
  tradeNo       TEXT,
  paidAt        TIMESTAMP,
  
  createdAt     TIMESTAMP NOT NULL DEFAULT NOW(),
  updatedAt     TIMESTAMP NOT NULL
);

CREATE INDEX idx_order_userId ON "Order"(userId);
CREATE INDEX idx_order_orderNo ON "Order"(orderNo);
CREATE INDEX idx_order_status ON "Order"(status);
CREATE INDEX idx_order_createdAt ON "Order"(createdAt DESC);
```

**设计要点：**
- `orderNo` 作为业务订单号，全局唯一
- `amount` 使用分为单位，避免浮点数精度问题
- 记录支付方式和第三方交易号，便于对账

#### RedemptionCode（兑换码表）

```sql
CREATE TABLE "RedemptionCode" (
  id            TEXT PRIMARY KEY,
  code          TEXT UNIQUE NOT NULL,      -- 加密存储
  codeDisplay   TEXT UNIQUE NOT NULL,      -- 明文显示
  codeCategory  TEXT NOT NULL DEFAULT 'VIP',
  rewardType    TEXT NOT NULL,
  rewardValue   INTEGER NOT NULL,
  status        TEXT NOT NULL DEFAULT 'ACTIVE',
  maxUses       INTEGER NOT NULL DEFAULT 1,
  usedCount     INTEGER NOT NULL DEFAULT 0,
  expireAt      TIMESTAMP,
  note          TEXT,
  createdBy     TEXT,
  createdAt     TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_redemption_code ON "RedemptionCode"(code);
CREATE INDEX idx_redemption_codeDisplay ON "RedemptionCode"(codeDisplay);
CREATE INDEX idx_redemption_status ON "RedemptionCode"(status);
CREATE INDEX idx_redemption_category ON "RedemptionCode"(codeCategory);
```

**设计要点：**
- 双码存储：`code`（加密，内部索引）+ `codeDisplay`（明文，用户可见）
- 支持多次使用：`maxUses` + `usedCount`
- 支持过期时间和状态管理
- 使用 HMAC 签名防止伪造

---

## 核心模块

### 1. 认证模块（auth.ts）

**职责：**
- 用户注册登录
- JWT Token 生成和验证
- 密码加密和验证
- VIP 状态检查
- 点数计算和消费

**关键函数：**

```typescript
// 密码加密
hashPassword(password: string): Promise<string>

// 密码验证
verifyPassword(password: string, hash: string): Promise<boolean>

// 生成 JWT
signToken(userId: string): string

// 验证 JWT
verifyToken(token: string): { userId: string } | null

// 检查 VIP 状态
isValidVip(user: User): boolean

// 消费点数
consumePoints(userId: string, amount: number): Promise<boolean>

// 增加点数
addPoints(userId: string, amount: number, type: PointType): Promise<void>
```

**安全措施：**
- 使用 bcrypt 加密密码（10 轮）
- JWT Token 有效期 7 天
- httpOnly Cookie 存储 Token
- 点数消费使用数据库事务保证一致性

### 2. AI 服务模块（ai.ts）

**职责：**
- 多 AI 模型集成（OpenAI、Claude、DeepSeek、智谱）
- Prompt 模板管理
- 文案生成和格式化
- 错误处理和重试

**架构设计：**

```typescript
interface AIProvider {
  name: string
  generate(params: GenerateParams): Promise<GenerateResult>
}

class OpenAIProvider implements AIProvider {
  // OpenAI 实现
}

class ClaudeProvider implements AIProvider {
  // Claude 实现
}

// 工厂模式选择 Provider
function getAIProvider(provider: string): AIProvider {
  switch (provider) {
    case 'openai': return new OpenAIProvider()
    case 'anthropic': return new ClaudeProvider()
    // ...
  }
}
```

**容错机制：**
- 超时重试（最多 3 次）
- 降级策略（主模型失败时使用备用模型）
- 错误日志记录

### 3. 支付模块（payment.ts）

**职责：**
- 订单生成和管理
- 支付宝/微信支付集成
- 支付回调处理
- VIP 到期时间计算

**支付流程：**

```
1. 用户选择产品 → 创建订单（PENDING）
2. 生成支付链接/二维码
3. 用户完成支付
4. 支付平台回调 → 验签
5. 更新订单状态（PAID）
6. 发放权益（VIP/点数）
7. 记录点数变动
```

**安全措施：**
- RSA 签名验证（支付宝）
- HMAC 签名验证（微信）
- 幂等性处理（防止重复回调）
- 金额校验（防止篡改）

### 4. 兑换码模块（redemption.ts）

**职责：**
- 兑换码生成（Base32 + HMAC）
- 兑换码验证
- 兑换记录管理

**安全设计：**

```
兑换码结构：
┌─────────────┬──────────┐
│ 随机数(12字节)│ 签名(4字节)│
└─────────────┴──────────┘
       │            │
       ▼            ▼
   Base32编码   HMAC-SHA256
       │            │
       └────────────┘
            │
            ▼
    XXXX-XXXX-XXXX-XXXX-XXXXX-XXXXX
```

**防护机制：**
- 96 位随机数（暴力破解不可行）
- HMAC 签名（防止伪造）
- 时序安全比较（防止时序攻击）
- 数据库唯一约束（防止重复兑换）

### 5. 点数配置模块（points-config.ts）

**职责：**
- 点数规则配置
- VIP 特权管理
- 产品价格配置

**配置策略：**

```typescript
// 数据库配置（可动态调整）
Settings {
  key: 'points_config'
  value: {
    dailyFreePoints: { free: 3, vip: 13 },
    generation: { basePointsPerVersion: 1 }
  }
}

// 代码配置（默认值）
const DAILY_FREE_POINTS = { FREE: 3, VIP: 13 }
const BASE_POINTS_PER_GENERATION = 1
```

**缓存策略：**
- 内存缓存 60 秒
- 配置更新时清除缓存
- 降级到默认配置

---

## 安全设计

### 1. 认证安全

| 措施 | 实现 |
|------|------|
| 密码加密 | bcrypt (10 轮) |
| Token 存储 | httpOnly Cookie |
| Token 有效期 | 7 天 |
| CSRF 防护 | Double Submit Cookie |
| 频率限制 | Redis 计数器 |

### 2. 数据安全

| 措施 | 实现 |
|------|------|
| SQL 注入防护 | Prisma ORM 参数化查询 |
| XSS 防护 | React 自动转义 + CSP 头 |
| 敏感数据加密 | AES-256-GCM |
| 数据库备份 | 每日自动备份 |
| 审计日志 | 记录关键操作 |

### 3. 支付安全

| 措施 | 实现 |
|------|------|
| 签名验证 | RSA/HMAC |
| 金额校验 | 服务端验证 |
| 幂等性 | 订单号唯一 |
| 超时处理 | 15 分钟未支付自动关闭 |
| 异常监控 | 支付失败告警 |

### 4. API 安全

| 措施 | 实现 |
|------|------|
| 认证 | JWT Token |
| 授权 | 基于角色的访问控制 |
| 频率限制 | 滑动窗口算法 |
| 输入验证 | Zod Schema |
| 错误处理 | 统一错误响应 |

---

## 性能优化

### 1. 数据库优化

**索引策略：**
```sql
-- 高频查询字段
CREATE INDEX idx_user_phone ON "User"(phone);
CREATE INDEX idx_generation_userId_createdAt ON "Generation"(userId, createdAt DESC);

-- 复合索引
CREATE INDEX idx_order_userId_status ON "Order"(userId, status);
```

**查询优化：**
```typescript
// ❌ N+1 查询
const users = await prisma.user.findMany()
for (const user of users) {
  const orders = await prisma.order.findMany({ where: { userId: user.id } })
}

// ✅ 使用 include
const users = await prisma.user.findMany({
  include: { orders: true }
})

// ✅ 使用 select 减少数据传输
const users = await prisma.user.findMany({
  select: { id: true, phone: true, memberType: true }
})
```

### 2. 缓存策略

**多层缓存：**

```
┌─────────────┐
│  浏览器缓存  │ (静态资源)
└─────────────┘
       │
       ▼
┌─────────────┐
│  CDN 缓存   │ (图片、CSS、JS)
└─────────────┘
       │
       ▼
┌─────────────┐
│  Redis 缓存 │ (热点数据、会话)
└─────────────┘
       │
       ▼
┌─────────────┐
│  数据库     │
└─────────────┘
```

**缓存实现：**

```typescript
// 点数配置缓存
const config = await cache.get('points_config', async () => {
  return await prisma.settings.findUnique({ where: { key: 'points_config' } })
}, 60) // 60 秒

// 用户会话缓存
const user = await cache.get(`user:${userId}`, async () => {
  return await prisma.user.findUnique({ where: { id: userId } })
}, 300) // 5 分钟
```

### 3. 前端优化

**代码分割：**
```typescript
// 动态导入
const AdminPanel = dynamic(() => import('./AdminPanel'), {
  loading: () => <Loading />,
  ssr: false
})
```

**图片优化：**
```tsx
<Image
  src="/avatar.jpg"
  alt="Avatar"
  width={100}
  height={100}
  loading="lazy"
  placeholder="blur"
/>
```

### 4. API 优化

**批量操作：**
```typescript
// ❌ 多次请求
for (const id of ids) {
  await fetch(`/api/users/${id}`)
}

// ✅ 批量请求
await fetch('/api/users/batch', {
  method: 'POST',
  body: JSON.stringify({ ids })
})
```

**响应压缩：**
```typescript
// Next.js 自动启用 gzip/brotli 压缩
// 配置 next.config.ts
export default {
  compress: true
}
```

---

## 扩展性设计

### 1. 水平扩展

**无状态设计：**
- API 服务无状态，可水平扩展
- Session 存储在 Redis
- 文件存储使用对象存储（OSS）

**负载均衡：**
```
         ┌─────────────┐
         │ Load Balancer│
         └─────────────┘
                │
        ┌───────┼───────┐
        │       │       │
        ▼       ▼       ▼
    ┌─────┐ ┌─────┐ ┌─────┐
    │App 1│ │App 2│ │App 3│
    └─────┘ └─────┘ └─────┘
        │       │       │
        └───────┼───────┘
                │
                ▼
        ┌─────────────┐
        │  PostgreSQL │
        │  (主从复制)  │
        └─────────────┘
```

### 2. 数据库扩展

**读写分离：**
```typescript
// 写操作 → 主库
await prisma.$executeRaw`INSERT INTO ...`

// 读操作 → 从库
await prisma.$queryRaw`SELECT * FROM ...`
```

**分库分表：**
- 按用户 ID 哈希分表
- 按时间范围分表（历史数据归档）

### 3. 微服务化

**服务拆分方向：**
```
┌─────────────┐
│  API Gateway │
└─────────────┘
       │
   ┌───┴───┬───────┬───────┐
   │       │       │       │
   ▼       ▼       ▼       ▼
┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐
│用户  │ │生成  │ │支付  │ │管理  │
│服务  │ │服务  │ │服务  │ │服务  │
└─────┘ └─────┘ └─────┘ └─────┘
```

### 4. 监控和告警

**监控指标：**
- 请求量、响应时间、错误率
- 数据库连接数、慢查询
- 缓存命中率
- 服务器 CPU、内存、磁盘

**告警策略：**
- 错误率 > 1% → 告警
- 响应时间 > 3s → 告警
- 数据库连接数 > 80% → 告警
- 支付失败 → 立即告警

---

## 部署架构

### 生产环境

```
┌─────────────────────────────────────────┐
│              Cloudflare CDN              │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│              Nginx (反向代理)             │
└─────────────────────────────────────────┘
                    │
        ┌───────────┼───────────┐
        │                       │
        ▼                       ▼
┌─────────────┐         ┌─────────────┐
│  Next.js    │         │  Next.js    │
│  (PM2)      │         │  (PM2)      │
└─────────────┘         └─────────────┘
        │                       │
        └───────────┬───────────┘
                    │
        ┌───────────┼───────────┐
        │           │           │
        ▼           ▼           ▼
┌──────────┐ ┌──────────┐ ┌──────────┐
│PostgreSQL│ │  Redis   │ │   OSS    │
│ (主从)    │ │ (哨兵)   │ │ (文件)   │
└──────────┘ └──────────┘ └──────────┘
```

### 容器化部署

```yaml
# docker-compose.yml
version: '3.8'
services:
  app:
    image: xiaohongshu:latest
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://...
      - REDIS_URL=redis://...
    depends_on:
      - postgres
      - redis
  
  postgres:
    image: postgres:14
    volumes:
      - postgres_data:/var/lib/postgresql/data
  
  redis:
    image: redis:6
    volumes:
      - redis_data:/data
```

---

## 技术债务和改进方向

### 当前技术债务

1. **测试覆盖率不足**：需要补充集成测试和 E2E 测试
2. **监控不完善**：缺少完整的 APM 和错误追踪
3. **文档待完善**：部分模块缺少详细文档

### 未来改进方向

1. **性能优化**
   - 实现 GraphQL API（减少过度获取）
   - 引入 Server Components（减少客户端 JS）
   - 实现增量静态生成（ISR）

2. **功能增强**
   - 支持更多 AI 模型
   - 实现文案模板市场
   - 添加协作功能

3. **架构升级**
   - 微服务化拆分
   - 引入消息队列（异步任务）
   - 实现分布式追踪

---

## 相关文档

- [API 文档](./API.md)
- [开发文档](./DEVELOPMENT.md)
- [部署文档](../DEPLOY.md)

---

最后更新：2024-01-08
