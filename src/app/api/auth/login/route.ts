import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyPassword, signToken } from '@/lib/auth'
import { cookies } from 'next/headers'
import { logger } from '@/lib/logger'
import { checkRateLimit, RATE_LIMITS, getClientIP } from '@/lib/rate-limit'
import { loginSchema, validateRequest } from '@/lib/validations'
import { setCSRFCookie } from '@/lib/csrf'

export async function POST(req: NextRequest) {
  const ip = getClientIP(req)

  try {
    // 速率限制检查
    const rateLimit = await checkRateLimit(ip, RATE_LIMITS.login)
    if (!rateLimit.allowed) {
      await logger.warn('auth', `登录速率限制触发: ${ip}`)
      return NextResponse.json(
        { error: rateLimit.message },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimit.limit.toString(),
            'X-RateLimit-Remaining': rateLimit.remaining.toString(),
            'X-RateLimit-Reset': rateLimit.resetAt.toString(),
            'Retry-After': Math.ceil((rateLimit.resetAt - Date.now()) / 1000).toString(),
          },
        }
      )
    }

    // 参数校验
    const body = await req.json()
    const validation = validateRequest(loginSchema, body)
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const { phone, email, password } = validation.data

    // 查找用户
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          phone ? { phone } : {},
          email ? { email } : {},
        ].filter(c => Object.keys(c).length > 0),
      },
    })

    if (!user || !(await verifyPassword(password, user.password))) {
      await logger.warn('auth', `登录失败: ${phone || email}`, { ip })
      return NextResponse.json({ error: '账号或密码错误' }, { status: 401 })
    }

    // 生成 Token 并设置 Cookie
    const token = signToken(user.id)
    const cookieStore = await cookies()
    cookieStore.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 天
      path: '/',
    })

    // 设置 CSRF Cookie
    await setCSRFCookie()

    await logger.info('auth', `用户登录成功: ${user.id}`, { ip })

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        phone: user.phone,
        email: user.email,
        nickname: user.nickname,
        memberType: user.memberType,
      },
    })
  } catch (error) {
    console.error('Login error:', error)
    await logger.error('auth', '登录处理失败', { error: String(error), ip })
    return NextResponse.json({ error: '登录失败，请稍后重试' }, { status: 500 })
  }
}
