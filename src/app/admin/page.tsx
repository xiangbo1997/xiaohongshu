'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, FileText, CreditCard, TrendingUp, Settings, ScrollText, LogOut, UserCog, Ticket, Coins } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface Stats {
  overview: {
    userCount: number
    generationCount: number
    orderCount: number
    todayUsers: number
    todayGenerations: number
    totalRevenue: number
  }
  last7Days: {
    date: string
    users: number
    generations: number
    revenue: number
  }[]
}

export default function AdminPage() {
  const router = useRouter()
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  const handleLogout = async () => {
    await fetch('/api/admin/login', { method: 'DELETE' })
    router.push('/admin/login')
  }

  useEffect(() => {
    fetch('/api/admin/stats')
      .then((res) => res.json())
      .then((data) => {
        setStats(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-700">加载中...</p>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-700">加载失败</p>
      </div>
    )
  }

  const overviewCards = [
    { title: '总用户数', value: stats.overview.userCount, icon: Users, color: 'text-blue-500' },
    { title: '今日新增', value: stats.overview.todayUsers, icon: TrendingUp, color: 'text-green-500' },
    { title: '总生成次数', value: stats.overview.generationCount, icon: FileText, color: 'text-purple-500' },
    { title: '今日生成', value: stats.overview.todayGenerations, icon: FileText, color: 'text-orange-500' },
    { title: '付费订单', value: stats.overview.orderCount, icon: CreditCard, color: 'text-pink-500' },
    {
      title: '总收入',
      value: `¥${(stats.overview.totalRevenue / 100).toFixed(2)}`,
      icon: CreditCard,
      color: 'text-red-500',
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">管理后台</h1>
                  <div className="flex items-center gap-2">
            <Link
              href="/admin/codes"
              className="flex items-center gap-2 px-4 py-2 text-gray-800 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Ticket className="h-5 w-5" />
              <span>兑换码</span>
            </Link>
            <Link
              href="/admin/points-config"
              className="flex items-center gap-2 px-4 py-2 text-gray-800 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Coins className="h-5 w-5" />
              <span>点数配置</span>
            </Link>
            <Link
              href="/admin/users"
              className="flex items-center gap-2 px-4 py-2 text-gray-800 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <UserCog className="h-5 w-5" />
              <span>用户管理</span>
            </Link>
            <Link
              href="/admin/logs"
              className="flex items-center gap-2 px-4 py-2 text-gray-800 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ScrollText className="h-5 w-5" />
              <span>系统日志</span>
            </Link>
            <Link
              href="/admin/settings"
              className="flex items-center gap-2 px-4 py-2 text-gray-800 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Settings className="h-5 w-5" />
              <span>系统设置</span>
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut className="h-5 w-5" />
              <span>退出</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* 概览卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {overviewCards.map((card, index) => (
            <Card key={index}>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-700">{card.title}</p>
                    <p className="text-xl font-bold mt-1">{card.value}</p>
                  </div>
                  <card.icon className={`h-8 w-8 ${card.color} opacity-80`} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 近7天数据 */}
        <Card>
          <CardHeader>
            <CardTitle>近7天数据</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-4">日期</th>
                    <th className="text-right py-2 px-4">新增用户</th>
                    <th className="text-right py-2 px-4">生成次数</th>
                    <th className="text-right py-2 px-4">收入</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.last7Days.map((day) => (
                    <tr key={day.date} className="border-b hover:bg-gray-50">
                      <td className="py-2 px-4">{day.date}</td>
                      <td className="text-right py-2 px-4">{day.users}</td>
                      <td className="text-right py-2 px-4">{day.generations}</td>
                      <td className="text-right py-2 px-4">¥{(day.revenue / 100).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
