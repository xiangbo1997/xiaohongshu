import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// 获取统计数据
export async function GET() {
  try {
    const [userCount, generationCount, orderCount, todayUsers, todayGenerations, revenue] = await Promise.all([
      prisma.user.count(),
      prisma.generation.count(),
      prisma.order.count({ where: { status: 'PAID' } }),
      prisma.user.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
      prisma.generation.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
      prisma.order.aggregate({
        where: { status: 'PAID' },
        _sum: { amount: true },
      }),
    ])

    // 最近7天数据
    const last7Days = await Promise.all(
      Array.from({ length: 7 }, (_, i) => {
        const date = new Date()
        date.setDate(date.getDate() - i)
        date.setHours(0, 0, 0, 0)
        const nextDate = new Date(date)
        nextDate.setDate(nextDate.getDate() + 1)

        return Promise.all([
          prisma.user.count({
            where: { createdAt: { gte: date, lt: nextDate } },
          }),
          prisma.generation.count({
            where: { createdAt: { gte: date, lt: nextDate } },
          }),
          prisma.order.aggregate({
            where: { status: 'PAID', paidAt: { gte: date, lt: nextDate } },
            _sum: { amount: true },
          }),
        ]).then(([users, generations, orders]) => ({
          date: date.toISOString().split('T')[0],
          users,
          generations,
          revenue: orders._sum.amount || 0,
        }))
      })
    )

    return NextResponse.json({
      overview: {
        userCount,
        generationCount,
        orderCount,
        todayUsers,
        todayGenerations,
        totalRevenue: revenue._sum.amount || 0,
      },
      last7Days: last7Days.reverse(),
    })
  } catch (error) {
    console.error('Get stats error:', error)
    return NextResponse.json({ error: '获取统计失败' }, { status: 500 })
  }
}
