import { NextResponse } from 'next/server'
import { listCapabilities } from '@/lib/capabilities'

/**
 * 列出所有已注册的 AI 能力（供前端渲染能力入口清单）
 * GET /api/ai
 */
export async function GET() {
  return NextResponse.json({ capabilities: listCapabilities() })
}
