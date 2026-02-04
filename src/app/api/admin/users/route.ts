import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { hashPassword } from '@/lib/auth'

// 获取用户列表
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || ''

    const where = search
      ? {
          OR: [
            { phone: { contains: search } },
            { email: { contains: search } },
            { nickname: { contains: search } },
          ],
        }
      : {}

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          phone: true,
          email: true,
          nickname: true,
          memberType: true,
          memberExpire: true,
          todayUsage: true,
          totalUsage: true,
          createdAt: true,
          _count: {
            select: { generations: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.user.count({ where }),
    ])

    return NextResponse.json({
      users: users.map((u) => ({
        ...u,
        generationCount: u._count.generations,
        _count: undefined,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('Get users error:', error)
    return NextResponse.json({ error: '获取用户列表失败' }, { status: 500 })
  }
}

// 创建用户
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { phone, email, password, nickname, memberType, memberExpire } = body

    if (!password) {
      return NextResponse.json({ error: '密码不能为空' }, { status: 400 })
    }

    if (!phone && !email) {
      return NextResponse.json({ error: '手机号或邮箱至少填一个' }, { status: 400 })
    }

    // 检查是否已存在
    if (phone) {
      const existing = await prisma.user.findUnique({ where: { phone } })
      if (existing) {
        return NextResponse.json({ error: '手机号已存在' }, { status: 400 })
      }
    }

    if (email) {
      const existing = await prisma.user.findUnique({ where: { email } })
      if (existing) {
        return NextResponse.json({ error: '邮箱已存在' }, { status: 400 })
      }
    }

    const hashedPassword = await hashPassword(password)

    const user = await prisma.user.create({
      data: {
        phone: phone || null,
        email: email || null,
        password: hashedPassword,
        nickname: nickname || null,
        memberType: memberType || 'FREE',
        memberExpire: memberExpire ? new Date(memberExpire) : null,
      },
      select: {
        id: true,
        phone: true,
        email: true,
        nickname: true,
        memberType: true,
        memberExpire: true,
        createdAt: true,
      },
    })

    return NextResponse.json({ success: true, user })
  } catch (error) {
    console.error('Create user error:', error)
    return NextResponse.json({ error: '创建用户失败' }, { status: 500 })
  }
}
