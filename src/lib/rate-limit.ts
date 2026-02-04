/**
 * 速率限制模块
 * 支持基于内存和 Redis 的速率限制
 */

// 内存存储（开发环境或无 Redis 时使用）
const memoryStore = new Map<string, { count: number; resetAt: number }>()

// Redis 客户端（可选）
let redisClient: import('ioredis').default | null = null

/**
 * 初始化 Redis 连接（可选）
 */
export async function initRedis(): Promise<void> {
  if (process.env.REDIS_URL) {
    try {
      const Redis = (await import('ioredis')).default
      redisClient = new Redis(process.env.REDIS_URL, {
        maxRetriesPerRequest: 3,
        lazyConnect: true,
      })
      await redisClient.connect()
      console.log('Redis connected for rate limiting')
    } catch (error) {
      console.warn('Redis connection failed, using memory store:', error)
      redisClient = null
    }
  }
}

/**
 * 速率限制配置
 */
export interface RateLimitConfig {
  // 时间窗口（毫秒）
  windowMs: number
  // 最大请求数
  max: number
  // 标识前缀
  prefix?: string
  // 自定义错误消息
  message?: string
}

/**
 * 速率限制结果
 */
export interface RateLimitResult {
  // 是否允许
  allowed: boolean
  // 剩余次数
  remaining: number
  // 重置时间戳（毫秒）
  resetAt: number
  // 总限制数
  limit: number
  // 错误消息（如果被限制）
  message?: string
}

// 预设配置
export const RATE_LIMITS = {
  // API 通用限制：每分钟 60 次
  api: { windowMs: 60 * 1000, max: 60, prefix: 'api' },
  // 登录限制：每 15 分钟 5 次
  login: { windowMs: 15 * 60 * 1000, max: 5, prefix: 'login', message: '登录尝试过于频繁，请稍后再试' },
  // 注册限制：每小时 3 次
  register: { windowMs: 60 * 60 * 1000, max: 3, prefix: 'register', message: '注册请求过于频繁，请稍后再试' },
  // 内容生成限制：每分钟 10 次（付费用户可能更高）
  generate: { windowMs: 60 * 1000, max: 10, prefix: 'generate', message: '生成请求过于频繁，请稍后再试' },
  // 支付创建限制：每分钟 5 次
  payment: { windowMs: 60 * 1000, max: 5, prefix: 'payment', message: '支付请求过于频繁，请稍后再试' },
  // 管理员操作：每分钟 100 次
  admin: { windowMs: 60 * 1000, max: 100, prefix: 'admin' },
} as const

/**
 * 检查速率限制
 * @param identifier 标识符（如 IP 或用户 ID）
 * @param config 速率限制配置
 */
export async function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const key = `ratelimit:${config.prefix || 'default'}:${identifier}`
  const now = Date.now()
  const windowStart = now - config.windowMs

  if (redisClient) {
    return checkRateLimitRedis(key, now, windowStart, config)
  }
  return checkRateLimitMemory(key, now, windowStart, config)
}

/**
 * 基于内存的速率限制检查
 */
function checkRateLimitMemory(
  key: string,
  now: number,
  windowStart: number,
  config: RateLimitConfig
): RateLimitResult {
  const record = memoryStore.get(key)

  // 清理过期记录
  if (record && record.resetAt < now) {
    memoryStore.delete(key)
  }

  const current = memoryStore.get(key)

  if (!current) {
    // 新记录
    memoryStore.set(key, { count: 1, resetAt: now + config.windowMs })
    return {
      allowed: true,
      remaining: config.max - 1,
      resetAt: now + config.windowMs,
      limit: config.max,
    }
  }

  if (current.count >= config.max) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: current.resetAt,
      limit: config.max,
      message: config.message || '请求过于频繁，请稍后再试',
    }
  }

  current.count++
  return {
    allowed: true,
    remaining: config.max - current.count,
    resetAt: current.resetAt,
    limit: config.max,
  }
}

/**
 * 基于 Redis 的速率限制检查（滑动窗口）
 */
async function checkRateLimitRedis(
  key: string,
  now: number,
  windowStart: number,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  if (!redisClient) {
    return checkRateLimitMemory(key, now, windowStart, config)
  }

  try {
    // 使用 Redis 事务执行滑动窗口算法
    const multi = redisClient.multi()

    // 移除过期记录
    multi.zremrangebyscore(key, 0, windowStart)
    // 添加当前请求
    multi.zadd(key, now, `${now}-${Math.random()}`)
    // 获取当前窗口内的请求数
    multi.zcard(key)
    // 设置过期时间
    multi.pexpire(key, config.windowMs)

    const results = await multi.exec()
    const count = (results?.[2]?.[1] as number) || 0

    const resetAt = now + config.windowMs
    const remaining = Math.max(0, config.max - count)

    if (count > config.max) {
      // 超过限制，移除刚添加的记录
      await redisClient.zremrangebyscore(key, now, now)
      return {
        allowed: false,
        remaining: 0,
        resetAt,
        limit: config.max,
        message: config.message || '请求过于频繁，请稍后再试',
      }
    }

    return {
      allowed: true,
      remaining,
      resetAt,
      limit: config.max,
    }
  } catch (error) {
    console.error('Redis rate limit error:', error)
    // 降级到内存存储
    return checkRateLimitMemory(key, now, windowStart, config)
  }
}

/**
 * 重置速率限制（用于测试或管理）
 */
export async function resetRateLimit(identifier: string, prefix: string): Promise<void> {
  const key = `ratelimit:${prefix}:${identifier}`

  if (redisClient) {
    await redisClient.del(key)
  }
  memoryStore.delete(key)
}

/**
 * 获取客户端 IP
 */
export function getClientIP(request: Request): string {
  // 优先使用 X-Forwarded-For（经过代理时）
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim()
  }

  // 其次使用 X-Real-IP
  const realIP = request.headers.get('x-real-ip')
  if (realIP) {
    return realIP
  }

  // CF-Connecting-IP（Cloudflare）
  const cfIP = request.headers.get('cf-connecting-ip')
  if (cfIP) {
    return cfIP
  }

  // 默认返回未知
  return 'unknown'
}

/**
 * 清理过期的内存记录（定期调用）
 */
export function cleanupMemoryStore(): void {
  const now = Date.now()
  for (const [key, record] of memoryStore.entries()) {
    if (record.resetAt < now) {
      memoryStore.delete(key)
    }
  }
}

// 每 5 分钟清理一次过期记录
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupMemoryStore, 5 * 60 * 1000)
}
