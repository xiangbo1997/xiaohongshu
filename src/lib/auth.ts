import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'
import { prisma } from './db'
import { UserSession } from '@/types'
import { DAILY_FREE_POINTS, getPointsConfig, getDailyFreePoints as getDailyFreePointsFromConfig } from './points-config'

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret'

// 导出每日免费次数配置（兼容旧代码）
export const DAILY_FREE_LIMIT = DAILY_FREE_POINTS

// 密码加密
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

// 密码验证
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

// 生成 JWT
export function signToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' })
}

// 验证 JWT
export function verifyToken(token: string): { userId: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string }
  } catch {
    return null
  }
}

// 检查用户是否是有效 VIP
export function isValidVip(user: { memberType: string; memberExpire?: Date | null }): boolean {
  if (user.memberType !== 'VIP') return false
  if (!user.memberExpire) return false
  return new Date(user.memberExpire) > new Date()
}

// 获取当前用户
export async function getCurrentUser(): Promise<UserSession | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('token')?.value
  if (!token) return null

  const payload = verifyToken(token)
  if (!payload) return null

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: {
      id: true,
      phone: true,
      email: true,
      nickname: true,
      memberType: true,
      memberExpire: true,
      points: true,
      todayUsage: true,
      dailyFreeUsed: true,
      lastUsageDate: true,
    },
  })

  if (!user) return null

  // 检查是否需要重置每日使用次数
  const today = new Date().toDateString()
  const lastUsage = user.lastUsageDate.toDateString()

  // 使用 dailyFreeUsed，如果为 0 则回退到 todayUsage（用于旧数据兼容）
  const dailyFreeUsed = today === lastUsage ? (user.dailyFreeUsed || user.todayUsage) : 0

  // 从数据库获取点数配置
  const pointsConfig = await getPointsConfig()

  // 计算每日免费次数（使用数据库配置）
  const isVip = isValidVip(user)
  const dailyFreeLimit = getDailyFreePointsFromConfig(isVip, pointsConfig)

  return {
    id: user.id,
    phone: user.phone || undefined,
    email: user.email || undefined,
    nickname: user.nickname || undefined,
    memberType: user.memberType,
    memberExpire: user.memberExpire || undefined,
    points: user.points,
    dailyFreeUsed,
    dailyFreeLimit,
    isVip,
  }
}

// 获取用户可用点数（每日免费剩余 + 购买/兑换的点数）
export function getAvailablePoints(user: UserSession): number {
  const dailyFreeRemaining = Math.max(0, user.dailyFreeLimit - user.dailyFreeUsed)
  return dailyFreeRemaining + user.points
}

// 检查用户是否可以生成
export function canGenerate(user: UserSession | null): {
  allowed: boolean
  reason?: string
  availablePoints?: number
  isVip?: boolean
} {
  if (!user) {
    return { allowed: false, reason: '请先登录' }
  }

  const availablePoints = getAvailablePoints(user)

  if (availablePoints <= 0) {
    return {
      allowed: false,
      reason: '点数不足，请购买点数或升级 VIP',
      availablePoints: 0,
      isVip: user.isVip,
    }
  }

  return {
    allowed: true,
    availablePoints,
    isVip: user.isVip,
  }
}

// 消费点数（生成时调用）
//
// 并发安全：付费点数的扣除采用「数据库层原子条件更新」（updateMany + WHERE points >= x），
// 由数据库对同一行 UPDATE 的串行化保证不会超扣。两个并发请求争抢同一批点数时，
// 只有一个能满足 WHERE 条件（count=1），另一个 count=0 被拒绝，避免透支。
// 整个「读→算→写」包裹在单个事务内，balance 快照在事务内重读，保证记录准确。
export async function consumePoints(userId: string, amount: number = 1): Promise<boolean> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // 从数据库获取点数配置（事务外读取，配置变更容忍最终一致）
  const pointsConfig = await getPointsConfig()

  try {
    return await prisma.$transaction(async (tx) => {
      // 事务内读取最新用户状态
      const user = await tx.user.findUnique({ where: { id: userId } })
      if (!user) return false

      const lastUsageDate = new Date(user.lastUsageDate)
      lastUsageDate.setHours(0, 0, 0, 0)
      const isNewDay = today.getTime() !== lastUsageDate.getTime()

      // 计算当前的今日已使用免费点数（兼容旧字段）
      const currentDailyFreeUsed = isNewDay ? 0 : (user.dailyFreeUsed || user.todayUsage)

      // 计算每日免费次数（使用数据库配置）
      const isVip = isValidVip(user)
      const dailyFreeLimit = getDailyFreePointsFromConfig(isVip, pointsConfig)
      const dailyFreeRemaining = Math.max(0, dailyFreeLimit - currentDailyFreeUsed)

      // 优先使用每日免费点数，不足部分从购买/兑换的点数扣除
      const freePointsToUse = Math.min(amount, dailyFreeRemaining)
      const paidPointsToUse = amount - freePointsToUse

      // 原子扣款：付费点数用条件更新保证不透支
      const updated = await tx.user.updateMany({
        where: paidPointsToUse > 0
          ? { id: userId, points: { gte: paidPointsToUse } } // 仅当余额足够才更新
          : { id: userId },
        data: {
          dailyFreeUsed: isNewDay ? freePointsToUse : { increment: freePointsToUse },
          totalUsage: { increment: amount },
          lastUsageDate: new Date(),
          points: paidPointsToUse > 0 ? { decrement: paidPointsToUse } : undefined,
        },
      })

      // count=0 说明并发下条件未满足（余额不足），扣款失败
      if (updated.count === 0) {
        return false
      }

      // 记录付费点数变动（在事务内重读余额，保证 balance 快照准确）
      if (paidPointsToUse > 0) {
        const after = await tx.user.findUnique({
          where: { id: userId },
          select: { points: true },
        })
        await tx.pointRecord.create({
          data: {
            userId,
            type: 'CONSUME',
            amount: -paidPointsToUse,
            balance: after?.points ?? 0,
            description: '生成内容消费',
          },
        })
      }

      return true
    })
  } catch (error) {
    console.error('consumePoints failed:', error)
    return false
  }
}

// 增加点数（购买或兑换时调用）
export async function addPoints(
  userId: string,
  amount: number,
  type: 'PURCHASE' | 'REDEEM' | 'GIFT' | 'REFUND',
  description: string,
  relatedId?: string
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const user = await tx.user.update({
      where: { id: userId },
      data: { points: { increment: amount } },
    })

    await tx.pointRecord.create({
      data: {
        userId,
        type,
        amount,
        balance: user.points,
        description,
        relatedId,
      },
    })
  })
}

// 获取生成消耗点数(基础点数 × 生成数量)
export async function getGenerationCost(count: number): Promise<number> {
  const config = await getPointsConfig()
  return config.generation.basePointsPerVersion * count
}

// 兼容旧接口：增加使用次数（已废弃，使用 consumePoints 代替）
export async function incrementUsage(userId: string, count: number = 1): Promise<void> {
  const cost = await getGenerationCost(count)
  await consumePoints(userId, cost)
}
