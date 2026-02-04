/**
 * Zod 验证 Schema 定义
 * 统一管理所有 API 请求参数校验
 */
import { z } from 'zod'

// ========== 通用 Schema ==========

// 手机号校验（中国大陆）
export const phoneSchema = z
  .string()
  .regex(/^1[3-9]\d{9}$/, '请输入有效的手机号')

// 邮箱校验
export const emailSchema = z.string().email('请输入有效的邮箱地址')

// 密码校验（至少 6 位）
export const passwordSchema = z
  .string()
  .min(6, '密码至少 6 位')
  .max(50, '密码最多 50 位')

// 分页参数
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})

// ========== 认证相关 ==========

// 登录请求
export const loginSchema = z
  .object({
    phone: phoneSchema.optional(),
    email: emailSchema.optional(),
    password: passwordSchema,
  })
  .refine((data) => data.phone || data.email, {
    message: '请提供手机号或邮箱',
  })

// 注册请求
export const registerSchema = z
  .object({
    phone: phoneSchema.optional(),
    email: emailSchema.optional(),
    password: passwordSchema,
    nickname: z.string().min(1).max(20).optional(),
  })
  .refine((data) => data.phone || data.email, {
    message: '请提供手机号或邮箱',
  })

// ========== 内容生成相关 ==========

// 内容类型枚举
export const contentTypeSchema = z.enum([
  'note',      // 图文笔记
  'video',     // 视频脚本
  'title',     // 标题生成
  'hashtag',   // 话题标签
  'comment',   // 评论回复
])

// 内容分类枚举
export const categorySchema = z.enum([
  'beauty',    // 美妆护肤
  'food',      // 美食探店
  'fashion',   // 穿搭时尚
  'travel',    // 旅行出游
  'fitness',   // 健身运动
  'tech',      // 数码科技
  'home',      // 家居生活
  'parenting', // 母婴育儿
  'education', // 学习教育
  'other',     // 其他
])

// 风格枚举
export const styleSchema = z.enum([
  'lively',      // 活泼俏皮
  'professional', // 专业干货
  'warm',        // 温暖治愈
  'humorous',    // 幽默搞笑
  'literary',    // 文艺清新
])

// AI 提供商枚举
export const aiProviderSchema = z.enum([
  'openai',
  'anthropic',
  'deepseek',
  'zhipu',
])

// 生成请求
export const generateSchema = z.object({
  contentType: contentTypeSchema,
  category: categorySchema,
  topic: z.string().min(1, '请输入主题').max(200, '主题最多 200 字'),
  keywords: z.string().max(100, '关键词最多 100 字').optional(),
  style: styleSchema.default('lively'),
  aiProvider: aiProviderSchema.default('anthropic'),
  count: z.coerce.number().int().min(1).max(3).default(1),
})

// ========== 支付相关 ==========

// 会员类型枚举
export const memberTypeSchema = z.enum(['DAY', 'MONTH', 'YEAR'])

// 支付方式枚举
export const payTypeSchema = z.enum(['alipay', 'wechat'])

// 创建支付请求
export const createPaymentSchema = z.object({
  memberType: memberTypeSchema,
  payType: payTypeSchema,
})

// 订单状态查询
export const orderStatusSchema = z.object({
  orderNo: z.string().min(1, '订单号不能为空'),
})

// ========== 用户相关 ==========

// 收藏操作
export const favoriteSchema = z.object({
  generationId: z.string().min(1, '生成记录 ID 不能为空'),
})

// 历史记录查询
export const historyQuerySchema = paginationSchema.extend({
  contentType: contentTypeSchema.optional(),
  category: categorySchema.optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
})

// ========== 管理员相关 ==========

// 管理员登录
export const adminLoginSchema = z.object({
  password: z.string().min(1, '请输入管理密码'),
})

// AI 配置更新
export const aiConfigSchema = z.object({
  provider: z.string().min(1),
  name: z.string().min(1).optional(),
  model: z.string().min(1).optional(),
  apiKey: z.string().optional(),
  baseUrl: z.string().url().optional().or(z.literal('')),
  enabled: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
})

// 用户管理查询
export const adminUserQuerySchema = paginationSchema.extend({
  keyword: z.string().optional(),
  memberType: z.enum(['FREE', 'DAY', 'MONTH', 'YEAR']).optional(),
  sortBy: z.enum(['createdAt', 'totalUsage', 'memberExpire']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

// 日志查询
export const logQuerySchema = paginationSchema.extend({
  level: z.enum(['info', 'warn', 'error']).optional(),
  type: z.enum(['generate', 'auth', 'payment', 'system']).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
})

// ========== 工具函数 ==========

/**
 * 验证并解析请求数据
 * @param schema Zod Schema
 * @param data 待验证数据
 * @returns 解析结果
 */
export function validateRequest<T extends z.ZodSchema>(
  schema: T,
  data: unknown
): { success: true; data: z.infer<T> } | { success: false; error: string } {
  const result = schema.safeParse(data)
  if (result.success) {
    return { success: true, data: result.data }
  }

  // 格式化错误信息（Zod 4.x 使用 issues 属性）
  const errors = result.error.issues.map((issue) => {
    const path = issue.path.join('.')
    return path ? `${path}: ${issue.message}` : issue.message
  })

  return { success: false, error: errors.join('; ') }
}

/**
 * 从 URL 解析查询参数
 */
export function parseSearchParams(
  searchParams: URLSearchParams
): Record<string, string | undefined> {
  const params: Record<string, string | undefined> = {}
  searchParams.forEach((value, key) => {
    params[key] = value
  })
  return params
}
