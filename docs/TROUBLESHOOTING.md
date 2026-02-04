# 故障排查指南

本文档提供常见问题的诊断和解决方案。

## 目录

- [快速诊断](#快速诊断)
- [数据库问题](#数据库问题)
- [应用程序问题](#应用程序问题)
- [性能问题](#性能问题)
- [支付问题](#支付问题)
- [AI 服务问题](#ai-服务问题)
- [日志分析](#日志分析)
- [紧急恢复](#紧急恢复)

---

## 快速诊断

### 健康检查清单

```bash
# 1. 检查服务状态
pnpm dev  # 应用是否能启动？

# 2. 检查数据库连接
pnpm db:studio  # 能否打开 Prisma Studio？

# 3. 检查日志
pnpm tsx scripts/log-viewer.ts  # 查看最近错误

# 4. 检查性能
pnpm tsx scripts/performance-monitor.ts  # 系统资源是否正常？

# 5. 运行测试
pnpm test  # 测试是否通过？
```

### 常用诊断命令

```bash
# 查看进程
ps aux | grep node

# 查看端口占用
lsof -i :3000

# 查看数据库连接
psql -U postgres -h localhost -c "SELECT count(*) FROM pg_stat_activity;"

# 查看磁盘空间
df -h

# 查看内存使用
free -h  # Linux
vm_stat  # macOS
```

---

## 数据库问题

### 问题 1：无法连接数据库

**症状**：
```
Error: Can't reach database server at `localhost:5432`
```

**诊断步骤**：

1. **检查 PostgreSQL 是否运行**
   ```bash
   # macOS
   brew services list | grep postgresql

   # Linux
   systemctl status postgresql

   # 启动服务
   brew services start postgresql  # macOS
   sudo systemctl start postgresql  # Linux
   ```

2. **检查连接配置**
   ```bash
   # 查看 .env 中的 DATABASE_URL
   cat .env | grep DATABASE_URL

   # 测试连接
   psql -U postgres -h localhost
   ```

3. **检查防火墙**
   ```bash
   # 确保 5432 端口开放
   sudo ufw status  # Linux
   ```

**解决方案**：
- 启动 PostgreSQL 服务
- 修正 `.env` 中的 `DATABASE_URL`
- 检查用户名和密码是否正确
- 确保数据库已创建：`createdb xiaohongshu`

---

### 问题 2：数据库迁移失败

**症状**：
```
Error: Migration failed to apply cleanly
```

**诊断步骤**：

1. **查看迁移状态**
   ```bash
   npx prisma migrate status
   ```

2. **查看迁移历史**
   ```bash
   psql -U postgres -d xiaohongshu -c "SELECT * FROM _prisma_migrations;"
   ```

**解决方案**：

**方案 A：重置数据库（开发环境）**
```bash
# ⚠️ 警告：会删除所有数据
pnpm db:reset
```

**方案 B：手动修复（生产环境）**
```bash
# 1. 标记迁移为已应用
npx prisma migrate resolve --applied <migration_name>

# 2. 或标记为回滚
npx prisma migrate resolve --rolled-back <migration_name>

# 3. 重新应用
npx prisma migrate deploy
```

---

### 问题 3：Prisma Client 未生成

**症状**：
```
Cannot find module '@prisma/client'
```

**解决方案**：
```bash
# 生成 Prisma Client
pnpm db:generate

# 如果还是失败，清除缓存
rm -rf node_modules/.prisma
pnpm install
pnpm db:generate
```

---

### 问题 4：数据库查询慢

**诊断步骤**：

1. **查看慢查询**
   ```sql
   -- 启用慢查询日志
   ALTER SYSTEM SET log_min_duration_statement = 1000;  -- 1秒
   SELECT pg_reload_conf();

   -- 查看慢查询
   SELECT query, calls, total_time, mean_time
   FROM pg_stat_statements
   ORDER BY mean_time DESC
   LIMIT 10;
   ```

2. **分析查询计划**
   ```sql
   EXPLAIN ANALYZE SELECT * FROM "User" WHERE phone = '13800138000';
   ```

**解决方案**：
- 添加索引
- 优化查询（使用 `select` 限制字段）
- 使用缓存
- 考虑分页

---

## 应用程序问题

### 问题 1：应用无法启动

**症状**：
```
Error: Port 3000 is already in use
```

**解决方案**：
```bash
# 查找占用端口的进程
lsof -i :3000

# 杀死进程
kill -9 <PID>

# 或使用其他端口
PORT=3001 pnpm dev
```

---

### 问题 2：环境变量未加载

**症状**：
```
Error: JWT_SECRET is not defined
```

**诊断步骤**：

1. **检查 .env 文件**
   ```bash
   ls -la .env
   cat .env | grep JWT_SECRET
   ```

2. **检查环境变量加载**
   ```bash
   node -e "require('dotenv').config(); console.log(process.env.JWT_SECRET)"
   ```

**解决方案**：
- 确保 `.env` 文件存在
- 检查变量名拼写
- 重启应用
- 检查 `.env` 文件权限

---

### 问题 3：TypeScript 类型错误

**症状**：
```
Type 'string | undefined' is not assignable to type 'string'
```

**解决方案**：
```bash
# 重新生成 Prisma Client
pnpm db:generate

# 重启 TypeScript 服务器（VS Code）
# Cmd+Shift+P -> Restart TS Server

# 检查类型
pnpm tsc --noEmit
```

---

### 问题 4：依赖安装失败

**症状**：
```
ERR_PNPM_FETCH_404
```

**解决方案**：
```bash
# 清除缓存
pnpm store prune

# 删除 node_modules 和 lockfile
rm -rf node_modules pnpm-lock.yaml

# 重新安装
pnpm install
```

---

## 性能问题

### 问题 1：响应时间慢

**诊断步骤**：

1. **运行性能监控**
   ```bash
   pnpm tsx scripts/performance-monitor.ts
   ```

2. **检查数据库查询**
   ```bash
   # 启用 Prisma 查询日志
   # 在 prisma/schema.prisma 中添加：
   # log = ["query", "info", "warn", "error"]
   ```

3. **检查系统资源**
   ```bash
   # CPU 使用率
   top

   # 内存使用
   free -h  # Linux
   vm_stat  # macOS
   ```

**解决方案**：
- 添加数据库索引
- 使用 Redis 缓存
- 优化查询（减少 N+1 查询）
- 使用 CDN 加速静态资源
- 启用 gzip 压缩

---

### 问题 2：内存泄漏

**症状**：
- 内存使用持续增长
- 应用变慢或崩溃

**诊断步骤**：

1. **监控内存使用**
   ```bash
   node --inspect index.js
   # 在 Chrome 中打开 chrome://inspect
   ```

2. **生成堆快照**
   ```javascript
   const v8 = require('v8');
   const fs = require('fs');

   const heapSnapshot = v8.writeHeapSnapshot();
   console.log('Heap snapshot written to', heapSnapshot);
   ```

**解决方案**：
- 检查未关闭的数据库连接
- 检查事件监听器泄漏
- 使用 `WeakMap` 代替 `Map`
- 定期重启应用（临时方案）

---

### 问题 3：数据库连接池耗尽

**症状**：
```
Error: Too many clients already
```

**解决方案**：

1. **增加连接池大小**
   ```env
   # .env
   DATABASE_URL="postgresql://user:pass@localhost:5432/db?connection_limit=20"
   ```

2. **确保连接正确关闭**
   ```typescript
   // 使用 try-finally
   try {
     await prisma.user.findMany()
   } finally {
     await prisma.$disconnect()
   }
   ```

---

## 支付问题

### 问题 1：支付回调未收到

**诊断步骤**：

1. **检查回调 URL**
   ```bash
   # 确保 NOTIFY_URL 可访问
   curl -X POST https://your-domain.com/api/payment/notify
   ```

2. **查看支付日志**
   ```bash
   pnpm tsx scripts/log-viewer.ts
   # 选择 payment 类型日志
   ```

3. **检查防火墙**
   - 确保服务器允许支付平台 IP 访问

**解决方案**：
- 使用 ngrok 测试本地回调
- 检查 HTTPS 证书
- 验证签名算法
- 联系支付平台技术支持

---

### 问题 2：订单状态不一致

**症状**：
- 用户已支付但订单状态未更新
- 重复回调导致重复发货

**诊断步骤**：

1. **查询订单**
   ```bash
   pnpm tsx scripts/dev-tools.ts
   # 使用数据库工具查询订单
   ```

2. **检查回调日志**
   ```sql
   SELECT * FROM "Log"
   WHERE type = 'payment'
   AND details LIKE '%order_no%'
   ORDER BY "createdAt" DESC;
   ```

**解决方案**：
- 实现幂等性检查
- 使用数据库事务
- 添加订单状态机
- 手动修正订单状态

---

## AI 服务问题

### 问题 1：AI API 调用失败

**症状**：
```
Error: Request failed with status code 401
```

**诊断步骤**：

1. **检查 API Key**
   ```bash
   cat .env | grep API_KEY
   ```

2. **测试 API 连接**
   ```bash
   # OpenAI
   curl https://api.openai.com/v1/models \
     -H "Authorization: Bearer $OPENAI_API_KEY"

   # Anthropic
   curl https://api.anthropic.com/v1/messages \
     -H "x-api-key: $ANTHROPIC_API_KEY"
   ```

**解决方案**：
- 验证 API Key 是否正确
- 检查 API 额度是否用完
- 检查网络连接
- 使用代理（如需要）

---

### 问题 2：生成内容质量差

**诊断步骤**：

1. **检查 Prompt 模板**
   ```bash
   # 查看 src/lib/prompts.ts
   cat src/lib/prompts.ts
   ```

2. **测试不同模型**
   - 尝试切换 AI 提供商
   - 调整温度参数

**解决方案**：
- 优化 Prompt 模板
- 增加示例和约束
- 调整模型参数
- 使用更强大的模型

---

## 日志分析

### 使用日志工具

```bash
# 启动日志查看器
pnpm tsx scripts/log-viewer.ts

# 常用操作：
# 1. 查看最近日志
# 2. 按时间范围查看
# 3. 搜索关键词
# 4. 查看统计
# 5. 实时监控
```

### 日志级别说明

| 级别 | 说明 | 处理方式 |
|------|------|----------|
| info | 正常信息 | 定期查看 |
| warn | 警告信息 | 关注趋势 |
| error | 错误信息 | 立即处理 |

### 关键日志模式

**认证失败**：
```
level: error
type: auth
message: "Login failed"
```

**支付异常**：
```
level: error
type: payment
message: "Payment verification failed"
```

**生成失败**：
```
level: error
type: generate
message: "AI generation failed"
```

---

## 紧急恢复

### 数据库恢复

```bash
# 1. 停止应用
pm2 stop xiaohongshu

# 2. 恢复数据库
pnpm db:restore
# 选择最近的备份文件

# 3. 验证数据
pnpm db:studio

# 4. 重启应用
pm2 start xiaohongshu
```

### 回滚代码

```bash
# 1. 查看提交历史
git log --oneline -10

# 2. 回滚到指定版本
git reset --hard <commit_hash>

# 3. 强制推送（谨慎）
git push --force

# 4. 重新部署
pnpm build
pm2 restart xiaohongshu
```

### 紧急维护模式

```bash
# 1. 创建维护页面
cat > public/maintenance.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
  <title>系统维护中</title>
</head>
<body>
  <h1>系统维护中，请稍后访问</h1>
</body>
</html>
EOF

# 2. 配置 Nginx 重定向
# 在 nginx.conf 中添加：
# error_page 503 /maintenance.html;
# return 503;

# 3. 重载 Nginx
sudo nginx -s reload
```

---

## 监控和告警

### 设置监控

**推荐工具**：
- **Sentry**：错误监控
- **Datadog**：性能监控
- **UptimeRobot**：可用性监控

**关键指标**：
- 响应时间 < 200ms
- 错误率 < 1%
- CPU 使用率 < 70%
- 内存使用率 < 80%
- 数据库连接数 < 80%

### 告警规则

```yaml
# 示例告警规则
alerts:
  - name: high_error_rate
    condition: error_rate > 5%
    duration: 5m
    action: send_email

  - name: slow_response
    condition: avg_response_time > 1s
    duration: 10m
    action: send_slack

  - name: database_down
    condition: db_connection_failed
    duration: 1m
    action: send_sms
```

---

## 预防措施

### 日常维护

```bash
# 每日
- 查看错误日志
- 检查系统资源
- 备份数据库

# 每周
- 清理旧日志
- 更新依赖
- 运行性能测试

# 每月
- 安全审计
- 代码审查
- 容量规划
```

### 最佳实践

1. **监控优先**：部署监控系统
2. **自动化**：自动化备份和部署
3. **文档化**：记录所有操作
4. **测试**：充分测试再上线
5. **回滚计划**：准备回滚方案

---

## 获取帮助

### 内部资源

- [开发文档](./DEVELOPMENT.md)
- [API 文档](./API.md)
- [架构文档](./ARCHITECTURE.md)

### 外部资源

- [Next.js 文档](https://nextjs.org/docs)
- [Prisma 文档](https://www.prisma.io/docs)
- [PostgreSQL 文档](https://www.postgresql.org/docs/)

### 联系支持

- GitHub Issues: https://github.com/your-repo/xiaohongshu/issues
- 技术支持邮箱: support@example.com
- 紧急联系人: +86 138-0013-8000

---

最后更新：2024-01-08
