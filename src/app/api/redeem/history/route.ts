import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { REWARD_TYPE_LABELS } from '@/lib/redemption'

// 获取用户的兑换历史
export async function GET(req: NextRequest) {
  try {
    // 验证用户登录
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 })
    }

    const searchParams = req.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const [records, total] = await Promise.all([
      prisma.redemptionRecord.findMany({
        where: { userId: user.id },
        select: {
          id: true,
          code: true,
          rewardType: true,
          rewardValue: true,
          redeemedAt: true,
        },
        orderBy: { redeemedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.redemptionRecord.count({ where: { userId: user.id } }),
    ])

    return NextResponse.json({
      records: records.map((r) => ({
        ...r,
        rewardTypeLabel: REWARD_TYPE_LABELS[r.rewardType] || r.rewardType,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('Get redeem history error:', error)
    return NextResponse.json({ error: '获取兑换历史失败' }, { status: 500 })
  }
}
