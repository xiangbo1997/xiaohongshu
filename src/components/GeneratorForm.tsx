'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CONTENT_TYPES, CATEGORIES, STYLES, AI_PROVIDERS, ContentType, Category, Style, AIProvider, GenerateResult, UserSession } from '@/types'
import { Sparkles, Crown, Lock } from 'lucide-react'

interface GeneratorFormProps {
  user: UserSession | null
  onGenerate: (results: GenerateResult[]) => void
  onNeedLogin: () => void
  onNeedUpgrade: () => void
  disabled?: boolean
}

export function GeneratorForm({ user, onGenerate, onNeedLogin, onNeedUpgrade, disabled }: GeneratorFormProps) {
  const [contentType, setContentType] = useState<ContentType>('zhongcao')
  const [category, setCategory] = useState<Category>('general')
  const [topic, setTopic] = useState('')
  const [keywords, setKeywords] = useState('')
  const [style, setStyle] = useState<Style>('lively')
  const [aiProvider, setAiProvider] = useState<AIProvider>('claude')
  const [count, setCount] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [basePoints, setBasePoints] = useState(3) // 每版本消耗基础点数

  // 是否是 VIP 用户
  const isVip = user?.isVip ?? false

  // 获取点数配置
  useEffect(() => {
    fetch('/api/config/points')
      .then(res => res.json())
      .then(config => {
        if (config.generation?.basePointsPerVersion) {
          setBasePoints(config.generation.basePointsPerVersion)
        }
      })
      .catch(err => {
        console.error('Failed to load points config:', err)
        setBasePoints(3) // 失败时使用默认值
      })
  }, [])

  // 计算可用点数
  const getAvailablePoints = () => {
    if (!user) return 0
    const dailyFreeUsed = user.dailyFreeUsed || 0
    const dailyFreeRemaining = Math.max(0, user.dailyFreeLimit - dailyFreeUsed)
    return dailyFreeRemaining + (user.points || 0)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!topic.trim()) {
      setError('请输入主题')
      return
    }

    // 检查点数是否足够
    const pointsNeeded = basePoints * count
    if (getAvailablePoints() < pointsNeeded) {
      setError(`点数不足，需要 ${pointsNeeded} 点，当前可用 ${getAvailablePoints()} 点`)
      return
    }

    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentType,
          category,
          topic,
          keywords,
          style,
          aiProvider: isVip ? aiProvider : 'claude', // 非 VIP 只能用默认模型
          count: isVip ? count : 1, // 非 VIP 只能生成 1 个
        }),
      })

      const data = await res.json()

      if (res.status === 401 || res.status === 403) {
        if (data.error?.includes('登录')) {
          onNeedLogin()
        } else {
          setError(data.error)
        }
        return
      }

      if (!res.ok) {
        setError(data.error || '生成失败')
        return
      }

      onGenerate(data.results)
    } catch {
      setError('网络错误，请重试')
    } finally {
      setLoading(false)
    }
  }

  const contentTypeOptions = Object.entries(CONTENT_TYPES).map(([value, { name }]) => ({ value, label: name }))
  const categoryOptions = Object.entries(CATEGORIES).map(([value, { name, emoji }]) => ({ value, label: `${emoji} ${name}` }))
  const styleOptions = Object.entries(STYLES).map(([value, { name }]) => ({ value, label: name }))
  const aiProviderOptions = Object.entries(AI_PROVIDERS).map(([value, { name }]) => ({ value, label: name }))
  const countOptions = [1, 2, 3].map((n) => ({ value: n.toString(), label: `${n} 个版本` }))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-red-500" />
          生成爆款文案
          {user && (
            <span className="ml-auto text-sm font-normal text-gray-700">
              可用点数：<span className="text-orange-600 font-medium">{getAvailablePoints()}</span>
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">内容类型</label>
              <Select
                options={contentTypeOptions}
                value={contentType}
                onChange={(e) => setContentType(e.target.value as ContentType)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">垂直领域</label>
              <Select
                options={categoryOptions}
                value={category}
                onChange={(e) => setCategory(e.target.value as Category)}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              主题 <span className="text-red-500">*</span>
            </label>
            <Textarea
              placeholder="例如：分享一款超好用的防晒霜，或者：三天瘦五斤的减肥食谱"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">关键词（可选）</label>
            <Input
              placeholder="用逗号分隔，如：平价、学生党、敏感肌"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">文案风格</label>
              <Select options={styleOptions} value={style} onChange={(e) => setStyle(e.target.value as Style)} />
            </div>
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                AI 模型
                {!isVip && (
                  <span className="text-xs text-yellow-600 bg-yellow-50 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                    <Crown className="h-3 w-3" />
                    VIP
                  </span>
                )}
              </label>
              {isVip ? (
                <Select
                  options={aiProviderOptions}
                  value={aiProvider}
                  onChange={(e) => setAiProvider(e.target.value as AIProvider)}
                />
              ) : (
                <div
                  onClick={onNeedUpgrade}
                  className="w-full px-3 py-2 border rounded-lg bg-gray-50 text-gray-700 cursor-pointer hover:bg-gray-100 flex items-center justify-between"
                >
                  <span>默认模型</span>
                  <Lock className="h-4 w-4 text-gray-700" />
                </div>
              )}
            </div>
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                生成数量
                {!isVip && (
                  <span className="text-xs text-yellow-600 bg-yellow-50 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                    <Crown className="h-3 w-3" />
                    VIP
                  </span>
                )}
              </label>
              {isVip ? (
                <Select
                  options={countOptions}
                  value={count.toString()}
                  onChange={(e) => setCount(parseInt(e.target.value))}
                />
              ) : (
                <div
                  onClick={onNeedUpgrade}
                  className="w-full px-3 py-2 border rounded-lg bg-gray-50 text-gray-700 cursor-pointer hover:bg-gray-100 flex items-center justify-between"
                >
                  <span>1 个版本</span>
                  <Lock className="h-4 w-4 text-gray-700" />
                </div>
              )}
            </div>
          </div>

          {/* VIP 特权提示 */}
          {!isVip && (
            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex items-center gap-2 text-sm">
                <Crown className="h-4 w-4 text-yellow-600" />
                <span className="text-yellow-800 font-medium">升级 VIP 解锁更多功能</span>
              </div>
              <ul className="mt-2 text-xs text-yellow-700 space-y-1">
                <li>• 每天 13 次免费生成（普通用户 3 次）</li>
                <li>• 可选择多种 AI 模型</li>
                <li>• 一次生成多个版本</li>
              </ul>
            </div>
          )}

          {error && <p className="text-sm text-red-500">{error}</p>}

          <Button type="submit" className="w-full" size="lg" loading={loading} disabled={disabled}>
            <Sparkles className="mr-2 h-4 w-4" />
            生成文案 (消耗 {basePoints * count} 点)
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
