import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAdminSession } from '@/lib/admin-auth'
import { generateRedemptionCode } from '@/lib/redemption'
import crypto from 'crypto'

// VIP 奖励类型配置
const VIP_REWARD_CONFIG: Record<string, number> = {
  VIP_1: 1,
  VIP_3: 3,
  VIP_7: 7,
  VIP_30: 30,
}

// 点数奖励类型配置
const POINTS_REWARD_CONFIG: Record<string, number> = {
  POINTS_10: 10,
  POINTS_50: 50,
  POINTS_100: 100,
}

// 获取兑换码列表
export async function GET(req: NextRequest) {
  try {
    // 验证管理员权限
    const { isAdmin } = await getAdminSession()
    if (!isAdmin) {
      return NextResponse.json({ error: '未授权' }, { status: 401 })
    }

    const searchParams = req.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''
    const category = searchParams.get('category') || '' // 新增：按类别筛选

    // 构建查询条件
    const where: any = {}

    if (search) {
      where.OR = [
        { codeDisplay: { contains: search, mode: 'insensitive' } },
        { note: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (status) {
      where.status = status
    }

    // 按类别筛选
    if (category && ['VIP', 'POINTS'].includes(category)) {
      where.codeCategory = category
    }

    const [codes, total, vipCount, pointsCount] = await Promise.all([
      prisma.redemptionCode.findMany({
        where,
        select: {
          id: true,
          codeDisplay: true,
          codeCategory: true,
          rewardType: true,
          rewardValue: true,
          status: true,
          maxUses: true,
          usedCount: true,
          expireAt: true,
          note: true,
          createdAt: true,
          _count: {
            select: { records: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.redemptionCode.count({ where }),
      // 统计 VIP 兑换码数量
      prisma.redemptionCode.count({ where: { ...where, codeCategory: 'VIP' } }),
      // 统计点数兑换码数量
      prisma.redemptionCode.count({ where: { ...where, codeCategory: 'POINTS' } }),
    ])

    return NextResponse.json({
      codes: codes.map((c) => ({
        ...c,
        recordCount: c._count.records,
        _count: undefined,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
      stats: {
        vipCount,
        pointsCount,
      },
    })
  } catch (error) {
    console.error('Get redemption codes error:', error)
    return NextResponse.json({ error: '获取兑换码列表失败' }, { status: 500 })
  }
}

// 批量生成兑换码
export async function POST(req: NextRequest) {
  try {
    // 验证管理员权限
    const { isAdmin } = await getAdminSession()
    if (!isAdmin) {
      return NextResponse.json({ error: '未授权' }, { status: 401 })
    }

    const body = await req.json()
    const { count, codeCategory, rewardType, customValue, maxUses, expireDays, note } = body

    // 参数验证
    if (!count || count < 1 || count > 100) {
      return NextResponse.json({ error: '生成数量必须在 1-100 之间' }, { status: 400 })
    }

    if (!codeCategory || !['VIP', 'POINTS'].includes(codeCategory)) {
      return NextResponse.json({ error: '请选择兑换码类别' }, { status: 400 })
    }

    // 验证奖励类型
    const validVipTypes = ['VIP_1', 'VIP_3', 'VIP_7', 'VIP_30', 'VIP_CUSTOM']
    const validPointsTypes = ['POINTS_10', 'POINTS_50', 'POINTS_100', 'POINTS_CUSTOM']

    if (codeCategory === 'VIP') {
      if (!rewardType || !validVipTypes.includes(rewardType)) {
        return NextResponse.json({ error: '无效的 VIP 奖励类型' }, { status: 400 })
      }
      if (rewardType === 'VIP_CUSTOM' && (!customValue || customValue < 1)) {
        return NextResponse.json({ error: '自定义 VIP 天数必须大于 0' }, { status: 400 })
      }
    } else {
      if (!rewardType || !validPointsTypes.includes(rewardType)) {
        return NextResponse.json({ error: '无效的点数奖励类型' }, { status: 400 })
      }
      if (rewardType === 'POINTS_CUSTOM' && (!customValue || customValue < 1)) {
        return NextResponse.json({ error: '自定义点数必须大于 0' }, { status: 400 })
      }
    }

    // 确定奖励值
    let rewardValue: number
    if (codeCategory === 'VIP') {
      rewardValue = rewardType === 'VIP_CUSTOM' ? customValue : (VIP_REWARD_CONFIG[rewardType] || 1)
    } else {
      rewardValue = rewardType === 'POINTS_CUSTOM' ? customValue : (POINTS_REWARD_CONFIG[rewardType] || 10)
    }

    // 计算过期时间
    let expireAt = null
    if (expireDays && expireDays > 0) {
      expireAt = new Date()
      expireAt.setDate(expireAt.getDate() + expireDays)
    }

    // 批量生成兑换码
    const codes = []
    for (let i = 0; i < count; i++) {
      const codeDisplay = generateRedemptionCode()
      const code = crypto.createHash('sha256').update(codeDisplay + (process.env.JWT_SECRET || '')).digest('hex')

      codes.push({
        code,
        codeDisplay,
        codeCategory,
        rewardType,
        rewardValue,
        maxUses: maxUses || 1,
        expireAt,
        note: note || null,
        createdBy: 'admin',
      })
    }

    // 批量插入数据库
    const result = await prisma.redemptionCode.createMany({
      data: codes,
    })

    return NextResponse.json({
      success: true,
      generated: result.count,
      codeCategory,
      codes: codes.map((c) => c.codeDisplay),
    })
  } catch (error) {
    console.error('Generate redemption codes error:', error)
    return NextResponse.json({ error: '生成兑换码失败' }, { status: 500 })
  }
}
