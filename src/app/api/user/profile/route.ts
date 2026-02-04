import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET() {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 })
    }

    const id = currentUser.id

    // 获取用户基本信息
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
        lastUsageDate: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 })
    }

    // 获取生成记录统计
    const generations = await prisma.generation.findMany({
      where: { userId: id },
      select: {
        id: true,
        contentType: true,
        category: true,
        aiProvider: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    // 计算统计数据
    const totalGenerations = generations.length

    // 按内容类型统计
    const contentTypeStats: Record<string, number> = {}
    generations.forEach((g) => {
      contentTypeStats[g.contentType] = (contentTypeStats[g.contentType] || 0) + 1
    })

    // 按垂类统计
    const categoryStats: Record<string, number> = {}
    generations.forEach((g) => {
      if (g.category) {
        categoryStats[g.category] = (categoryStats[g.category] || 0) + 1
      }
    })

    // 按 AI 提供商统计
    const aiProviderStats: Record<string, number> = {}
    generations.forEach((g) => {
      aiProviderStats[g.aiProvider] = (aiProviderStats[g.aiProvider] || 0) + 1
    })

    // 按小时统计使用时间分布
    const hourlyStats: number[] = new Array(24).fill(0)
    generations.forEach((g) => {
      const hour = new Date(g.createdAt).getHours()
      hourlyStats[hour]++
    })

    // 按星期统计
    const weekdayStats: number[] = new Array(7).fill(0)
    generations.forEach((g) => {
      const day = new Date(g.createdAt).getDay()
      weekdayStats[day]++
    })

    // 最近 30 天每日使用统计
    const last30Days: { date: string; count: number }[] = []
    const today = new Date()
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      last30Days.push({ date: dateStr, count: 0 })
    }

    generations.forEach((g) => {
      const dateStr = new Date(g.createdAt).toISOString().split('T')[0]
      const dayData = last30Days.find((d) => d.date === dateStr)
      if (dayData) {
        dayData.count++
      }
    })

    // 计算使用频率
    const firstGeneration = generations[generations.length - 1]
    const lastGeneration = generations[0]
    let avgDailyUsage = 0
    let activeDays = 0

    if (firstGeneration && lastGeneration) {
      const firstDate = new Date(firstGeneration.createdAt)
      const lastDate = new Date(lastGeneration.createdAt)
      const daysDiff = Math.max(1, Math.ceil((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24)) + 1)
      avgDailyUsage = totalGenerations / daysDiff

      // 计算活跃天数
      const uniqueDays = new Set(
        generations.map((g) => new Date(g.createdAt).toISOString().split('T')[0])
      )
      activeDays = uniqueDays.size
    }

    // 最近 10 次生成记录
    const recentGenerations = await prisma.generation.findMany({
      where: { userId: id },
      select: {
        id: true,
        contentType: true,
        category: true,
        topic: true,
        aiProvider: true,
        title: true,
        content: true,
        tags: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    })

    return NextResponse.json({
      user: {
        id: user.id,
        nickname: user.nickname,
        memberType: user.memberType,
        memberExpire: user.memberExpire,
        todayUsage: user.todayUsage,
        totalUsage: user.totalUsage,
        createdAt: user.createdAt,
        lastUsageDate: user.lastUsageDate,
      },
      stats: {
        totalGenerations,
        avgDailyUsage: Math.round(avgDailyUsage * 100) / 100,
        activeDays,
      },
      contentTypeStats,
      categoryStats,
      aiProviderStats,
      hourlyStats,
      weekdayStats,
      last30Days,
      recentGenerations,
    })
  } catch (error) {
    console.error('Get my profile error:', error)
    return NextResponse.json({ error: '获取使用记录失败' }, { status: 500 })
  }
}
