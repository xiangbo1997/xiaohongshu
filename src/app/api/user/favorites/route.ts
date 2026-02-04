import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'

// 获取收藏列表
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')

    const [favorites, total] = await Promise.all([
      prisma.favorite.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { generation: true },
      }),
      prisma.favorite.count({ where: { userId: user.id } }),
    ])

    return NextResponse.json({
      data: favorites.map((f) => ({ ...f.generation, isFavorite: true })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Get favorites error:', error)
    return NextResponse.json({ error: '获取收藏失败' }, { status: 500 })
  }
}

// 添加/取消收藏
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const { generationId } = await req.json()
    if (!generationId) {
      return NextResponse.json({ error: '缺少参数' }, { status: 400 })
    }

    // 检查是否已收藏
    const existing = await prisma.favorite.findUnique({
      where: { userId_generationId: { userId: user.id, generationId } },
    })

    if (existing) {
      // 取消收藏
      await prisma.favorite.delete({ where: { id: existing.id } })
      return NextResponse.json({ success: true, isFavorite: false })
    } else {
      // 添加收藏
      await prisma.favorite.create({
        data: { userId: user.id, generationId },
      })
      return NextResponse.json({ success: true, isFavorite: true })
    }
  } catch (error) {
    console.error('Toggle favorite error:', error)
    return NextResponse.json({ error: '操作失败' }, { status: 500 })
  }
}
