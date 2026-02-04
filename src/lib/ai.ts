import OpenAI from 'openai'
import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '@/lib/db'
import { AIProvider, AI_PROVIDERS } from '@/types'

// AI 提供商适配器接口
interface AIAdapter {
  chat(prompt: string): Promise<string>
}

// OpenAI 兼容适配器（用于 OpenAI、DeepSeek 等）
class OpenAICompatibleAdapter implements AIAdapter {
  private client: OpenAI
  private model: string

  constructor(apiKey: string, model: string, baseURL?: string) {
    // 确保 baseURL 以 /v1 结尾（OpenAI 兼容接口标准路径）
    let normalizedBaseURL = baseURL
    if (baseURL && !baseURL.endsWith('/v1') && !baseURL.includes('/v1/')) {
      normalizedBaseURL = baseURL.replace(/\/+$/, '') + '/v1'
    }
    this.client = new OpenAI({ apiKey, baseURL: normalizedBaseURL })
    this.model = model
  }

  async chat(prompt: string): Promise<string> {
    try {
      console.log('OpenAI Request - Model:', this.model, 'BaseURL:', this.client.baseURL)
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.8,
      })
      console.log('OpenAI Response:', JSON.stringify(response, null, 2))
      if (!response.choices || response.choices.length === 0) {
        throw new Error('AI 返回结果为空')
      }
      return response.choices[0]?.message?.content || ''
    } catch (error) {
      console.error('OpenAI chat error:', error)
      throw error
    }
  }
}

// Anthropic 原生适配器（用于 Claude）
class AnthropicAdapter implements AIAdapter {
  private client: Anthropic
  private model: string

  constructor(apiKey: string, model: string, baseURL?: string) {
    this.client = new Anthropic({
      apiKey,
      baseURL: baseURL || undefined,
    })
    this.model = model
  }

  async chat(prompt: string): Promise<string> {
    try {
      console.log('Anthropic Request - Model:', this.model, 'BaseURL:', this.client.baseURL)
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }],
      })
      console.log('Anthropic Response:', JSON.stringify(response, null, 2))
      const textBlock = response.content.find(block => block.type === 'text')
      if (!textBlock || textBlock.type !== 'text') {
        throw new Error('AI 返回结果为空')
      }
      return textBlock.text
    } catch (error) {
      console.error('Anthropic chat error:', error)
      throw error
    }
  }
}

// 从数据库获取 AI 配置
async function getAIConfigFromDB(provider: AIProvider) {
  try {
    const config = await prisma.aIConfig.findUnique({
      where: { provider },
    })
    return config
  } catch {
    return null
  }
}

// 从环境变量获取默认配置
function getEnvConfig(provider: AIProvider) {
  const defaultConfig = AI_PROVIDERS[provider]

  switch (provider) {
    case 'openai':
      return {
        apiKey: process.env.OPENAI_API_KEY || '',
        model: defaultConfig.model,
        baseUrl: process.env.OPENAI_BASE_URL,
      }
    case 'claude':
      return {
        apiKey: process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY || '',
        model: defaultConfig.model,
        baseUrl: process.env.ANTHROPIC_BASE_URL || process.env.OPENAI_BASE_URL,
      }
    case 'deepseek':
      return {
        apiKey: process.env.DEEPSEEK_API_KEY || '',
        model: defaultConfig.model,
        baseUrl: 'https://api.deepseek.com/v1',
      }
    case 'zhipu':
      return {
        apiKey: process.env.ZHIPU_API_KEY || '',
        model: defaultConfig.model,
        baseUrl: 'https://open.bigmodel.cn/api/paas/v4/',
      }
    default:
      return { apiKey: '', model: '', baseUrl: undefined }
  }
}

// 判断是否为中转/代理服务（非 Anthropic 官方地址）
function isProxyUrl(baseUrl?: string): boolean {
  if (!baseUrl) return false
  return !baseUrl.includes('anthropic.com')
}

// 获取 AI 适配器（优先从数据库读取配置）
export async function getAIAdapter(provider: AIProvider): Promise<AIAdapter> {
  // 先尝试从数据库获取配置
  const dbConfig = await getAIConfigFromDB(provider)

  if (dbConfig && dbConfig.enabled && dbConfig.apiKey) {
    // 使用数据库配置
    if (provider === 'claude') {
      // 中转服务使用 OpenAI 兼容接口，原生 Anthropic API 使用 Anthropic SDK
      if (isProxyUrl(dbConfig.baseUrl || undefined)) {
        return new OpenAICompatibleAdapter(
          dbConfig.apiKey,
          dbConfig.model,
          dbConfig.baseUrl || undefined
        )
      }
      return new AnthropicAdapter(
        dbConfig.apiKey,
        dbConfig.model,
        dbConfig.baseUrl || undefined
      )
    }
    return new OpenAICompatibleAdapter(
      dbConfig.apiKey,
      dbConfig.model,
      dbConfig.baseUrl || undefined
    )
  }

  // 回退到环境变量配置
  const envConfig = getEnvConfig(provider)

  if (!envConfig.apiKey) {
    throw new Error(`AI provider ${provider} is not configured`)
  }

  // Claude：中转服务用 OpenAI 兼容接口，官方 API 用 Anthropic SDK
  if (provider === 'claude') {
    if (isProxyUrl(envConfig.baseUrl)) {
      return new OpenAICompatibleAdapter(
        envConfig.apiKey,
        envConfig.model,
        envConfig.baseUrl
      )
    }
    return new AnthropicAdapter(
      envConfig.apiKey,
      envConfig.model,
      envConfig.baseUrl
    )
  }

  return new OpenAICompatibleAdapter(
    envConfig.apiKey,
    envConfig.model,
    envConfig.baseUrl
  )
}

// 获取所有已启用的 AI 提供商
export async function getEnabledProviders(): Promise<AIProvider[]> {
  try {
    // 先从数据库获取
    const dbConfigs = await prisma.aIConfig.findMany({
      where: { enabled: true },
      orderBy: { sortOrder: 'asc' },
    })

    if (dbConfigs.length > 0) {
      return dbConfigs
        .filter(c => c.apiKey)
        .map(c => c.provider as AIProvider)
    }

    // 回退到环境变量检查
    const providers: AIProvider[] = []
    if (process.env.OPENAI_API_KEY) providers.push('openai')
    if (process.env.ANTHROPIC_API_KEY) providers.push('claude')
    if (process.env.DEEPSEEK_API_KEY) providers.push('deepseek')
    if (process.env.ZHIPU_API_KEY) providers.push('zhipu')

    return providers
  } catch {
    // 出错时回退到环境变量
    const providers: AIProvider[] = []
    if (process.env.OPENAI_API_KEY) providers.push('openai')
    if (process.env.ANTHROPIC_API_KEY) providers.push('claude')
    if (process.env.DEEPSEEK_API_KEY) providers.push('deepseek')
    if (process.env.ZHIPU_API_KEY) providers.push('zhipu')
    return providers
  }
}

// 生成文案
export async function generateContent(
  provider: AIProvider,
  prompt: string
): Promise<string> {
  const adapter = await getAIAdapter(provider)
  return adapter.chat(prompt)
}
