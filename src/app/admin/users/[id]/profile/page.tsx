'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import {
  User,
  Calendar,
  Clock,
  TrendingUp,
  FileText,
  CreditCard,
  Activity,
} from 'lucide-react'

interface UserProfile {
  user: {
    id: string
    phone: string | null
    email: string | null
    nickname: string | null
    memberType: string
    memberExpire: string | null
    todayUsage: number
    totalUsage: number
    createdAt: string
    lastUsageDate: string
  }
  stats: {
    totalGenerations: number
    avgDailyUsage: number
    activeDays: number
    totalSpent: number
    orderCount: number
  }
  contentTypeStats: Record<string, number>
  categoryStats: Record<string, number>
  aiProviderStats: Record<string, number>
  hourlyStats: number[]
  weekdayStats: number[]
  last30Days: { date: string; count: number }[]
  recentGenerations: {
    id: string
    contentType: string
    category: string | null
    topic: string
    aiProvider: string
    title: string
    createdAt: string
  }[]
}

const contentTypeLabels: Record<string, string> = {
  zhongcao: '种草笔记',
  tutorial: '教程攻略',
  life: '生活日常',
}

const categoryLabels: Record<string, string> = {
  beauty: '美妆护肤',
  food: '美食探店',
  fashion: '穿搭时尚',
  travel: '旅行出游',
  fitness: '健身运动',
  tech: '数码科技',
  home: '家居生活',
  pet: '萌宠日常',
  general: '通用',
}

const memberTypeLabels: Record<string, string> = {
  FREE: '免费用户',
  DAY: '日卡会员',
  MONTH: '月卡会员',
  YEAR: '年卡会员',
}

const weekdayLabels = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

export default function UserProfilePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/admin/users/${id}/profile`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          console.error(data.error)
        } else {
          setProfile(data)
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-700">加载中...</p>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-700">用户不存在</p>
      </div>
    )
  }

  const { user, stats, contentTypeStats, categoryStats, aiProviderStats, hourlyStats, weekdayStats, last30Days, recentGenerations } = profile

  const maxHourly = Math.max(...hourlyStats, 1)
  const maxDaily = Math.max(...last30Days.map((d) => d.count), 1)

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center space-x-4">
            <Link href="/admin/users" className="text-gray-700 hover:text-gray-700">
              ← 返回用户列表
            </Link>
            <h1 className="text-xl font-bold">用户画像</h1>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* 用户基本信息 */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-start gap-6">
            <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center">
              <User className="w-10 h-10 text-orange-500" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold">
                {user.nickname || '未设置昵称'}
              </h2>
              <p className="text-gray-700 mt-1">
                {user.phone || user.email || user.id}
              </p>
              <div className="flex items-center gap-4 mt-3">
                <span
                  className={`px-3 py-1 text-sm rounded-full ${
                    user.memberType === 'FREE'
                      ? 'bg-gray-100 text-gray-800'
                      : 'bg-orange-100 text-orange-800'
                  }`}
                >
                  {memberTypeLabels[user.memberType]}
                </span>
                {user.memberExpire && (
                  <span className="text-sm text-gray-700">
                    到期：{new Date(user.memberExpire).toLocaleDateString('zh-CN')}
                  </span>
                )}
              </div>
            </div>
            <div className="text-right text-sm text-gray-700">
              <p>注册时间：{new Date(user.createdAt).toLocaleDateString('zh-CN')}</p>
              <p>最后使用：{new Date(user.lastUsageDate).toLocaleDateString('zh-CN')}</p>
            </div>
          </div>
        </div>

        {/* 核心指标 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-700">总生成次数</p>
                <p className="text-2xl font-bold">{stats.totalGenerations}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-700">日均使用</p>
                <p className="text-2xl font-bold">{stats.avgDailyUsage}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Calendar className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-700">活跃天数</p>
                <p className="text-2xl font-bold">{stats.activeDays}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <CreditCard className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-700">累计消费</p>
                <p className="text-2xl font-bold">¥{(stats.totalSpent / 100).toFixed(2)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* 使用偏好 */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* 内容类型偏好 */}
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4" />
              内容类型偏好
            </h3>
            {Object.keys(contentTypeStats).length === 0 ? (
              <p className="text-gray-700 text-sm">暂无数据</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(contentTypeStats)
                  .sort((a, b) => b[1] - a[1])
                  .map(([type, count]) => (
                    <div key={type}>
                      <div className="flex justify-between text-sm mb-1">
                        <span>{contentTypeLabels[type] || type}</span>
                        <span className="text-gray-700">{count}次</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{
                            width: `${(count / stats.totalGenerations) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* 垂类偏好 */}
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4" />
              垂类偏好
            </h3>
            {Object.keys(categoryStats).length === 0 ? (
              <p className="text-gray-700 text-sm">暂无数据</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(categoryStats)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 5)
                  .map(([cat, count]) => (
                    <div key={cat}>
                      <div className="flex justify-between text-sm mb-1">
                        <span>{categoryLabels[cat] || cat}</span>
                        <span className="text-gray-700">{count}次</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-purple-500 rounded-full"
                          style={{
                            width: `${(count / stats.totalGenerations) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* AI 提供商偏好 */}
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4" />
              AI 模型偏好
            </h3>
            {Object.keys(aiProviderStats).length === 0 ? (
              <p className="text-gray-700 text-sm">暂无数据</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(aiProviderStats)
                  .sort((a, b) => b[1] - a[1])
                  .map(([provider, count]) => (
                    <div key={provider}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="capitalize">{provider}</span>
                        <span className="text-gray-700">{count}次</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500 rounded-full"
                          style={{
                            width: `${(count / stats.totalGenerations) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>

        {/* 使用时间分布 */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* 每小时分布 */}
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              每日时段分布
            </h3>
            <div className="flex items-end gap-1 h-32">
              {hourlyStats.map((count, hour) => (
                <div
                  key={hour}
                  className="flex-1 bg-orange-200 hover:bg-orange-300 rounded-t transition-colors relative group"
                  style={{ height: `${(count / maxHourly) * 100}%`, minHeight: count > 0 ? '4px' : '0' }}
                >
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 whitespace-nowrap">
                    {hour}:00 - {count}次
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between text-xs text-gray-700 mt-2">
              <span>0时</span>
              <span>6时</span>
              <span>12时</span>
              <span>18时</span>
              <span>24时</span>
            </div>
          </div>

          {/* 每周分布 */}
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              每周分布
            </h3>
            <div className="space-y-2">
              {weekdayStats.map((count, day) => {
                const maxWeekday = Math.max(...weekdayStats, 1)
                return (
                  <div key={day} className="flex items-center gap-3">
                    <span className="w-8 text-sm text-gray-700">{weekdayLabels[day]}</span>
                    <div className="flex-1 h-6 bg-gray-100 rounded overflow-hidden">
                      <div
                        className="h-full bg-blue-400 rounded flex items-center justify-end pr-2"
                        style={{ width: `${(count / maxWeekday) * 100}%`, minWidth: count > 0 ? '30px' : '0' }}
                      >
                        {count > 0 && <span className="text-xs text-white">{count}</span>}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* 近30天趋势 */}
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            近30天使用趋势
          </h3>
          <div className="flex items-end gap-1 h-32">
            {last30Days.map((day) => (
              <div
                key={day.date}
                className="flex-1 bg-green-200 hover:bg-green-300 rounded-t transition-colors relative group"
                style={{ height: `${(day.count / maxDaily) * 100}%`, minHeight: day.count > 0 ? '4px' : '0' }}
              >
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-10">
                  {day.date}: {day.count}次
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-between text-xs text-gray-700 mt-2">
            <span>{last30Days[0]?.date}</span>
            <span>{last30Days[last30Days.length - 1]?.date}</span>
          </div>
        </div>

        {/* 最近生成记录 */}
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <FileText className="w-4 h-4" />
            最近生成记录
          </h3>
          {recentGenerations.length === 0 ? (
            <p className="text-gray-700 text-sm">暂无记录</p>
          ) : (
            <div className="space-y-3">
              {recentGenerations.map((gen) => (
                <div
                  key={gen.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium">{gen.title}</p>
                    <p className="text-sm text-gray-700">
                      {contentTypeLabels[gen.contentType] || gen.contentType}
                      {gen.category && ` · ${categoryLabels[gen.category] || gen.category}`}
                      {` · ${gen.aiProvider}`}
                    </p>
                  </div>
                  <span className="text-sm text-gray-700">
                    {new Date(gen.createdAt).toLocaleString('zh-CN')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
