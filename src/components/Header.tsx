'use client'

import { Button } from '@/components/ui/button'
import { UserSession } from '@/types'
import { Crown, LogOut, History, Heart, Sparkles, User, Coins, Ticket } from 'lucide-react'
import Link from 'next/link'

interface HeaderProps {
  user: UserSession | null
  onLogin: () => void
  onLogout: () => void
  onUpgrade: () => void
  onHistory: () => void
  onFavorites: () => void
  onRedeem: () => void
}

export function Header({ user, onLogin, onLogout, onUpgrade, onHistory, onFavorites, onRedeem }: HeaderProps) {
  // 计算可用点数（每日免费剩余 + 购买/兑换的点数）
  const getAvailablePoints = () => {
    if (!user) return 0
    const dailyFreeLimit = user.dailyFreeLimit || 0
    const dailyFreeUsed = user.dailyFreeUsed || 0
    const points = user.points || 0
    const dailyFreeRemaining = Math.max(0, dailyFreeLimit - dailyFreeUsed)
    return dailyFreeRemaining + points
  }

  // 计算每日免费剩余点数
  const getDailyFreeRemaining = () => {
    if (!user) return 0
    const dailyFreeLimit = user.dailyFreeLimit || 0
    const dailyFreeUsed = user.dailyFreeUsed || 0
    return Math.max(0, dailyFreeLimit - dailyFreeUsed)
  }

  // 计算会员剩余天数
  const getVipRemainingDays = () => {
    if (!user || !user.isVip || !user.memberExpire) return 0
    const now = new Date()
    const expire = new Date(user.memberExpire)
    const diffTime = expire.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return Math.max(0, diffDays)
  }

  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-pink-500 rounded-lg flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <span className="font-bold text-lg text-gray-900">小红书文案生成器</span>
        </div>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              {/* 点数显示 */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 text-sm bg-gradient-to-r from-orange-50 to-yellow-50 px-3 py-1.5 rounded-full border border-orange-100">
                  <Coins className="h-4 w-4 text-orange-500" />
                  <span className="text-gray-800">可用：</span>
                  <span className="font-semibold text-orange-600">{getAvailablePoints()}</span>
                  <span className="text-gray-700 text-xs ml-1">
                    (免费{getDailyFreeRemaining()}+购买{user.points})
                  </span>
                </div>
              </div>

              {/* VIP 标识和剩余天数 */}
              {user.isVip && (
                <span className="flex items-center gap-1 text-sm text-yellow-600 bg-yellow-50 px-2 py-1 rounded-full border border-yellow-200">
                  <Crown className="h-4 w-4" />
                  VIP·剩余{getVipRemainingDays()}天
                </span>
              )}

              {/* 功能按钮 */}
              <Link href="/profile">
                <Button variant="ghost" size="sm">
                  <User className="h-4 w-4 mr-1" />
                  我的
                </Button>
              </Link>
              <Button variant="ghost" size="sm" onClick={onHistory}>
                <History className="h-4 w-4 mr-1" />
                历史
              </Button>
              <Button variant="ghost" size="sm" onClick={onFavorites}>
                <Heart className="h-4 w-4 mr-1" />
                收藏
              </Button>

              {/* 升级/充值按钮 */}
              <Button size="sm" onClick={onUpgrade} className="bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600">
                <Crown className="h-4 w-4 mr-1" />
                {user.isVip ? '充值点数' : '升级VIP'}
              </Button>

              {/* 兑换按钮 */}
              <Button size="sm" variant="outline" onClick={onRedeem} className="border-orange-300 text-orange-600 hover:bg-orange-50">
                <Ticket className="h-4 w-4 mr-1" />
                兑换码
              </Button>

              {/* 用户信息 */}
              <div className="flex items-center gap-2 ml-2">
                <span className="text-sm text-gray-800">{user.nickname || user.phone}</span>
                <button onClick={onLogout} className="text-gray-700 hover:text-gray-800">
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </>
          ) : (
            <Button onClick={onLogin}>登录 / 注册</Button>
          )}
        </div>
      </div>
    </header>
  )
}
