import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser, addPoints } from '@/lib/auth'
import {
  normalizeCode,
  verifyRedemptionCodeSignature,
  isValidCodeFormat,
  formatCodeForDisplay,
} from '@/lib/redemption'

// 兑换码兑换
export async function POST(req: NextRequest) {
  try {
    // 1. 验证用户登录
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 })
    }

    // 2. 解析请求参数
    const body = await req.json()
    const { code } = body

    if (!code) {
      return NextResponse.json({ error: '请输入兑换码' }, { status: 400 })
    }

    // 3. 规范化兑换码格式（去掉连字符，转大写）
    const normalizedCode = normalizeCode(code)

    // 4. 验证兑换码格式
    if (!isValidCodeFormat(normalizedCode)) {
      return NextResponse.json({ error: '兑换码格式不正确' }, { status: 400 })
    }

    // 5. 验证兑换码签名（防止伪造）
    if (!verifyRedemptionCodeSignature(normalizedCode)) {
      return NextResponse.json({ error: '无效的兑换码' }, { status: 400 })
    }

    // 6. 使用数据库事务处理兑换
    const result = await prisma.$transaction(async (tx) => {
      // 6.1 查询兑换码（支持带连字符和不带连字符两种格式）
      // 数据库中存储的是带连字符的格式，所以需要格式化后查询
      const formattedCode = formatCodeForDisplay(normalizedCode)
      const redemptionCode = await tx.redemptionCode.findFirst({
        where: {
          OR: [
            { codeDisplay: normalizedCode },
            { codeDisplay: formattedCode },
          ]
        },
      })

      if (!redemptionCode) {
        throw new Error('CODE_NOT_FOUND')
      }

      // 6.2 验证兑换码状态
      if (redemptionCode.status !== 'ACTIVE') {
        if (redemptionCode.status === 'DEPLETED') {
          throw new Error('CODE_DEPLETED')
        } else if (redemptionCode.status === 'EXPIRED') {
          throw new Error('CODE_EXPIRED')
        } else {
          throw new Error('CODE_DISABLED')
        }
      }

      // 6.3 验证过期时间
      if (redemptionCode.expireAt && redemptionCode.expireAt < new Date()) {
        // 自动标记为过期
        await tx.redemptionCode.update({
          where: { id: redemptionCode.id },
          data: { status: 'EXPIRED' },
        })
        throw new Error('CODE_EXPIRED')
      }

      // 6.4 检查是否已用完
      if (redemptionCode.usedCount >= redemptionCode.maxUses) {
        // 自动标记为已用完
        await tx.redemptionCode.update({
          where: { id: redemptionCode.id },
          data: { status: 'DEPLETED' },
        })
        throw new Error('CODE_DEPLETED')
      }

      // 6.5 检查用户是否已兑换过（通过 unique 约束防止重复）
      const existingRecord = await tx.redemptionRecord.findUnique({
        where: {
          codeId_userId: {
            codeId: redemptionCode.id,
            userId: user.id,
          },
        },
      })

      if (existingRecord) {
        throw new Error('ALREADY_REDEEMED')
      }

      // 6.6 根据兑换码类别进行不同的处理
      if (redemptionCode.codeCategory === 'VIP') {
        // VIP 天数兑换码 - 延长 VIP 会员时长
        const currentExpire = await tx.user.findUnique({
          where: { id: user.id },
          select: { memberExpire: true },
        })

        // 计算新的到期时间
        const now = new Date()
        const baseDate = currentExpire?.memberExpire && currentExpire.memberExpire > now
          ? currentExpire.memberExpire
          : now

        const newExpireDate = new Date(baseDate)
        newExpireDate.setDate(newExpireDate.getDate() + redemptionCode.rewardValue)

        // 更新用户为 VIP 并设置到期时间
        await tx.user.update({
          where: { id: user.id },
          data: {
            memberType: 'VIP',
            memberExpire: newExpireDate,
          },
        })
      } else if (redemptionCode.codeCategory === 'POINTS') {
        // 点数兑换码 - 增加用户点数
        await addPoints(
          user.id,
          redemptionCode.rewardValue,
          'REDEEM',
          `兑换码: ${redemptionCode.codeDisplay}`,
          redemptionCode.id
        )
      }

      // 6.7 创建兑换记录
      await tx.redemptionRecord.create({
        data: {
          codeId: redemptionCode.id,
          code: redemptionCode.codeDisplay,
          userId: user.id,
          rewardType: redemptionCode.rewardType,
          rewardValue: redemptionCode.rewardValue,
        },
      })

      // 6.8 更新兑换码使用次数
      const newUsedCount = redemptionCode.usedCount + 1
      const newStatus =
        newUsedCount >= redemptionCode.maxUses ? 'DEPLETED' : 'ACTIVE'

      await tx.redemptionCode.update({
        where: { id: redemptionCode.id },
        data: {
          usedCount: newUsedCount,
          status: newStatus,
        },
      })

      // 6.9 返回结果
      return {
        success: true,
        codeCategory: redemptionCode.codeCategory,
        rewardType: redemptionCode.rewardType,
        rewardValue: redemptionCode.rewardValue,
      }
    })

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Redeem code error:', error)

    // 处理各种错误情况
    const errorMessages: Record<string, { message: string; status: number }> = {
      CODE_NOT_FOUND: { message: '兑换码不存在', status: 404 },
      CODE_DEPLETED: { message: '此兑换码已被兑换完', status: 400 },
      CODE_EXPIRED: { message: '此兑换码已过期', status: 400 },
      CODE_DISABLED: { message: '此兑换码已被禁用', status: 400 },
      ALREADY_REDEEMED: { message: '您已兑换过此码', status: 400 },
    }

    const errorInfo = errorMessages[error.message]
    if (errorInfo) {
      return NextResponse.json({ error: errorInfo.message }, { status: errorInfo.status })
    }

    return NextResponse.json({ error: '兑换失败，请稍后重试' }, { status: 500 })
  }
}
