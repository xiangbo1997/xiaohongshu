import { NextRequest, NextResponse } from 'next/server'
import { resetRateLimit } from '@/lib/rate-limit'

// 仅开发环境使用：重置速率限制
export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: '不允许在生产环境使用' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const { identifier, prefix } = body

    if (!identifier || !prefix) {
      return NextResponse.json({ error: '缺少参数' }, { status: 400 })
    }

    await resetRateLimit(identifier, prefix)

    return NextResponse.json({ success: true, message: '速率限制已重置' })
  } catch (error) {
    console.error('Reset rate limit error:', error)
    return NextResponse.json({ error: '重置失败' }, { status: 500 })
  }
}
