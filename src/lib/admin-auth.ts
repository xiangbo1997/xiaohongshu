/**
 * 管理员认证中间件
 * 统一处理管理员路由的认证逻辑
 */
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'
import { logger } from './logger'
import { checkRateLimit, RATE_LIMITS, getClientIP } from './rate-limit'

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123'
const ADMIN_COOKIE_NAME = 'admin_token'

/**
 * 管理员 Token Payload
 */
interface AdminPayload {
  role: 'admin'
  iat: number
  exp: number
}

/**
 * 生成管理员 Token
 */
export function signAdminToken(): string {
  return jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '24h' })
}

/**
 * 验证管理员 Token
 */
export function verifyAdminToken(token: string): AdminPayload | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as AdminPayload
    if (payload.role !== 'admin') return null
    return payload
  } catch {
    return null
  }
}

/**
 * 验证管理员密码
 */
export function verifyAdminPassword(password: string): boolean {
  return password === ADMIN_PASSWORD
}

/**
 * 设置管理员 Cookie
 */
export async function setAdminCookie(): Promise<void> {
  const token = signAdminToken()
  const cookieStore = await cookies()
  cookieStore.set(ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 24 * 60 * 60, // 24 小时
    path: '/',
  })
}

/**
 * 清除管理员 Cookie
 */
export async function clearAdminCookie(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(ADMIN_COOKIE_NAME)
}

/**
 * 获取当前管理员状态
 */
export async function getAdminSession(): Promise<{ isAdmin: boolean }> {
  const cookieStore = await cookies()
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value
  if (!token) return { isAdmin: false }

  const payload = verifyAdminToken(token)
  return { isAdmin: !!payload }
}

/**
 * 管理员认证中间件
 * @param handler 原始处理函数
 * @returns 包装后的处理函数
 */
export function withAdminAuth<T extends unknown[]>(
  handler: (req: NextRequest, ...args: T) => Promise<NextResponse>
) {
  return async (req: NextRequest, ...args: T): Promise<NextResponse> => {
    const ip = getClientIP(req)

    // 速率限制检查
    const rateLimit = await checkRateLimit(ip, RATE_LIMITS.admin)
    if (!rateLimit.allowed) {
      await logger.warn('system', `管理员接口速率限制: ${ip}`)
      return NextResponse.json(
        { error: rateLimit.message },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimit.limit.toString(),
            'X-RateLimit-Remaining': rateLimit.remaining.toString(),
            'X-RateLimit-Reset': rateLimit.resetAt.toString(),
          },
        }
      )
    }

    // Token 验证
    const cookieStore = await cookies()
    const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value

    if (!token) {
      return NextResponse.json({ error: '请先登录管理后台' }, { status: 401 })
    }

    const payload = verifyAdminToken(token)
    if (!payload) {
      await logger.warn('auth', `管理员 Token 无效: ${ip}`)
      return NextResponse.json({ error: '登录已过期，请重新登录' }, { status: 401 })
    }

    // 调用原始处理函数
    return handler(req, ...args)
  }
}

/**
 * 创建带认证的管理员路由处理器
 */
export function createAdminHandler(
  handler: (req: NextRequest) => Promise<NextResponse>
) {
  return withAdminAuth(handler)
}

/**
 * 管理员路由 - GET 方法包装
 */
export function adminGET(
  handler: (req: NextRequest) => Promise<NextResponse>
): (req: NextRequest) => Promise<NextResponse> {
  return createAdminHandler(handler)
}

/**
 * 管理员路由 - POST 方法包装
 */
export function adminPOST(
  handler: (req: NextRequest) => Promise<NextResponse>
): (req: NextRequest) => Promise<NextResponse> {
  return createAdminHandler(handler)
}

/**
 * 管理员路由 - PUT 方法包装
 */
export function adminPUT(
  handler: (req: NextRequest) => Promise<NextResponse>
): (req: NextRequest) => Promise<NextResponse> {
  return createAdminHandler(handler)
}

/**
 * 管理员路由 - DELETE 方法包装
 */
export function adminDELETE(
  handler: (req: NextRequest) => Promise<NextResponse>
): (req: NextRequest) => Promise<NextResponse> {
  return createAdminHandler(handler)
}
