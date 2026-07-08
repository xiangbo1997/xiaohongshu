import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, canGenerate, getAvailablePoints, consumePoints } from '@/lib/auth'
import { generateContent } from '@/lib/ai'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'
import { getPointsConfig } from '@/lib/points-config'
import { getCapability, assertTierAllowed } from '@/lib/capabilities'
import { parseJsonFromAiResponse } from '@/lib/capabilities/parse'
import { AIProvider, AI_PROVIDERS } from '@/types'

/**
 * 统一 AI 能力路由
 *
 * POST /api/ai/[capability]
 *
 * 编排公共流水线（鉴权 → 校验 → 计费预检 → 调用 AI → 解析/校验输出 → 扣点 → 落库），
 * 能力专属逻辑（输入/输出结构、prompt、成本）全部下沉到 Capability 注册项。
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ capability: string }> }
) {
  const { capability: capabilityId } = await params

  // 1. 查找能力
  const capability = getCapability(capabilityId)
  if (!capability) {
    return NextResponse.json({ error: '不支持的能力类型' }, { status: 404 })
  }

  try {
    // 2. 鉴权（复用现有登录/点数校验）
    const user = await getCurrentUser()
    const check = canGenerate(user)
    if (!check.allowed || !user) {
      return NextResponse.json({ error: check.reason || '请先登录' }, { status: 403 })
    }

    // 2.5 会员分级门禁（在调用 AI 前快速失败，避免付费用户之外白嫖 API）
    const tierCheck = assertTierAllowed(capability.tier, user.isVip)
    if (!tierCheck.allowed) {
      return NextResponse.json(
        { error: tierCheck.reason, needUpgrade: true },
        { status: 403 }
      )
    }

    // 3. 校验输入（能力自带 zod schema）
    const body = await req.json().catch(() => null)
    const parsed = capability.inputSchema.safeParse(body)
    if (!parsed.success) {
      const msg = parsed.error.issues
        .map((i) => (i.path.length ? `${i.path.join('.')}: ${i.message}` : i.message))
        .join('; ')
      return NextResponse.json({ error: msg || '参数校验失败' }, { status: 400 })
    }
    const input = parsed.data

    // 4. 计费预检（成本由能力定义，点数不足则拒绝）
    const config = await getPointsConfig()
    const cost = capability.cost(input, config.generation.basePointsPerVersion)
    if (getAvailablePoints(user) < cost) {
      return NextResponse.json(
        { error: `点数不足，需要 ${cost} 点`, availablePoints: getAvailablePoints(user) },
        { status: 403 }
      )
    }

    // 5. 选择 AI 提供商（非 VIP 强制默认模型，与 /api/generate 一致）
    const requested = (body?.aiProvider as AIProvider) || 'claude'
    const aiProvider: AIProvider =
      user.isVip && requested in AI_PROVIDERS ? requested : 'claude'

    // 6. 调用 AI
    const prompt = capability.buildPrompt(input)
    logger.info('generate', `AI能力[${capability.id}] 开始`, { userId: user.id, aiProvider, cost })
    const response = await generateContent(aiProvider, prompt)

    // 7. 解析并校验输出（AI 幻觉防护：结构不符直接判失败，不扣点）
    let output: unknown
    try {
      output = parseJsonFromAiResponse(response)
    } catch (err) {
      logger.error('generate', `AI能力[${capability.id}] JSON解析失败`, {
        error: String(err),
        preview: response.substring(0, 300),
      })
      return NextResponse.json({ error: '生成结果解析失败，请重试' }, { status: 500 })
    }

    const outputCheck = capability.outputSchema.safeParse(output)
    if (!outputCheck.success) {
      logger.error('generate', `AI能力[${capability.id}] 输出结构校验失败`, {
        issues: outputCheck.error.issues.slice(0, 5),
      })
      return NextResponse.json({ error: '生成结果格式异常，请重试' }, { status: 500 })
    }
    const result = outputCheck.data

    // 8. 扣点（仅在成功且结构合法后执行）
    const consumed = await consumePoints(user.id, cost)
    if (!consumed) {
      return NextResponse.json({ error: '点数扣除失败，请重试' }, { status: 403 })
    }

    // 9. 落库（通用 AiTask 表）
    await prisma.aiTask.create({
      data: {
        userId: user.id,
        capability: capability.id,
        aiProvider,
        input: input as object,
        output: result as object,
        cost,
      },
    })

    logger.info('generate', `AI能力[${capability.id}] 成功`, { userId: user.id })
    return NextResponse.json({ success: true, capability: capability.id, result })
  } catch (error) {
    logger.error('generate', `AI能力[${capabilityId}] 异常`, {
      error: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json({ error: '生成失败，请重试' }, { status: 500 })
  }
}
