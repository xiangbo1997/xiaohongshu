import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { hashPassword } from '@/lib/auth'

// 获取单个用户
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const user = await prisma.user.findUnique({
      where: { id },
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
        updatedAt: true,
        _count: {
          select: { generations: true, orders: true },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 })
    }

    return NextResponse.json({
      ...user,
      generationCount: user._count.generations,
      orderCount: user._count.orders,
      _count: undefined,
    })
  } catch (error) {
    console.error('Get user error:', error)
    return NextResponse.json({ error: '获取用户失败' }, { status: 500 })
  }
}

// 更新用户
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    const { phone, email, password, nickname, memberType, memberExpire } = body

    // 检查用户是否存在
    const existing = await prisma.user.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 })
    }

    // 检查手机号是否被其他用户使用
    if (phone && phone !== existing.phone) {
      const phoneExists = await prisma.user.findUnique({ where: { phone } })
      if (phoneExists) {
        return NextResponse.json({ error: '手机号已被使用' }, { status: 400 })
      }
    }

    // 检查邮箱是否被其他用户使用
    if (email && email !== existing.email) {
      const emailExists = await prisma.user.findUnique({ where: { email } })
      if (emailExists) {
        return NextResponse.json({ error: '邮箱已被使用' }, { status: 400 })
      }
    }

    const updateData: Record<string, unknown> = {}

    if (phone !== undefined) updateData.phone = phone || null
    if (email !== undefined) updateData.email = email || null
    if (nickname !== undefined) updateData.nickname = nickname || null
    if (memberType !== undefined) updateData.memberType = memberType
    if (memberExpire !== undefined) {
      updateData.memberExpire = memberExpire ? new Date(memberExpire) : null
    }

    // 如果提供了新密码，则更新密码
    if (password) {
      updateData.password = await hashPassword(password)
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        phone: true,
        email: true,
        nickname: true,
        memberType: true,
        memberExpire: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({ success: true, user })
  } catch (error) {
    console.error('Update user error:', error)
    return NextResponse.json({ error: '更新用户失败' }, { status: 500 })
  }
}

// 删除用户
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // 检查用户是否存在
    const existing = await prisma.user.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 })
    }

    // 删除用户相关数据
    await prisma.$transaction([
      // 删除收藏
      prisma.favorite.deleteMany({ where: { userId: id } }),
      // 删除生成记录
      prisma.generation.deleteMany({ where: { userId: id } }),
      // 删除订单
      prisma.order.deleteMany({ where: { userId: id } }),
      // 删除用户
      prisma.user.delete({ where: { id } }),
    ])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete user error:', error)
    return NextResponse.json({ error: '删除用户失败' }, { status: 500 })
  }
}
