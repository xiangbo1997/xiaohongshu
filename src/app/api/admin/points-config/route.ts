import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAdminSession } from '@/lib/admin-auth'

// 点数配置的默认值
const DEFAULT_POINTS_CONFIG = {
  dailyFreePoints: {
    free: 3,      // 普通用户每天免费点数
    vip: 13,      // VIP 用户每天免费点数
  },
  generation: {
    basePointsPerVersion: 3,  // 每个版本消耗的基础点数
  },
}

// 获取点数配置
export async function GET(req: NextRequest) {
  try {
    // 验证管理员权限
    const { isAdmin } = await getAdminSession()
    if (!isAdmin) {
      return NextResponse.json({ error: '未授权' }, { status: 401 })
    }

    // 从数据库获取配置
    const setting = await prisma.settings.findUnique({
      where: { key: 'points_config' },
    })

    if (setting) {
      const config = JSON.parse(setting.value)
      return NextResponse.json(config)
    }

    // 返回默认配置
    return NextResponse.json(DEFAULT_POINTS_CONFIG)
  } catch (error) {
    console.error('Get points config error:', error)
    return NextResponse.json({ error: '获取配置失败' }, { status: 500 })
  }
}

// 保存点数配置
export async function POST(req: NextRequest) {
  try {
    // 验证管理员权限
    const { isAdmin } = await getAdminSession()
    if (!isAdmin) {
      return NextResponse.json({ error: '未授权' }, { status: 401 })
    }

    const body = await req.json()
    const { dailyFreePoints, generation } = body

    // 验证参数
    if (!dailyFreePoints || typeof dailyFreePoints.free !== 'number' || typeof dailyFreePoints.vip !== 'number') {
      return NextResponse.json({ error: '每日免费点数配置无效' }, { status: 400 })
    }

    if (!generation || typeof generation.basePointsPerVersion !== 'number') {
      return NextResponse.json({ error: '生成消耗点数配置无效' }, { status: 400 })
    }

    // 验证数值范围
    if (dailyFreePoints.free < 0 || dailyFreePoints.free > 100) {
      return NextResponse.json({ error: '普通用户每日免费点数必须在 0-100 之间' }, { status: 400 })
    }

    if (dailyFreePoints.vip < 0 || dailyFreePoints.vip > 100) {
      return NextResponse.json({ error: 'VIP 用户每日免费点数必须在 0-100 之间' }, { status: 400 })
    }

    if (generation.basePointsPerVersion < 1 || generation.basePointsPerVersion > 10) {
      return NextResponse.json({ error: '每版本消耗点数必须在 1-10 之间' }, { status: 400 })
    }

    const config = {
      dailyFreePoints: {
        free: Math.floor(dailyFreePoints.free),
        vip: Math.floor(dailyFreePoints.vip),
      },
      generation: {
        basePointsPerVersion: Math.floor(generation.basePointsPerVersion),
      },
    }

    // 保存到数据库
    await prisma.settings.upsert({
      where: { key: 'points_config' },
      update: {
        value: JSON.stringify(config),
        desc: '点数系统配置',
      },
      create: {
        key: 'points_config',
        value: JSON.stringify(config),
        desc: '点数系统配置',
      },
    })

    return NextResponse.json({ success: true, config })
  } catch (error) {
    console.error('Save points config error:', error)
    return NextResponse.json({ error: '保存配置失败' }, { status: 500 })
  }
}
