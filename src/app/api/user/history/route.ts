import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'

// 获取历史记录
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')

    const [generations, total] = await Promise.all([
      prisma.generation.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          favorites: {
            where: { userId: user.id },
          },
        },
      }),
      prisma.generation.count({ where: { userId: user.id } }),
    ])

    const data = generations.map((g) => ({
      ...g,
      isFavorite: g.favorites.length > 0,
      favorites: undefined,
    }))

    return NextResponse.json({
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Get history error:', error)
    return NextResponse.json({ error: '获取历史记录失败' }, { status: 500 })
  }
}
