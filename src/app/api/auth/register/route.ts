import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { hashPassword, signToken } from '@/lib/auth'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  try {
    const { phone, email, password } = await req.json()

    if (!password || (!phone && !email)) {
      return NextResponse.json({ error: '请填写完整信息' }, { status: 400 })
    }

    // 检查用户是否存在
    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ phone: phone || undefined }, { email: email || undefined }] },
    })

    if (existingUser) {
      return NextResponse.json({ error: '用户已存在' }, { status: 400 })
    }

    // 创建用户
    const hashedPassword = await hashPassword(password)
    const user = await prisma.user.create({
      data: {
        phone,
        email,
        password: hashedPassword,
        nickname: phone || email?.split('@')[0],
      },
    })

    // 设置 token
    const token = signToken(user.id)
    const cookieStore = await cookies()
    cookieStore.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
    })

    return NextResponse.json({ success: true, userId: user.id })
  } catch (error) {
    console.error('Register error:', error)
    return NextResponse.json({ error: '注册失败' }, { status: 500 })
  }
}
