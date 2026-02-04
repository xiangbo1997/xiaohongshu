# 测试文档

小红书爆款文案生成器 - 测试指南

## 目录

- [测试概述](#测试概述)
- [运行测试](#运行测试)
- [测试结构](#测试结构)
- [编写测试](#编写测试)
- [测试覆盖率](#测试覆盖率)
- [CI/CD 集成](#cicd-集成)

---

## 测试概述

项目使用 **Vitest** 作为测试框架，提供快速的单元测试和集成测试能力。

### 测试类型

| 类型 | 目录 | 说明 | 覆盖范围 |
|------|------|------|---------|
| 单元测试 | `tests/unit/` | 测试独立函数和模块 | lib/ 下的业务逻辑 |
| 集成测试 | `tests/integration/` | 测试模块间交互 | API 路由、数据库操作 |
| E2E 测试 | `tests/e2e/` | 测试完整用户流程 | 关键业务流程 |

### 测试原则

1. **快速**：单元测试应在毫秒级完成
2. **独立**：测试之间不应相互依赖
3. **可重复**：多次运行结果一致
4. **自文档化**：测试即文档，清晰表达意图
5. **覆盖关键路径**：优先测试核心业务逻辑

---

## 运行测试

### 基本命令

```bash
# 运行所有测试
pnpm test

# 监听模式（开发时推荐）
pnpm test:watch

# 生成覆盖率报告
pnpm test:coverage

# 运行测试 UI（可视化界面）
pnpm test:ui
```

### 运行特定测试

```bash
# 运行单个测试文件
pnpm test tests/unit/auth.test.ts

# 运行匹配模式的测试
pnpm test auth

# 运行特定测试用例
pnpm test -t "应该正确加密密码"
```

### 调试测试

```bash
# 显示详细输出
pnpm test --reporter=verbose

# 只运行失败的测试
pnpm test --reporter=verbose --run --bail

# 使用 VS Code 调试器
# 在测试文件中设置断点，按 F5 启动调试
```

---

## 测试结构

### 目录结构

```
tests/
├── unit/                    # 单元测试
│   ├── auth.test.ts        # 认证模块测试
│   ├── redemption.test.ts  # 兑换码模块测试
│   ├── payment.test.ts     # 支付模块测试
│   ├── points-config.test.ts # 点数配置测试
│   └── validations.test.ts # 数据验证测试
├── integration/            # 集成测试
│   ├── api/               # API 测试
│   └── database/          # 数据库测试
├── e2e/                   # E2E 测试
│   ├── user-flow.test.ts  # 用户流程测试
│   └── payment-flow.test.ts # 支付流程测试
├── fixtures/              # 测试数据
│   ├── users.json
│   └── orders.json
├── helpers.ts             # 测试辅助函数
└── setup.ts               # 测试环境设置
```

### 测试文件命名

- 单元测试：`<module>.test.ts`
- 集成测试：`<feature>.integration.test.ts`
- E2E 测试：`<flow>.e2e.test.ts`

---

## 编写测试

### 单元测试示例

```typescript
import { describe, it, expect } from 'vitest'
import { hashPassword, verifyPassword } from '@/lib/auth'

describe('认证模块 - 密码处理', () => {
  it('应该正确加密密码', async () => {
    const password = 'test123456'
    const hash = await hashPassword(password)

    expect(hash).toBeTruthy()
    expect(hash).not.toBe(password)
    expect(hash.length).toBeGreaterThan(50)
  })

  it('应该正确验证密码', async () => {
    const password = 'test123456'
    const hash = await hashPassword(password)

    const isValid = await verifyPassword(password, hash)
    expect(isValid).toBe(true)
  })

  it('应该拒绝错误的密码', async () => {
    const password = 'test123456'
    const wrongPassword = 'wrong123456'
    const hash = await hashPassword(password)

    const isValid = await verifyPassword(wrongPassword, hash)
    expect(isValid).toBe(false)
  })
})
```

### 使用 Mock

```typescript
import { vi } from 'vitest'

// Mock 函数
const mockFn = vi.fn()
mockFn.mockReturnValue('mocked value')

// Mock 模块
vi.mock('@/lib/db', () => ({
  prisma: {
    user: {
      findUnique: vi.fn().mockResolvedValue({ id: '1', phone: '13800138000' })
    }
  }
}))

// Mock 环境变量
vi.stubEnv('JWT_SECRET', 'test-secret')
```

### 测试异步代码

```typescript
it('应该正确处理异步操作', async () => {
  const result = await asyncFunction()
  expect(result).toBe('expected value')
})

it('应该正确处理 Promise 拒绝', async () => {
  await expect(failingFunction()).rejects.toThrow('Error message')
})
```

### 测试边界情况

```typescript
describe('边界情况测试', () => {
  it('应该处理空字符串', () => {
    expect(isValidCodeFormat('')).toBe(false)
  })

  it('应该处理 null 值', () => {
    expect(() => processValue(null)).not.toThrow()
  })

  it('应该处理超大数值', () => {
    const result = calculatePoints(Number.MAX_SAFE_INTEGER)
    expect(result).toBeLessThanOrEqual(Number.MAX_SAFE_INTEGER)
  })
})
```

---

## 测试覆盖率

### 查看覆盖率

```bash
# 生成覆盖率报告
pnpm test:coverage

# 打开 HTML 报告
open coverage/index.html
```

### 覆盖率目标

| 类型 | 目标 | 当前 |
|------|------|------|
| 语句覆盖率 | ≥ 80% | - |
| 分支覆盖率 | ≥ 75% | - |
| 函数覆盖率 | ≥ 80% | - |
| 行覆盖率 | ≥ 80% | - |

### 覆盖率配置

在 `vitest.config.ts` 中配置：

```typescript
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.d.ts',
        '**/*.config.*',
        'src/generated/**',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },
  },
})
```

---

## CI/CD 集成

### GitHub Actions 示例

创建 `.github/workflows/test.yml`：

```yaml
name: Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: xiaohongshu_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8

      - name: Install dependencies
        run: pnpm install

      - name: Run database migrations
        run: pnpm db:migrate
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/xiaohongshu_test

      - name: Run tests
        run: pnpm test:coverage
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/xiaohongshu_test
          JWT_SECRET: test-jwt-secret

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json
```

---

## 最佳实践

### 1. 测试命名

```typescript
// ✅ 好：清晰描述测试意图
it('应该在密码错误时返回 false', () => {})

// ❌ 不好：模糊不清
it('测试密码验证', () => {})
```

### 2. 测试组织

```typescript
// ✅ 好：使用 describe 分组
describe('用户认证', () => {
  describe('登录', () => {
    it('应该接受有效凭证', () => {})
    it('应该拒绝无效凭证', () => {})
  })

  describe('注册', () => {
    it('应该创建新用户', () => {})
    it('应该拒绝重复手机号', () => {})
  })
})
```

### 3. 断言清晰

```typescript
// ✅ 好：具体的断言
expect(user.memberType).toBe('VIP')
expect(user.points).toBeGreaterThan(0)

// ❌ 不好：模糊的断言
expect(user).toBeTruthy()
```

### 4. 避免测试实现细节

```typescript
// ✅ 好：测试行为
it('应该返回用户信息', async () => {
  const user = await getUser('123')
  expect(user.id).toBe('123')
})

// ❌ 不好：测试实现
it('应该调用 prisma.user.findUnique', async () => {
  await getUser('123')
  expect(prisma.user.findUnique).toHaveBeenCalled()
})
```

### 5. 使用测试辅助函数

```typescript
// 创建测试数据
import { createMockUser, createMockVipUser } from '../helpers'

it('应该计算 VIP 用户的可用点数', () => {
  const user = createMockVipUser({ points: 10 })
  const available = getAvailablePoints(user)
  expect(available).toBe(23) // 13 (daily) + 10 (purchased)
})
```

---

## 常见问题

### 1. 测试运行缓慢

**解决方案：**
- 使用 `--no-coverage` 跳过覆盖率收集
- 使用 `--run` 禁用监听模式
- 并行运行测试（Vitest 默认启用）

### 2. 数据库测试冲突

**解决方案：**
- 使用独立的测试数据库
- 每个测试后清理数据
- 使用事务回滚

### 3. Mock 不生效

**解决方案：**
- 确保 Mock 在导入模块之前
- 使用 `vi.clearAllMocks()` 清理 Mock
- 检查 Mock 路径是否正确

---

## 相关资源

- [Vitest 文档](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)
- [Jest Mock 指南](https://jestjs.io/docs/mock-functions)

---

最后更新：2024-01-08
