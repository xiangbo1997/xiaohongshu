/**
 * CSRF 防护模块
 * 使用双重提交 Cookie 模式
 */
import crypto from 'crypto'
import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'

// CSRF Token 配置
const CSRF_COOKIE_NAME = 'csrf_token'
const CSRF_HEADER_NAME = 'x-csrf-token'
const CSRF_TOKEN_LENGTH = 32
const CSRF_TOKEN_EXPIRY = 24 * 60 * 60 * 1000 // 24 小时

/**
 * 生成 CSRF Token
 */
export function generateCSRFToken(): string {
  return crypto.randomBytes(CSRF_TOKEN_LENGTH).toString('hex')
}

/**
 * 设置 CSRF Cookie
 */
export async function setCSRFCookie(): Promise<string> {
  const cookieStore = await cookies()
  let token = cookieStore.get(CSRF_COOKIE_NAME)?.value

  // 如果没有有效的 token，生成新的
  if (!token) {
    token = generateCSRFToken()
    cookieStore.set(CSRF_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: CSRF_TOKEN_EXPIRY / 1000,
      path: '/',
    })
  }

  return token
}

/**
 * 获取 CSRF Token（用于客户端）
 */
export async function getCSRFToken(): Promise<string> {
  const cookieStore = await cookies()
  const token = cookieStore.get(CSRF_COOKIE_NAME)?.value
  return token || ''
}

/**
 * 验证 CSRF Token
 * @param request Next.js 请求对象
 * @returns 验证结果
 */
export async function validateCSRFToken(request: NextRequest): Promise<boolean> {
  // GET、HEAD、OPTIONS 请求不需要 CSRF 验证
  const safeMethod = ['GET', 'HEAD', 'OPTIONS'].includes(request.method)
  if (safeMethod) {
    return true
  }

  const cookieStore = await cookies()
  const cookieToken = cookieStore.get(CSRF_COOKIE_NAME)?.value
  const headerToken = request.headers.get(CSRF_HEADER_NAME)

  // 两者都必须存在且相等
  if (!cookieToken || !headerToken) {
    return false
  }

  // 使用时间安全比较
  try {
    return crypto.timingSafeEqual(
      Buffer.from(cookieToken),
      Buffer.from(headerToken)
    )
  } catch {
    return false
  }
}

/**
 * CSRF 验证中间件结果
 */
export interface CSRFValidationResult {
  valid: boolean
  error?: string
}

/**
 * 验证请求的 CSRF Token（带详细错误）
 */
export async function validateCSRF(request: NextRequest): Promise<CSRFValidationResult> {
  // 安全方法不需要验证
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    return { valid: true }
  }

  const cookieStore = await cookies()
  const cookieToken = cookieStore.get(CSRF_COOKIE_NAME)?.value
  const headerToken = request.headers.get(CSRF_HEADER_NAME)

  if (!cookieToken) {
    return { valid: false, error: '缺少 CSRF Cookie' }
  }

  if (!headerToken) {
    return { valid: false, error: '缺少 CSRF Header' }
  }

  try {
    const isValid = crypto.timingSafeEqual(
      Buffer.from(cookieToken),
      Buffer.from(headerToken)
    )
    if (!isValid) {
      return { valid: false, error: 'CSRF Token 不匹配' }
    }
    return { valid: true }
  } catch {
    return { valid: false, error: 'CSRF Token 验证失败' }
  }
}

/**
 * 需要 CSRF 保护的路径模式
 */
export const CSRF_PROTECTED_PATHS = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/generate',
  '/api/payment/create',
  '/api/user/favorites',
  '/api/admin',
]

/**
 * 检查路径是否需要 CSRF 保护
 */
export function requiresCSRFProtection(pathname: string): boolean {
  return CSRF_PROTECTED_PATHS.some((path) => pathname.startsWith(path))
}
