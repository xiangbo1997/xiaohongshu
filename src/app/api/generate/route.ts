import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, canGenerate, incrementUsage } from '@/lib/auth'
import { generateContent } from '@/lib/ai'
import { buildPrompt, buildMultiVersionPrompt } from '@/lib/prompts'
import { prisma } from '@/lib/db'
import { GenerateRequest, GenerateResult } from '@/types'
import { logger } from '@/lib/logger'

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    const check = canGenerate(user)

    if (!check.allowed) {
      return NextResponse.json({ error: check.reason }, { status: 403 })
    }

    const body: GenerateRequest = await req.json()
    const { contentType, category, topic, keywords, style, aiProvider, count = 1 } = body

    if (!contentType || !topic || !aiProvider) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 })
    }

    // 构建 Prompt
    const prompt = count > 1
      ? buildMultiVersionPrompt({ contentType, category, topic, keywords, style, count })
      : buildPrompt({ contentType, category, topic, keywords, style })

    // 调用 AI 生成
    logger.info('generate', `开始生成: ${topic}`, { aiProvider, contentType, category, count })
    const response = await generateContent(aiProvider, prompt)
    logger.info('generate', 'AI 返回原始响应', { responseLength: response.length, preview: response.substring(0, 200) })

    // 解析结果
    let results: GenerateResult[]
    try {
      const parsed = JSON.parse(response)
      if (parsed.versions) {
        results = parsed.versions
      } else {
        results = [parsed]
      }
    } catch (parseError) {
      logger.warn('generate', 'JSON 解析失败，尝试提取', { error: String(parseError) })
      // 尝试提取 JSON
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0])
          results = parsed.versions || [parsed]
        } catch (extractError) {
          logger.error('generate', 'JSON 提取失败', { error: String(extractError), jsonString: jsonMatch[0].substring(0, 500) })
          return NextResponse.json({ error: '生成结果解析失败，请重试' }, { status: 500 })
        }
      } else {
        logger.error('generate', '响应中未找到 JSON', { response: response.substring(0, 500) })
        return NextResponse.json({ error: '生成结果解析失败' }, { status: 500 })
      }
    }

    // 保存生成记录
    if (user) {
      await Promise.all(
        results.map((result) =>
          prisma.generation.create({
            data: {
              userId: user.id,
              contentType,
              category,
              topic,
              keywords,
              style,
              aiProvider,
              title: result.title,
              content: result.content,
              tags: result.tags,
              coverText: result.coverText,
            },
          })
        )
      )

      // 增加使用次数(按生成版本数消耗点数)
      await incrementUsage(user.id, count)
    }

    logger.info('generate', `生成成功: ${results.length} 条结果`, { titles: results.map(r => r.title) })
    return NextResponse.json({ success: true, results })
  } catch (error) {
    logger.error('generate', '生成失败', { error: error instanceof Error ? error.message : String(error) })
    return NextResponse.json({ error: '生成失败，请重试' }, { status: 500 })
  }
}
