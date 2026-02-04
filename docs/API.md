# API 文档

小红书爆款文案生成器 API 接口文档

## 目录

- [认证接口](#认证接口)
- [用户接口](#用户接口)
- [生成接口](#生成接口)
- [支付接口](#支付接口)
- [兑换码接口](#兑换码接口)
- [管理后台接口](#管理后台接口)
- [配置接口](#配置接口)

---

## 基础信息

### Base URL

```
生产环境: https://your-domain.com
开发环境: http://localhost:3000
```

### 认证方式

使用 JWT Token，通过 Cookie 传递：

```
Cookie: token=<jwt_token>
```

### 响应格式

所有接口统一返回 JSON 格式：

**成功响应：**
```json
{
  "success": true,
  "data": { ... }
}
```

**错误响应：**
```json
{
  "success": false,
  "error": "错误信息"
}
```

### HTTP 状态码

| 状态码 | 说明 |
|--------|------|
| 200 | 请求成功 |
| 400 | 请求参数错误 |
| 401 | 未认证或认证失败 |
| 403 | 无权限访问 |
| 404 | 资源不存在 |
| 429 | 请求过于频繁 |
| 500 | 服务器内部错误 |

---

## 认证接口

### 1. 用户注册

**接口：** `POST /api/auth/register`

**请求参数：**

```json
{
  "phone": "13800138000",      // 手机号（phone 和 email 二选一）
  "email": "user@example.com", // 邮箱（phone 和 email 二选一）
  "password": "123456",         // 密码，至少 6 位
  "nickname": "用户昵称"        // 可选，最多 20 字
}
```

**响应示例：**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "clxxx",
      "phone": "13800138000",
      "nickname": "用户昵称",
      "memberType": "FREE",
      "points": 0,
      "dailyFreeUsed": 0,
      "dailyFreeLimit": 3,
      "isVip": false
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### 2. 用户登录

**接口：** `POST /api/auth/login`

**请求参数：**

```json
{
  "phone": "13800138000",      // 手机号（phone 和 email 二选一）
  "email": "user@example.com", // 邮箱（phone 和 email 二选一）
  "password": "123456"          // 密码
}
```

**响应示例：**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "clxxx",
      "phone": "13800138000",
      "memberType": "VIP",
      "memberExpire": "2024-02-08T00:00:00.000Z",
      "points": 50,
      "dailyFreeUsed": 2,
      "dailyFreeLimit": 13,
      "isVip": true
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### 3. 用户登出

**接口：** `POST /api/auth/logout`

**认证：** 需要

**响应示例：**

```json
{
  "success": true,
  "data": {
    "message": "登出成功"
  }
}
```

---

## 用户接口

### 1. 获取当前用户信息

**接口：** `GET /api/user`

**认证：** 需要

**响应示例：**

```json
{
  "success": true,
  "data": {
    "id": "clxxx",
    "phone": "13800138000",
    "email": "user@example.com",
    "nickname": "用户昵称",
    "memberType": "VIP",
    "memberExpire": "2024-02-08T00:00:00.000Z",
    "points": 50,
    "dailyFreeUsed": 2,
    "dailyFreeLimit": 13,
    "totalUsage": 150,
    "isVip": true
  }
}
```

### 2. 获取用户个人资料

**接口：** `GET /api/user/profile`

**认证：** 需要

**响应示例：**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "clxxx",
      "phone": "13800138000",
      "nickname": "用户昵称",
      "avatar": "https://example.com/avatar.jpg",
      "memberType": "VIP",
      "memberExpire": "2024-02-08T00:00:00.000Z",
      "points": 50,
      "totalUsage": 150,
      "createdAt": "2024-01-01T00:00:00.000Z"
    },
    "stats": {
      "totalGenerations": 150,
      "totalFavorites": 25,
      "availablePoints": 53
    }
  }
}
```

### 3. 获取生成历史

**接口：** `GET /api/user/history`

**认证：** 需要

**查询参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| page | number | 否 | 页码，默认 1 |
| pageSize | number | 否 | 每页数量，默认 20，最大 100 |
| contentType | string | 否 | 内容类型筛选 |
| category | string | 否 | 分类筛选 |

**响应示例：**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "clxxx",
        "contentType": "note",
        "category": "beauty",
        "topic": "夏日防晒推荐",
        "title": "🌞 夏日防晒必备！",
        "content": "姐妹们，夏天到了...",
        "tags": ["防晒", "护肤"],
        "aiProvider": "anthropic",
        "createdAt": "2024-01-08T12:00:00.000Z",
        "isFavorite": true
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 150,
      "totalPages": 8
    }
  }
}
```

### 4. 收藏/取消收藏

**接口：** `POST /api/user/favorites`

**认证：** 需要

**请求参数：**

```json
{
  "generationId": "clxxx",  // 生成记录 ID
  "action": "add"           // add: 收藏, remove: 取消收藏
}
```

**响应示例：**

```json
{
  "success": true,
  "data": {
    "message": "收藏成功",
    "isFavorite": true
  }
}
```

---

## 生成接口

### 1. 生成文案

**接口：** `POST /api/generate`

**认证：** 需要

**请求参数：**

```json
{
  "contentType": "note",        // 内容类型：note, video, title, hashtag, comment
  "category": "beauty",         // 分类：beauty, food, fashion, travel, fitness, tech, home, parenting, education, other
  "topic": "夏日防晒推荐",      // 主题，1-200 字
  "keywords": "防晒霜,SPF50",   // 可选，关键词，最多 100 字
  "style": "lively",            // 风格：lively, professional, warm, humorous, literary
  "aiProvider": "anthropic",    // AI 提供商：openai, anthropic, deepseek, zhipu
  "count": 2                    // 生成数量，1-3（VIP 用户可选）
}
```

**响应示例：**

```json
{
  "success": true,
  "data": {
    "generations": [
      {
        "id": "clxxx",
        "title": "🌞 夏日防晒必备！这些防晒霜真的好用",
        "content": "姐妹们，夏天到了，防晒一定要做好！今天给大家推荐几款我用过的超好用防晒霜...",
        "tags": ["防晒", "护肤", "夏日必备"],
        "coverText": "防晒做得好，皮肤不会老"
      },
      {
        "id": "clyyy",
        "title": "防晒霜测评 | SPF50+ 真的有用吗？",
        "content": "最近很多姐妹问我防晒霜怎么选，今天就来详细说说...",
        "tags": ["防晒测评", "SPF50", "护肤科普"],
        "coverText": "科学防晒，从了解 SPF 开始"
      }
    ],
    "pointsUsed": 2,
    "remainingPoints": 51
  }
}
```

**错误响应：**

```json
{
  "success": false,
  "error": "点数不足，请购买点数或升级 VIP"
}
```

---

## 支付接口

### 1. 创建支付订单

**接口：** `POST /api/payment/create`

**认证：** 需要

**请求参数：**

```json
{
  "productType": "VIP_7",  // 产品类型：VIP_1, VIP_3, VIP_7, VIP_30, POINTS_10, POINTS_50, POINTS_100, POINTS_500
  "payType": "alipay"      // 支付方式：alipay, wechat
}
```

**响应示例：**

```json
{
  "success": true,
  "data": {
    "orderNo": "XHS20240108120000ABC123",
    "productName": "7天VIP会员",
    "amount": 999,
    "payUrl": "https://qr.alipay.com/xxx",  // 支付宝支付链接
    "qrCode": "https://api.qrserver.com/v1/create-qr-code/?data=xxx"  // 二维码图片
  }
}
```

### 2. 查询订单状态

**接口：** `GET /api/payment/status`

**认证：** 需要

**查询参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| orderNo | string | 是 | 订单号 |

**响应示例：**

```json
{
  "success": true,
  "data": {
    "orderNo": "XHS20240108120000ABC123",
    "status": "PAID",  // PENDING, PAID, FAILED, REFUNDED
    "productType": "VIP_7",
    "amount": 999,
    "paidAt": "2024-01-08T12:05:00.000Z"
  }
}
```

### 3. 支付回调（内部接口）

**接口：** `POST /api/payment/notify`

**说明：** 此接口由支付平台回调，不需要前端调用

---

## 兑换码接口

### 1. 兑换码兑换

**接口：** `POST /api/redeem`

**认证：** 需要

**请求参数：**

```json
{
  "code": "AAAA-BBBB-CCCC-DDDD-EEEEE-FFFFF"  // 兑换码
}
```

**响应示例：**

```json
{
  "success": true,
  "data": {
    "rewardType": "VIP_7",
    "rewardValue": 7,
    "message": "兑换成功！您获得了 7 天 VIP 会员",
    "user": {
      "memberType": "VIP",
      "memberExpire": "2024-01-15T00:00:00.000Z",
      "points": 50
    }
  }
}
```

**错误响应：**

```json
{
  "success": false,
  "error": "兑换码无效或已过期"
}
```

### 2. 兑换历史

**接口：** `GET /api/redeem/history`

**认证：** 需要

**查询参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| page | number | 否 | 页码，默认 1 |
| pageSize | number | 否 | 每页数量，默认 20 |

**响应示例：**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "clxxx",
        "code": "AAAA-BBBB-CCCC-DDDD-EEEEE-FFFFF",
        "rewardType": "VIP_7",
        "rewardValue": 7,
        "redeemedAt": "2024-01-08T12:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 5,
      "totalPages": 1
    }
  }
}
```

---

## 管理后台接口

### 认证

管理后台接口需要管理员权限，通过管理员密码登录获取。

### 1. 管理员登录

**接口：** `POST /api/admin/login`

**请求参数：**

```json
{
  "password": "admin-password"  // 管理员密码
}
```

**响应示例：**

```json
{
  "success": true,
  "data": {
    "token": "admin-jwt-token",
    "message": "登录成功"
  }
}
```

### 2. 验证管理员权限

**接口：** `GET /api/admin/verify`

**认证：** 需要管理员 Token

**响应示例：**

```json
{
  "success": true,
  "data": {
    "isAdmin": true
  }
}
```

### 3. 获取用户列表

**接口：** `GET /api/admin/users`

**认证：** 需要管理员权限

**查询参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| page | number | 否 | 页码，默认 1 |
| pageSize | number | 否 | 每页数量，默认 20 |
| keyword | string | 否 | 搜索关键词（手机号/邮箱/昵称） |
| memberType | string | 否 | 会员类型筛选 |
| sortBy | string | 否 | 排序字段：createdAt, totalUsage, memberExpire |
| sortOrder | string | 否 | 排序方向：asc, desc |

**响应示例：**

```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "clxxx",
        "phone": "13800138000",
        "email": "user@example.com",
        "nickname": "用户昵称",
        "memberType": "VIP",
        "memberExpire": "2024-02-08T00:00:00.000Z",
        "points": 50,
        "totalUsage": 150,
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 1250,
      "totalPages": 63
    }
  }
}
```

### 4. 获取系统日志

**接口：** `GET /api/admin/logs`

**认证：** 需要管理员权限

**查询参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| page | number | 否 | 页码，默认 1 |
| pageSize | number | 否 | 每页数量，默认 20 |
| level | string | 否 | 日志级别：info, warn, error |
| type | string | 否 | 日志类型：generate, auth, payment, system |
| startDate | string | 否 | 开始日期（ISO 8601） |
| endDate | string | 否 | 结束日期（ISO 8601） |

**响应示例：**

```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "id": "clxxx",
        "level": "info",
        "type": "generate",
        "message": "用户生成文案",
        "details": "{\"userId\":\"clxxx\",\"topic\":\"夏日防晒\"}",
        "createdAt": "2024-01-08T12:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 5000,
      "totalPages": 250
    }
  }
}
```

### 5. 生成兑换码

**接口：** `POST /api/admin/codes`

**认证：** 需要管理员权限

**请求参数：**

```json
{
  "codeCategory": "VIP",        // 兑换码类别：VIP, POINTS
  "rewardType": "VIP_7",        // 奖励类型：VIP_1, VIP_3, VIP_7, VIP_30, VIP_CUSTOM, POINTS_10, POINTS_50, POINTS_100, POINTS_CUSTOM
  "rewardValue": 7,             // 奖励值（VIP 天数或点数数量）
  "count": 10,                  // 生成数量，1-100
  "maxUses": 1,                 // 最大使用次数，默认 1
  "expireAt": "2024-12-31T23:59:59.000Z",  // 可选，过期时间
  "note": "新年活动兑换码"      // 可选，备注
}
```

**响应示例：**

```json
{
  "success": true,
  "data": {
    "codes": [
      {
        "id": "clxxx",
        "codeDisplay": "AAAA-BBBB-CCCC-DDDD-EEEEE-FFFFF",
        "rewardType": "VIP_7",
        "rewardValue": 7,
        "status": "ACTIVE",
        "maxUses": 1,
        "usedCount": 0,
        "expireAt": "2024-12-31T23:59:59.000Z",
        "note": "新年活动兑换码"
      }
    ],
    "count": 10
  }
}
```

### 6. 获取数据统计

**接口：** `GET /api/admin/stats`

**认证：** 需要管理员权限

**响应示例：**

```json
{
  "success": true,
  "data": {
    "users": {
      "total": 1250,
      "free": 1100,
      "vip": 150,
      "newToday": 25
    },
    "generations": {
      "total": 15000,
      "today": 350,
      "thisMonth": 8500
    },
    "orders": {
      "total": 450,
      "totalAmount": 125000,
      "thisMonth": 85,
      "thisMonthAmount": 25000
    },
    "redemptions": {
      "total": 120,
      "thisMonth": 35
    }
  }
}
```

---

## 配置接口

### 1. 获取点数配置

**接口：** `GET /api/config/points`

**认证：** 不需要

**响应示例：**

```json
{
  "success": true,
  "data": {
    "dailyFreePoints": {
      "free": 3,
      "vip": 13
    },
    "generation": {
      "basePointsPerVersion": 1
    },
    "packages": {
      "vip": [
        {
          "id": "VIP_1",
          "name": "1天VIP",
          "days": 1,
          "price": 199,
          "originalPrice": null
        }
      ],
      "points": [
        {
          "id": "POINTS_10",
          "name": "10点数",
          "points": 10,
          "price": 99,
          "originalPrice": null
        }
      ]
    }
  }
}
```

---

## 错误码说明

| 错误码 | 说明 | 解决方案 |
|--------|------|----------|
| AUTH_REQUIRED | 需要登录 | 请先登录 |
| AUTH_INVALID | 认证失败 | Token 无效或已过期，请重新登录 |
| PERMISSION_DENIED | 权限不足 | 需要管理员权限 |
| VALIDATION_ERROR | 参数验证失败 | 检查请求参数 |
| INSUFFICIENT_POINTS | 点数不足 | 购买点数或升级 VIP |
| RATE_LIMIT_EXCEEDED | 请求过于频繁 | 稍后再试 |
| REDEMPTION_CODE_INVALID | 兑换码无效 | 检查兑换码是否正确 |
| REDEMPTION_CODE_EXPIRED | 兑换码已过期 | 使用有效的兑换码 |
| REDEMPTION_CODE_DEPLETED | 兑换码已用完 | 使用其他兑换码 |
| ORDER_NOT_FOUND | 订单不存在 | 检查订单号 |
| PAYMENT_FAILED | 支付失败 | 重试或联系客服 |

---

## 频率限制

为防止滥用，部分接口有频率限制：

| 接口 | 限制 |
|------|------|
| POST /api/auth/register | 5 次/小时/IP |
| POST /api/auth/login | 10 次/小时/IP |
| POST /api/generate | 60 次/小时/用户 |
| POST /api/redeem | 10 次/小时/用户 |

超出限制将返回 429 状态码。

---

## 开发建议

1. **错误处理**：始终检查 `success` 字段，并妥善处理错误信息
2. **Token 管理**：Token 有效期为 7 天，过期后需要重新登录
3. **请求重试**：对于网络错误，建议实现指数退避重试
4. **日志记录**：记录关键操作和错误，便于排查问题
5. **安全性**：不要在客户端存储敏感信息，使用 HTTPS

---

## 更新日志

| 日期 | 版本 | 说明 |
|------|------|------|
| 2024-01-08 | 1.0.0 | 初始版本 |
