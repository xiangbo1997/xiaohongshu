'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/Header'
import { GeneratorForm } from '@/components/GeneratorForm'
import { ResultCard } from '@/components/ResultCard'
import { AuthModal } from '@/components/AuthModal'
import { PricingModal } from '@/components/PricingModal'
import { HistoryModal } from '@/components/HistoryModal'
import RedeemModal from '@/components/RedeemModal'
import { AdBanner, AdSidebar } from '@/components/AdBanner'
import { UserSession, GenerateResult } from '@/types'
import { Sparkles, Zap, Shield, Clock } from 'lucide-react'

export default function Home() {
  const [user, setUser] = useState<UserSession | null>(null)
  const [results, setResults] = useState<GenerateResult[]>([])
  const [showAuth, setShowAuth] = useState(false)
  const [showPricing, setShowPricing] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [showFavorites, setShowFavorites] = useState(false)
  const [showRedeem, setShowRedeem] = useState(false)

  // 获取用户信息
  const fetchUser = async () => {
    try {
      const res = await fetch('/api/user')
      if (res.ok) {
        const data = await res.json()
        setUser(data.user)
      } else {
        setUser(null)
      }
    } catch {
      setUser(null)
    }
  }

  useEffect(() => {
    fetchUser()
  }, [])

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    setUser(null)
  }

  const handleGenerate = (newResults: GenerateResult[]) => {
    setResults(newResults)
    fetchUser() // 刷新用户信息（更新使用次数）
  }

  const features = [
    { icon: Sparkles, title: '爆款文案', desc: '基于小红书爆款规则生成' },
    { icon: Zap, title: '多AI支持', desc: 'OpenAI/Claude/DeepSeek/智谱' },
    { icon: Shield, title: '多版本生成', desc: '一次生成多个版本供选择' },
    { icon: Clock, title: '历史记录', desc: '保存生成记录随时查看' },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        user={user}
        onLogin={() => setShowAuth(true)}
        onLogout={handleLogout}
        onUpgrade={() => setShowPricing(true)}
        onHistory={() => setShowHistory(true)}
        onFavorites={() => setShowFavorites(true)}
        onRedeem={() => setShowRedeem(true)}
      />

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* 顶部广告 */}
        <div className="mb-6">
          <AdBanner />
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* 左侧：生成表单 */}
          <div className="lg:col-span-2 space-y-6">
            <GeneratorForm
              user={user}
              onGenerate={handleGenerate}
              onNeedLogin={() => setShowAuth(true)}
              onNeedUpgrade={() => setShowPricing(true)}
            />

            {/* 生成结果 */}
            {results.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold flex items-center gap-2 text-gray-900">
                  <Sparkles className="h-5 w-5 text-red-500" />
                  生成结果
                </h2>
                <div className="grid md:grid-cols-2 gap-4">
                  {results.map((result, index) => (
                    <ResultCard key={index} result={result} index={index} />
                  ))}
                </div>
              </div>
            )}

            {/* 功能介绍 */}
            {results.length === 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {features.map((feature, index) => (
                  <div
                    key={index}
                    className="bg-white rounded-xl p-4 text-center border border-gray-100 hover:border-red-200 hover:shadow-sm transition"
                  >
                    <feature.icon className="h-8 w-8 text-red-500 mx-auto mb-2" />
                    <h3 className="font-medium text-sm text-gray-900">{feature.title}</h3>
                    <p className="text-xs text-gray-700 mt-1">{feature.desc}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 右侧：广告位 */}
          <div className="space-y-6">
            <AdSidebar />

            {/* 使用说明 */}
            <div className="bg-white rounded-xl p-4 border border-gray-100">
              <h3 className="font-medium mb-3 text-gray-900">使用说明</h3>
              <ol className="text-sm text-gray-800 space-y-2">
                <li className="flex gap-2">
                  <span className="w-5 h-5 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-xs flex-shrink-0">1</span>
                  选择内容类型和垂直领域
                </li>
                <li className="flex gap-2">
                  <span className="w-5 h-5 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-xs flex-shrink-0">2</span>
                  输入你想写的主题
                </li>
                <li className="flex gap-2">
                  <span className="w-5 h-5 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-xs flex-shrink-0">3</span>
                  点击生成，获取爆款文案
                </li>
                <li className="flex gap-2">
                  <span className="w-5 h-5 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-xs flex-shrink-0">4</span>
                  一键复制到小红书发布
                </li>
              </ol>
            </div>

            {/* 免费用户提示 */}
            {user && user.memberType === 'FREE' && (
              <div className="bg-gradient-to-br from-red-50 to-pink-50 rounded-xl p-4 border border-red-100">
                <p className="text-sm font-medium text-red-800 mb-2">升级会员享受更多权益</p>
                <ul className="text-xs text-red-600 space-y-1">
                  <li>✓ 无限次生成</li>
                  <li>✓ 全部 AI 模型</li>
                  <li>✓ 历史记录永久保存</li>
                  <li>✓ 优先客服支持</li>
                </ul>
                <div className="flex gap-2 mt-3">
                  <button
                    className="flex-1 bg-red-500 text-white text-sm py-2 rounded-lg hover:bg-red-600 transition"
                    onClick={() => setShowPricing(true)}
                  >
                    立即升级
                  </button>
                  <button
                    className="flex-1 bg-white text-red-600 text-sm py-2 rounded-lg border border-red-200 hover:bg-red-50 transition"
                    onClick={() => setShowRedeem(true)}
                  >
                    兑换码
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* 底部 */}
      <footer className="bg-white border-t border-gray-100 mt-12">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-gray-700">© 2024 小红书文案生成器. All rights reserved.</p>
            <div className="flex gap-4 text-sm text-gray-700">
              <a href="#" className="hover:text-gray-700">用户协议</a>
              <a href="#" className="hover:text-gray-700">隐私政策</a>
              <a href="#" className="hover:text-gray-700">联系我们</a>
            </div>
          </div>
        </div>
      </footer>

      {/* 弹窗 */}
      <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} onSuccess={fetchUser} />
      <PricingModal isOpen={showPricing} onClose={() => setShowPricing(false)} />
      <HistoryModal isOpen={showHistory} onClose={() => setShowHistory(false)} type="history" />
      <HistoryModal isOpen={showFavorites} onClose={() => setShowFavorites(false)} type="favorites" />
      <RedeemModal isOpen={showRedeem} onClose={() => setShowRedeem(false)} onSuccess={() => fetchUser()} />
    </div>
  )
}
