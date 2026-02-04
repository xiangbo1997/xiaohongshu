import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAdminSession } from '@/lib/admin-auth'

// 获取兑换码统计
export async function GET(req: NextRequest) {
  try {
    // 验证管理员权限
    const { isAdmin } = await getAdminSession()
    if (!isAdmin) {
      return NextResponse.json({ error: '未授权' }, { status: 401 })
    }

    // 获取统计数据
    const [
      totalCodes,
      activeCodes,
      usedCodes,
      expiredCodes,
      totalRedemptions,
      recentRedemptions,
    ] = await Promise.all([
      // 总兑换码数
      prisma.redemptionCode.count(),
      // 有效兑换码数
      prisma.redemptionCode.count({ where: { status: 'ACTIVE' } }),
      // 已使用的兑换码数
      prisma.redemptionCode.count({ where: { status: 'DEPLETED' } }),
      // 已过期兑换码数
      prisma.redemptionCode.count({ where: { status: 'EXPIRED' } }),
      // 总兑换次数
      prisma.redemptionRecord.count(),
      // 最近 7 天的兑换次数
      prisma.redemptionRecord.count({
        where: {
          redeemedAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
    ])

    // 按奖励类型统计
    const byRewardType = await prisma.redemptionRecord.groupBy({
      by: ['rewardType'],
      _count: true,
    })

    // 最近 30 天每天兑换趋势
    const dailyTrend = await prisma.$queryRaw`
      SELECT
        DATE(redeemed_at) as date,
        COUNT(*) as count
      FROM redemption_records
      WHERE redeemed_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(redeemed_at)
      ORDER BY date
    `

    return NextResponse.json({
      totalCodes,
      activeCodes,
      usedCodes,
      expiredCodes,
      totalRedemptions,
      recentRedemptions,
      byRewardType: byRewardType.map((item) => ({
        type: item.rewardType,
        count: item._count,
      })),
      dailyTrend,
    })
  } catch (error) {
    console.error('Get redemption stats error:', error)
    return NextResponse.json({ error: '获取统计数据失败' }, { status: 500 })
  }
}
