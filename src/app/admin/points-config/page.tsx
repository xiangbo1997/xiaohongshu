'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Save, RefreshCw, Coins, Crown, Sparkles } from 'lucide-react'

interface PointsConfig {
  dailyFreePoints: {
    free: number
    vip: number
  }
  generation: {
    basePointsPerVersion: number
  }
}

const DEFAULT_CONFIG: PointsConfig = {
  dailyFreePoints: {
    free: 3,
    vip: 13,
  },
  generation: {
    basePointsPerVersion: 3,
  },
}

export default function PointsConfigPage() {
  const [config, setConfig] = useState<PointsConfig>(DEFAULT_CONFIG)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    fetchConfig()
  }, [])

  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/admin/points-config')
      if (res.ok) {
        const data = await res.json()
        setConfig(data)
      }
    } catch {
      setMessage({ type: 'error', text: '加载配置失败' })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)

    try {
      const res = await fetch('/api/admin/points-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })

      const data = await res.json()

      if (res.ok) {
        setMessage({ type: 'success', text: '配置保存成功！' })
      } else {
        setMessage({ type: 'error', text: data.error || '保存失败' })
      }
    } catch {
      setMessage({ type: 'error', text: '保存失败' })
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    setConfig(DEFAULT_CONFIG)
    setMessage({ type: 'success', text: '已重置为默认配置，请点击保存生效' })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-700">加载中...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航 */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="text-gray-700 hover:text-gray-700">
              ← 返回
            </Link>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Coins className="h-5 w-5 text-orange-500" />
              点数配置
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="px-4 py-2 text-gray-800 border rounded-lg hover:bg-gray-50 flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              重置默认
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 disabled:opacity-50 flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {saving ? '保存中...' : '保存配置'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {message && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* 每日免费点数配置 */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-yellow-500" />
            每日免费点数
          </h2>
          <p className="text-sm text-gray-700 mb-6">
            配置不同用户类型每天可获得的免费点数，每天 0 点自动重置
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 普通用户 */}
            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                  <span className="text-lg">👤</span>
                </div>
                <div>
                  <h3 className="font-medium">普通用户</h3>
                  <p className="text-xs text-gray-700">未开通 VIP 的用户</p>
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-800 mb-1">每日免费点数</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={config.dailyFreePoints.free}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        dailyFreePoints: {
                          ...config.dailyFreePoints,
                          free: parseInt(e.target.value) || 0,
                        },
                      })
                    }
                    className="w-24 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 text-center text-lg font-semibold"
                  />
                  <span className="text-gray-700">点/天</span>
                </div>
              </div>
            </div>

            {/* VIP 用户 */}
            <div className="border border-yellow-200 bg-yellow-50/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                  <Crown className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <h3 className="font-medium text-yellow-800">VIP 用户</h3>
                  <p className="text-xs text-yellow-600">已开通 VIP 会员的用户</p>
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-800 mb-1">每日免费点数</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={config.dailyFreePoints.vip}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        dailyFreePoints: {
                          ...config.dailyFreePoints,
                          vip: parseInt(e.target.value) || 0,
                        },
                      })
                    }
                    className="w-24 px-3 py-2 border border-yellow-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 text-center text-lg font-semibold bg-white"
                  />
                  <span className="text-gray-700">点/天</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 生成消耗配置 */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
            <Coins className="h-5 w-5 text-orange-500" />
            生成消耗配置
          </h2>
          <p className="text-sm text-gray-700 mb-6">
            配置每次生成内容消耗的点数，生成多个版本时按版本数量计算
          </p>

          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-medium">每版本消耗点数</h3>
                <p className="text-xs text-gray-700">生成 N 个版本 = 基础点数 × N</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                max="10"
                value={config.generation.basePointsPerVersion}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    generation: {
                      ...config.generation,
                      basePointsPerVersion: parseInt(e.target.value) || 1,
                    },
                  })
                }
                className="w-24 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 text-center text-lg font-semibold"
              />
              <span className="text-gray-700">点/版本</span>
            </div>

            {/* 消耗示例 */}
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-800 font-medium mb-2">消耗示例：</p>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div className="text-center p-2 bg-white rounded border">
                  <div className="text-gray-700">1 个版本</div>
                  <div className="font-semibold text-orange-600">
                    {config.generation.basePointsPerVersion} 点
                  </div>
                </div>
                <div className="text-center p-2 bg-white rounded border">
                  <div className="text-gray-700">2 个版本</div>
                  <div className="font-semibold text-orange-600">
                    {config.generation.basePointsPerVersion * 2} 点
                  </div>
                </div>
                <div className="text-center p-2 bg-white rounded border">
                  <div className="text-gray-700">3 个版本</div>
                  <div className="font-semibold text-orange-600">
                    {config.generation.basePointsPerVersion * 3} 点
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 配置说明 */}
        <div className="bg-blue-50 rounded-xl p-6">
          <h3 className="font-medium text-blue-800 mb-2">配置说明</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• 每日免费点数在每天 0 点自动重置</li>
            <li>• 用户优先消耗每日免费点数，不足时扣除购买的点数</li>
            <li>• VIP 用户可以选择 AI 模型和生成多个版本</li>
            <li>• 普通用户只能使用默认模型，每次生成 1 个版本</li>
            <li>• 配置修改后立即生效（有 60 秒缓存）</li>
          </ul>
        </div>
      </main>
    </div>
  )
}
