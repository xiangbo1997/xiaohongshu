'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  User,
  Calendar,
  Clock,
  TrendingUp,
  FileText,
  Activity,
  ArrowLeft,
  Copy,
  Check,
} from 'lucide-react'

interface UserProfile {
  user: {
    id: string
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
    content: string
    tags: string[]
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

export default function MyProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/user/profile')
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
  }, [])

  const copyContent = async (id: string, content: string) => {
    await navigator.clipboard.writeText(content)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-pink-50 flex items-center justify-center">
        <p className="text-gray-700">加载中...</p>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-pink-50 flex flex-col items-center justify-center gap-4">
        <p className="text-gray-700">请先登录</p>
        <Link href="/" className="text-orange-500 hover:underline">
          返回首页
        </Link>
      </div>
    )
  }

  const { user, stats, contentTypeStats, categoryStats, aiProviderStats, hourlyStats, weekdayStats, last30Days, recentGenerations } = profile

  const maxHourly = Math.max(...hourlyStats, 1)
  const maxDaily = Math.max(...last30Days.map((d) => d.count), 1)

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-pink-50">
      {/* 顶部导航 */}
      <nav className="bg-white/80 backdrop-blur-sm shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 text-gray-800 hover:text-gray-900">
              <ArrowLeft className="w-5 h-5" />
              <span>返回首页</span>
            </Link>
            <h1 className="text-lg font-bold text-gray-900">我的使用记录</h1>
            <div className="w-20" />
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* 用户信息卡片 */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-pink-400 rounded-full flex items-center justify-center">
              <User className="w-8 h-8 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-900">
                {user.nickname || '小红书创作者'}
              </h2>
              <div className="flex items-center gap-3 mt-1">
                <span
                  className={`px-3 py-1 text-xs rounded-full ${
                    user.memberType === 'FREE'
                      ? 'bg-gray-100 text-gray-800'
                      : 'bg-gradient-to-r from-orange-400 to-pink-400 text-white'
                  }`}
                >
                  {memberTypeLabels[user.memberType]}
                </span>
                {user.memberExpire && user.memberType !== 'FREE' && (
                  <span className="text-xs text-gray-700">
                    {new Date(user.memberExpire).toLocaleDateString('zh-CN')} 到期
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 核心指标 */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl shadow-sm p-4 text-center">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.totalGenerations}</p>
            <p className="text-xs text-gray-700">总生成次数</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm p-4 text-center">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.avgDailyUsage}</p>
            <p className="text-xs text-gray-700">日均使用</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm p-4 text-center">
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <Calendar className="w-5 h-5 text-purple-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.activeDays}</p>
            <p className="text-xs text-gray-700">活跃天数</p>
          </div>
        </div>

        {/* 使用偏好 */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-orange-500" />
            我的创作偏好
          </h3>
          <div className="grid grid-cols-3 gap-4">
            {/* 内容类型 */}
            <div>
              <p className="text-xs text-gray-700 mb-2">内容类型</p>
              {Object.keys(contentTypeStats).length === 0 ? (
                <p className="text-gray-700 text-sm">暂无</p>
              ) : (
                <div className="space-y-2">
                  {Object.entries(contentTypeStats)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 3)
                    .map(([type, count]) => (
                      <div key={type} className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-blue-400 to-blue-500 rounded-full"
                            style={{ width: `${(count / stats.totalGenerations) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-800 w-16 truncate">
                          {contentTypeLabels[type] || type}
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* 垂类 */}
            <div>
              <p className="text-xs text-gray-700 mb-2">常用垂类</p>
              {Object.keys(categoryStats).length === 0 ? (
                <p className="text-gray-700 text-sm">暂无</p>
              ) : (
                <div className="space-y-2">
                  {Object.entries(categoryStats)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 3)
                    .map(([cat, count]) => (
                      <div key={cat} className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-purple-400 to-purple-500 rounded-full"
                            style={{ width: `${(count / stats.totalGenerations) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-800 w-16 truncate">
                          {categoryLabels[cat] || cat}
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* AI 模型 */}
            <div>
              <p className="text-xs text-gray-700 mb-2">AI 模型</p>
              {Object.keys(aiProviderStats).length === 0 ? (
                <p className="text-gray-700 text-sm">暂无</p>
              ) : (
                <div className="space-y-2">
                  {Object.entries(aiProviderStats)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 3)
                    .map(([provider, count]) => (
                      <div key={provider} className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-green-400 to-green-500 rounded-full"
                            style={{ width: `${(count / stats.totalGenerations) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-800 w-16 truncate capitalize">
                          {provider}
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 使用时间分布 */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* 每小时分布 */}
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-orange-500" />
              活跃时段
            </h3>
            <div className="flex items-end gap-0.5 h-20">
              {hourlyStats.map((count, hour) => (
                <div
                  key={hour}
                  className="flex-1 bg-gradient-to-t from-orange-300 to-orange-400 rounded-t transition-all hover:from-orange-400 hover:to-orange-500"
                  style={{ height: `${(count / maxHourly) * 100}%`, minHeight: count > 0 ? '4px' : '0' }}
                  title={`${hour}:00 - ${count}次`}
                />
              ))}
            </div>
            <div className="flex justify-between text-xs text-gray-700 mt-1">
              <span>0时</span>
              <span>12时</span>
              <span>24时</span>
            </div>
          </div>

          {/* 每周分布 */}
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-orange-500" />
              每周分布
            </h3>
            <div className="space-y-1">
              {weekdayStats.map((count, day) => {
                const maxWeekday = Math.max(...weekdayStats, 1)
                return (
                  <div key={day} className="flex items-center gap-2">
                    <span className="w-6 text-xs text-gray-700">{weekdayLabels[day].slice(1)}</span>
                    <div className="flex-1 h-4 bg-gray-100 rounded overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-300 to-blue-400 rounded"
                        style={{ width: `${(count / maxWeekday) * 100}%` }}
                      />
                    </div>
                    <span className="w-6 text-xs text-gray-700 text-right">{count}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* 近30天趋势 */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2 text-sm">
            <TrendingUp className="w-4 h-4 text-orange-500" />
            近30天趋势
          </h3>
          <div className="flex items-end gap-0.5 h-16">
            {last30Days.map((day) => (
              <div
                key={day.date}
                className="flex-1 bg-gradient-to-t from-green-300 to-green-400 rounded-t transition-all hover:from-green-400 hover:to-green-500"
                style={{ height: `${(day.count / maxDaily) * 100}%`, minHeight: day.count > 0 ? '4px' : '0' }}
                title={`${day.date}: ${day.count}次`}
              />
            ))}
          </div>
          <div className="flex justify-between text-xs text-gray-700 mt-1">
            <span>{last30Days[0]?.date.slice(5)}</span>
            <span>{last30Days[last30Days.length - 1]?.date.slice(5)}</span>
          </div>
        </div>

        {/* 最近生成记录 */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <FileText className="w-4 h-4 text-orange-500" />
            最近生成的文案
          </h3>
          {recentGenerations.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-700">还没有生成过文案</p>
              <Link href="/" className="text-orange-500 text-sm hover:underline mt-2 inline-block">
                去生成第一篇 →
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {recentGenerations.map((gen) => (
                <div
                  key={gen.id}
                  className="border border-gray-100 rounded-xl overflow-hidden"
                >
                  <div
                    className="p-3 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => setExpandedId(expandedId === gen.id ? null : gen.id)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{gen.title}</p>
                        <p className="text-xs text-gray-700 mt-1">
                          {contentTypeLabels[gen.contentType] || gen.contentType}
                          {gen.category && ` · ${categoryLabels[gen.category] || gen.category}`}
                        </p>
                      </div>
                      <span className="text-xs text-gray-700 whitespace-nowrap">
                        {new Date(gen.createdAt).toLocaleDateString('zh-CN')}
                      </span>
                    </div>
                  </div>
                  {expandedId === gen.id && (
                    <div className="px-3 pb-3 border-t border-gray-100">
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg text-sm text-gray-700 whitespace-pre-wrap">
                        {gen.content}
                      </div>
                      {gen.tags && gen.tags.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {gen.tags.map((tag, i) => (
                            <span key={i} className="text-xs text-orange-500">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                      <button
                        onClick={() => copyContent(gen.id, gen.content)}
                        className="mt-3 flex items-center gap-1 text-xs text-gray-700 hover:text-orange-500"
                      >
                        {copiedId === gen.id ? (
                          <>
                            <Check className="w-3 h-3" />
                            已复制
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            复制内容
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
