import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { AI_PROVIDERS, AIProvider } from '@/types'

// 获取所有 AI 配置
export async function GET() {
  try {
    const configs = await prisma.aIConfig.findMany({
      orderBy: { sortOrder: 'asc' },
    })

    // 如果数据库没有配置，返回默认配置（从环境变量）
    if (configs.length === 0) {
      const defaultConfigs = Object.entries(AI_PROVIDERS).map(([provider, config], index) => ({
        id: provider,
        provider,
        name: config.name,
        model: config.model,
        apiKey: getEnvApiKey(provider as AIProvider),
        baseUrl: getEnvBaseUrl(provider as AIProvider),
        enabled: !!getEnvApiKey(provider as AIProvider),
        sortOrder: index,
      }))
      return NextResponse.json(defaultConfigs)
    }

    // 隐藏 API Key 的完整值，只显示部分
    const safeConfigs = configs.map(config => ({
      ...config,
      apiKey: config.apiKey ? maskApiKey(config.apiKey) : null,
    }))

    return NextResponse.json(safeConfigs)
  } catch (error) {
    console.error('获取 AI 配置失败:', error)
    return NextResponse.json({ error: '获取配置失败' }, { status: 500 })
  }
}

// 批量保存 AI 配置
export async function POST(request: NextRequest) {
  try {
    const configs = await request.json()

    // 使用事务批量更新
    await prisma.$transaction(
      configs.map((config: {
        provider: string
        name: string
        model: string
        apiKey?: string
        baseUrl?: string
        enabled: boolean
        sortOrder: number
      }) =>
        prisma.aIConfig.upsert({
          where: { provider: config.provider },
          update: {
            name: config.name,
            model: config.model,
            // 如果 apiKey 是掩码格式，不更新
            ...(config.apiKey && !config.apiKey.includes('***') ? { apiKey: config.apiKey } : {}),
            baseUrl: config.baseUrl || null,
            enabled: config.enabled,
            sortOrder: config.sortOrder,
          },
          create: {
            provider: config.provider,
            name: config.name,
            model: config.model,
            apiKey: config.apiKey && !config.apiKey.includes('***') ? config.apiKey : null,
            baseUrl: config.baseUrl || null,
            enabled: config.enabled,
            sortOrder: config.sortOrder,
          },
        })
      )
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('保存 AI 配置失败:', error)
    return NextResponse.json({ error: '保存配置失败' }, { status: 500 })
  }
}

// 从环境变量获取 API Key
function getEnvApiKey(provider: AIProvider): string {
  switch (provider) {
    case 'openai':
      return process.env.OPENAI_API_KEY || ''
    case 'claude':
      return process.env.ANTHROPIC_API_KEY || ''
    case 'deepseek':
      return process.env.DEEPSEEK_API_KEY || ''
    case 'zhipu':
      return process.env.ZHIPU_API_KEY || ''
    default:
      return ''
  }
}

// 从环境变量获取 Base URL
function getEnvBaseUrl(provider: AIProvider): string {
  switch (provider) {
    case 'openai':
      return process.env.OPENAI_BASE_URL || ''
    case 'claude':
      return process.env.ANTHROPIC_BASE_URL || ''
    case 'deepseek':
      return 'https://api.deepseek.com/v1'
    case 'zhipu':
      return 'https://open.bigmodel.cn/api/paas/v4/'
    default:
      return ''
  }
}

// 掩码 API Key
function maskApiKey(key: string): string {
  if (key.length <= 8) return '***'
  return key.slice(0, 4) + '***' + key.slice(-4)
}
