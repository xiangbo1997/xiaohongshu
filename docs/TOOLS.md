# 开发工具使用指南

本文档介绍项目中提供的开发辅助工具和脚本。

## 目录

- [快速开始](#快速开始)
- [环境初始化](#环境初始化)
- [数据库工具](#数据库工具)
- [开发工具](#开发工具)
- [测试工具](#测试工具)
- [代码质量工具](#代码质量工具)

---

## 快速开始

### 首次设置

```bash
# 一键初始化开发环境
pnpm setup

# 或手动执行
./scripts/init-dev.sh
```

这将自动完成：
- ✅ 检查依赖（Node.js、pnpm、PostgreSQL）
- ✅ 安装项目依赖
- ✅ 配置环境变量
- ✅ 创建数据库
- ✅ 运行数据库迁移
- ✅ 填充测试数据

### 日常开发

```bash
# 启动开发服务器
pnpm dev

# 运行测试（监听模式）
pnpm test:watch

# 查看数据库
pnpm db:studio
```

---

## 环境初始化

### init-dev.sh

**功能**：一键初始化开发环境

**使用方式**：

```bash
# 方式 1：使用 npm script
pnpm setup

# 方式 2：直接执行脚本
./scripts/init-dev.sh
```

**执行步骤**：

1. **依赖检查**
   - Node.js >= 18.0.0
   - pnpm >= 8.0.0
   - PostgreSQL >= 14.0

2. **安装依赖**
   ```bash
   pnpm install
   ```

3. **环境变量配置**
   - 复制 `.env.example` 为 `.env`
   - 提示填写必要配置

4. **数据库初始化**
   - 创建数据库（如不存在）
   - 运行 Prisma 迁移
   - 生成 Prisma Client

5. **填充测试数据**
   - 创建测试用户
   - 生成示例数据

**注意事项**：
- 首次运行需要 PostgreSQL 服务已启动
- 确保 `.env` 中的数据库连接信息正确
- 脚本会提示每个步骤，可选择跳过

---

## 数据库工具

### 数据库迁移

```bash
# 创建新迁移
pnpm db:migrate

# 应用迁移（生产环境）
npx prisma migrate deploy

# 重置数据库（谨慎使用）
pnpm db:reset
```

### 数据库管理

```bash
# 打开 Prisma Studio（可视化管理）
pnpm db:studio

# 生成 Prisma Client
pnpm db:generate
```

### 数据库备份与恢复

**脚本**：`scripts/db-backup.sh`

**功能**：
- 备份数据库到 `backups/` 目录
- 恢复数据库
- 列出所有备份
- 清理旧备份

**使用方式**：

```bash
# 备份数据库
pnpm db:backup
# 或
./scripts/db-backup.sh backup

# 恢复数据库
pnpm db:restore
# 或
./scripts/db-backup.sh restore

# 列出所有备份
./scripts/db-backup.sh list

# 清理 30 天前的备份
./scripts/db-backup.sh clean
```

**备份文件格式**：
```
backups/xiaohongshu_20240108_120000.sql.gz
```

**恢复流程**：
1. 脚本列出所有可用备份
2. 选择要恢复的备份文件
3. 确认恢复操作
4. 自动解压并导入数据库

**注意事项**：
- 备份文件使用 gzip 压缩
- 恢复操作会覆盖当前数据库
- 建议定期备份生产数据

### 数据库种子数据

**脚本**：`prisma/seed.ts`

**功能**：填充测试数据

**使用方式**：

```bash
pnpm db:seed
```

**生成的测试数据**：

| 类型 | 数量 | 说明 |
|------|------|------|
| 用户 | 3 | 免费用户、VIP 用户、有点数用户 |
| 生成记录 | 10 | 各种类型的文案生成记录 |
| 订单 | 5 | 不同状态的支付订单 |
| 兑换码 | 10 | VIP 和点数兑换码 |

**测试账号**：

| 手机号 | 密码 | 类型 | 说明 |
|--------|------|------|------|
| 13800138000 | 123456 | 免费用户 | 3 次/天免费额度 |
| 13800138001 | 123456 | VIP 用户 | 30 天会员，13 次/天 |
| 13800138002 | 123456 | 点数用户 | 50 点数 |

---

## 开发工具

### dev-tools.ts

**功能**：开发过程中的常用操作工具

**使用方式**：

```bash
# 查看所有命令
pnpm tools

# 或直接执行命令
pnpm tools <command> [options]
```

### 可用命令

#### 1. 创建管理员用户

```bash
pnpm tools:admin
# 或
pnpm tools create-admin
```

**交互式输入**：
- 手机号
- 密码
- 昵称（可选）

**用途**：创建具有管理员权限的用户

---

#### 2. 创建测试用户

```bash
pnpm tools:user
# 或
pnpm tools create-test-user
```

**交互式输入**：
- 手机号
- 密码
- 昵称（可选）
- 会员类型（FREE/VIP）
- VIP 天数（如选择 VIP）
- 初始点数

**用途**：快速创建各种类型的测试用户

---

#### 3. 生成兑换码

```bash
pnpm tools:codes
# 或
pnpm tools generate-codes [数量]

# 示例
pnpm tools generate-codes 50
```

**交互式输入**：
- 数量（1-100）
- 类别（VIP/POINTS）
- 奖励类型（VIP_1/VIP_7/VIP_30/POINTS_10/POINTS_50 等）
- 自定义奖励值（如选择 CUSTOM）
- 最大使用次数
- 过期时间（可选）
- 备注（可选）

**输出**：
- 生成的兑换码列表
- 保存到 `codes-{timestamp}.txt`

**用途**：批量生成兑换码用于营销活动

---

#### 4. 授予 VIP

```bash
pnpm tools grant-vip <userId> <days>

# 示例
pnpm tools grant-vip clxxx 30
```

**参数**：
- `userId`：用户 ID
- `days`：VIP 天数

**用途**：手动给用户开通 VIP

---

#### 5. 授予点数

```bash
pnpm tools grant-points <userId> <points>

# 示例
pnpm tools grant-points clxxx 100
```

**参数**：
- `userId`：用户 ID
- `points`：点数数量

**用途**：手动给用户充值点数

---

#### 6. 查看统计

```bash
pnpm tools:stats
# 或
pnpm tools stats
```

**显示信息**：
- 用户统计（总数、免费、VIP、今日新增）
- 生成统计（总数、今日、本月）
- 订单统计（总数、总金额、本月）
- 兑换码统计（总数、已使用、本月）

**用途**：快速了解系统运营数据

---

#### 7. 清理测试数据

```bash
pnpm tools clean-test-data
```

**清理内容**：
- 测试用户（手机号以 138 开头）
- 相关的生成记录
- 相关的订单
- 相关的兑换记录

**注意**：
- ⚠️ 此操作不可逆
- 仅清理测试数据，不影响真实用户

**用途**：定期清理开发/测试环境的垃圾数据

---

## 测试工具

### 运行测试

```bash
# 运行所有测试
pnpm test

# 监听模式（推荐开发时使用）
pnpm test:watch

# 生成覆盖率报告
pnpm test:coverage

# 测试 UI（可视化界面）
pnpm test:ui

# 仅运行集成测试
pnpm test:integration

# 仅运行 E2E 测试
pnpm test:e2e
```

### 测试覆盖率

运行 `pnpm test:coverage` 后，查看报告：

```bash
# 在浏览器中打开 HTML 报告
open coverage/index.html
```

**覆盖率目标**：
- 核心业务逻辑：≥ 90%
- API 路由：≥ 80%
- 工具函数：≥ 95%

### 测试文件结构

```
tests/
├── unit/              # 单元测试
│   ├── auth.test.ts
│   ├── redemption.test.ts
│   ├── payment.test.ts
│   ├── points-config.test.ts
│   └── validations.test.ts
├── integration/       # 集成测试
│   └── auth.integration.test.ts
├── e2e/              # E2E 测试
│   └── user-flow.e2e.test.ts
├── fixtures/         # 测试数据
├── helpers.ts        # 测试辅助函数
└── setup.ts          # 测试环境设置
```

---

## 代码质量工具

### pre-commit.sh

**功能**：提交前的代码质量检查

**使用方式**：

```bash
# 手动运行
pnpm precommit
# 或
./scripts/pre-commit.sh

# 配置为 Git Hook（推荐）
echo "#!/bin/sh\n./scripts/pre-commit.sh" > .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

**检查项目**：

1. **TypeScript 类型检查**
   ```bash
   tsc --noEmit
   ```

2. **ESLint 代码规范**
   ```bash
   pnpm lint
   ```

3. **运行测试**
   ```bash
   pnpm test
   ```

4. **敏感信息检测**
   - 检查是否包含 API Key
   - 检查是否包含密码
   - 检查是否包含私钥

5. **依赖安全审计**
   ```bash
   pnpm audit
   ```

**失败处理**：
- 任何检查失败都会阻止提交
- 修复问题后重新提交

**跳过检查**（不推荐）：
```bash
git commit --no-verify
```

---

## 常见问题

### 1. 脚本权限问题

**问题**：`Permission denied`

**解决**：
```bash
chmod +x scripts/*.sh
```

---

### 2. 数据库连接失败

**问题**：`Can't reach database server`

**解决**：
1. 检查 PostgreSQL 是否运行
   ```bash
   # macOS
   brew services list

   # Linux
   systemctl status postgresql
   ```

2. 检查 `.env` 中的 `DATABASE_URL`

3. 测试连接
   ```bash
   psql -U postgres -h localhost
   ```

---

### 3. 端口被占用

**问题**：`Port 3000 is already in use`

**解决**：
```bash
# 查找占用端口的进程
lsof -i :3000

# 杀死进程
kill -9 <PID>

# 或使用其他端口
PORT=3001 pnpm dev
```

---

### 4. Prisma Client 未生成

**问题**：`Cannot find module '@prisma/client'`

**解决**：
```bash
pnpm db:generate
```

---

### 5. 测试失败

**问题**：测试运行失败

**解决**：
```bash
# 清除缓存
rm -rf node_modules/.vitest

# 重新安装依赖
pnpm install

# 检查测试数据库配置
# 确保 tests/setup.ts 中的数据库连接正确
```

---

## 最佳实践

### 开发流程

1. **启动开发**
   ```bash
   pnpm dev
   pnpm test:watch  # 另一个终端
   ```

2. **编写代码**
   - 遵循项目代码规范
   - 同步编写测试

3. **提交前检查**
   ```bash
   pnpm precommit
   ```

4. **提交代码**
   ```bash
   git add .
   git commit -m "feat: 添加新功能"
   ```

### 数据库管理

1. **定期备份**
   ```bash
   # 每天备份一次
   pnpm db:backup
   ```

2. **迁移管理**
   ```bash
   # 开发环境
   pnpm db:migrate

   # 生产环境
   npx prisma migrate deploy
   ```

3. **数据清理**
   ```bash
   # 定期清理测试数据
   pnpm tools clean-test-data
   ```

### 测试策略

1. **单元测试**：覆盖核心业务逻辑
2. **集成测试**：测试 API 端点
3. **E2E 测试**：测试关键用户流程
4. **持续集成**：GitHub Actions 自动运行

---

## 工具清单

| 工具 | 命令 | 用途 |
|------|------|------|
| 环境初始化 | `pnpm setup` | 一键设置开发环境 |
| 数据库备份 | `pnpm db:backup` | 备份数据库 |
| 数据库恢复 | `pnpm db:restore` | 恢复数据库 |
| 数据库种子 | `pnpm db:seed` | 填充测试数据 |
| 创建管理员 | `pnpm tools:admin` | 创建管理员用户 |
| 创建测试用户 | `pnpm tools:user` | 创建测试用户 |
| 生成兑换码 | `pnpm tools:codes` | 批量生成兑换码 |
| 查看统计 | `pnpm tools:stats` | 查看系统统计 |
| 清理测试数据 | `pnpm tools clean-test-data` | 清理测试数据 |
| 代码检查 | `pnpm precommit` | 提交前质量检查 |
| 运行测试 | `pnpm test` | 运行所有测试 |
| 测试覆盖率 | `pnpm test:coverage` | 生成覆盖率报告 |

---

## 相关文档

- [开发文档](./DEVELOPMENT.md) - 开发环境搭建与规范
- [测试文档](./TESTING.md) - 测试指南与最佳实践
- [API 文档](./API.md) - API 接口文档
- [架构文档](./ARCHITECTURE.md) - 系统架构设计

---

最后更新：2024-01-08
