import { NextRequest, NextResponse } from 'next/server'
import { getPointsConfig } from '@/lib/points-config'

// 获取点数配置（公开接口，供前端使用）
export async function GET(req: NextRequest) {
  try {
    const config = await getPointsConfig()
    return NextResponse.json(config)
  } catch (error) {
    console.error('Get points config error:', error)
    return NextResponse.json({ error: '获取配置失败' }, { status: 500 })
  }
}
