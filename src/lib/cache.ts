/**
 * 缓存模块
 * 支持内存缓存和 Redis 缓存
 */

// 内存缓存存储
const memoryCache = new Map<string, { value: unknown; expireAt: number }>()

// Redis 客户端
let redisClient: import('ioredis').default | null = null

/**
 * 初始化 Redis 连接
 */
export async function initCacheRedis(): Promise<void> {
  if (process.env.REDIS_URL && !redisClient) {
    try {
      const Redis = (await import('ioredis')).default
      redisClient = new Redis(process.env.REDIS_URL, {
        maxRetriesPerRequest: 3,
        lazyConnect: true,
      })
      await redisClient.connect()
      console.log('Redis connected for caching')
    } catch (error) {
      console.warn('Redis cache connection failed, using memory cache:', error)
      redisClient = null
    }
  }
}

/**
 * 缓存配置
 */
export interface CacheOptions {
  // 过期时间（秒）
  ttl?: number
  // 缓存前缀
  prefix?: string
}

// 默认 TTL（5 分钟）
const DEFAULT_TTL = 5 * 60

/**
 * 设置缓存
 */
export async function setCache<T>(
  key: string,
  value: T,
  options: CacheOptions = {}
): Promise<void> {
  const { ttl = DEFAULT_TTL, prefix = 'cache' } = options
  const fullKey = `${prefix}:${key}`
  const serialized = JSON.stringify(value)

  if (redisClient) {
    try {
      await redisClient.setex(fullKey, ttl, serialized)
      return
    } catch (error) {
      console.error('Redis setCache error:', error)
    }
  }

  // 降级到内存缓存
  memoryCache.set(fullKey, {
    value,
    expireAt: Date.now() + ttl * 1000,
  })
}

/**
 * 获取缓存
 */
export async function getCache<T>(
  key: string,
  options: CacheOptions = {}
): Promise<T | null> {
  const { prefix = 'cache' } = options
  const fullKey = `${prefix}:${key}`

  if (redisClient) {
    try {
      const data = await redisClient.get(fullKey)
      if (data) {
        return JSON.parse(data) as T
      }
      return null
    } catch (error) {
      console.error('Redis getCache error:', error)
    }
  }

  // 降级到内存缓存
  const cached = memoryCache.get(fullKey)
  if (!cached) return null

  if (cached.expireAt < Date.now()) {
    memoryCache.delete(fullKey)
    return null
  }

  return cached.value as T
}

/**
 * 删除缓存
 */
export async function deleteCache(
  key: string,
  options: CacheOptions = {}
): Promise<void> {
  const { prefix = 'cache' } = options
  const fullKey = `${prefix}:${key}`

  if (redisClient) {
    try {
      await redisClient.del(fullKey)
    } catch (error) {
      console.error('Redis deleteCache error:', error)
    }
  }

  memoryCache.delete(fullKey)
}

/**
 * 批量删除缓存（按模式）
 */
export async function deleteCachePattern(
  pattern: string,
  options: CacheOptions = {}
): Promise<void> {
  const { prefix = 'cache' } = options
  const fullPattern = `${prefix}:${pattern}`

  if (redisClient) {
    try {
      const keys = await redisClient.keys(fullPattern)
      if (keys.length > 0) {
        await redisClient.del(...keys)
      }
    } catch (error) {
      console.error('Redis deleteCachePattern error:', error)
    }
  }

  // 内存缓存按前缀删除
  const regex = new RegExp(`^${fullPattern.replace('*', '.*')}$`)
  for (const key of memoryCache.keys()) {
    if (regex.test(key)) {
      memoryCache.delete(key)
    }
  }
}

/**
 * 缓存装饰器 - 用于包装异步函数
 */
export function withCache<T, Args extends unknown[]>(
  fn: (...args: Args) => Promise<T>,
  keyGenerator: (...args: Args) => string,
  options: CacheOptions = {}
): (...args: Args) => Promise<T> {
  return async (...args: Args): Promise<T> => {
    const key = keyGenerator(...args)
    const cached = await getCache<T>(key, options)

    if (cached !== null) {
      return cached
    }

    const result = await fn(...args)
    await setCache(key, result, options)
    return result
  }
}

/**
 * 清理过期的内存缓存
 */
export function cleanupMemoryCache(): void {
  const now = Date.now()
  for (const [key, cached] of memoryCache.entries()) {
    if (cached.expireAt < now) {
      memoryCache.delete(key)
    }
  }
}

// 定期清理内存缓存（每 5 分钟）
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupMemoryCache, 5 * 60 * 1000)
}

// ========== 预定义缓存键生成器 ==========

/**
 * 用户信息缓存键
 */
export function userCacheKey(userId: string): string {
  return `user:${userId}`
}

/**
 * AI 配置缓存键
 */
export function aiConfigCacheKey(provider?: string): string {
  return provider ? `aiconfig:${provider}` : 'aiconfig:all'
}

/**
 * 统计数据缓存键
 */
export function statsCacheKey(type: string, date?: string): string {
  return date ? `stats:${type}:${date}` : `stats:${type}`
}

/**
 * 模板缓存键
 */
export function templateCacheKey(category?: string): string {
  return category ? `template:${category}` : 'template:all'
}

// ========== 缓存 TTL 预设 ==========

export const CACHE_TTL = {
  // 用户信息：1 分钟
  user: 60,
  // AI 配置：10 分钟
  aiConfig: 10 * 60,
  // 统计数据：5 分钟
  stats: 5 * 60,
  // 模板：30 分钟
  template: 30 * 60,
  // 热门内容：15 分钟
  hot: 15 * 60,
} as const
