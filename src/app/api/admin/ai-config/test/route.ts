import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/admin-auth'

// 测试 AI 模型连接
export async function POST(req: NextRequest) {
  try {
    // 验证管理员权限
    const { isAdmin } = await getAdminSession()
    if (!isAdmin) {
      return NextResponse.json({ error: '未授权' }, { status: 401 })
    }

    const body = await req.json()
    const { provider, model, apiKey, baseUrl } = body

    if (!provider || !model || !apiKey) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 })
    }

    // 根据不同提供商测试连接
    const testResult = await testAIProvider(provider, model, apiKey, baseUrl)

    return NextResponse.json(testResult)
  } catch (error: any) {
    console.error('Test AI config error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || '测试失败',
        details: error.toString()
      },
      { status: 500 }
    )
  }
}

async function testAIProvider(
  provider: string,
  model: string,
  apiKey: string,
  baseUrl?: string
): Promise<{ success: boolean; message?: string; error?: string; details?: string; latency?: number }> {
  const startTime = Date.now()

  try {
    switch (provider) {
      case 'openai':
        return await testOpenAI(model, apiKey, baseUrl)
      case 'claude':
      case 'anthropic':
        return await testClaude(model, apiKey, baseUrl)
      case 'deepseek':
        return await testDeepSeek(model, apiKey, baseUrl)
      case 'zhipu':
        return await testZhipu(model, apiKey, baseUrl)
      default:
        return { success: false, error: `不支持的提供商: ${provider}` }
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || '连接失败',
      details: error.toString(),
      latency: Date.now() - startTime,
    }
  }
}

// 测试 OpenAI 兼容接口
async function testOpenAI(
  model: string,
  apiKey: string,
  baseUrl?: string
): Promise<{ success: boolean; message?: string; error?: string; details?: string; latency?: number }> {
  const startTime = Date.now()
  const url = `${baseUrl || 'https://api.openai.com/v1'}/chat/completions`

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: 'Hi' }],
        max_tokens: 5,
      }),
    })

    const latency = Date.now() - startTime

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
        details: JSON.stringify(errorData, null, 2),
        latency,
      }
    }

    const data = await response.json()
    return {
      success: true,
      message: `模型 ${model} 连接成功`,
      latency,
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || '网络请求失败',
      details: error.toString(),
      latency: Date.now() - startTime,
    }
  }
}

// 测试 Claude / Anthropic 接口
// 支持原生 Anthropic API 和 OpenAI 兼容的中转服务
async function testClaude(
  model: string,
  apiKey: string,
  baseUrl?: string
): Promise<{ success: boolean; message?: string; error?: string; details?: string; latency?: number }> {
  const startTime = Date.now()

  // 判断是否为中转服务（非 Anthropic 官方地址）
  const isProxy = baseUrl && !baseUrl.includes('anthropic.com')

  if (isProxy) {
    // 中转服务：使用 OpenAI 兼容接口测试
    const url = `${baseUrl.replace(/\/+$/, '')}/v1/chat/completions`
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: 'Hi' }],
          max_tokens: 5,
        }),
      })

      const latency = Date.now() - startTime

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
          details: JSON.stringify(errorData, null, 2),
          latency,
        }
      }

      return {
        success: true,
        message: `模型 ${model} 连接成功（中转服务）`,
        latency,
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || '网络请求失败',
        details: error.toString(),
        latency: Date.now() - startTime,
      }
    }
  }

  // 原生 Anthropic API
  const url = `${baseUrl || 'https://api.anthropic.com'}/v1/messages`

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: 'Hi' }],
        max_tokens: 5,
      }),
    })

    const latency = Date.now() - startTime

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
        details: JSON.stringify(errorData, null, 2),
        latency,
      }
    }

    return {
      success: true,
      message: `模型 ${model} 连接成功`,
      latency,
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || '网络请求失败',
      details: error.toString(),
      latency: Date.now() - startTime,
    }
  }
}

// 测试 DeepSeek 接口（OpenAI 兼容）
async function testDeepSeek(
  model: string,
  apiKey: string,
  baseUrl?: string
): Promise<{ success: boolean; message?: string; error?: string; details?: string; latency?: number }> {
  return testOpenAI(model, apiKey, baseUrl || 'https://api.deepseek.com/v1')
}

// 测试智谱 AI 接口
async function testZhipu(
  model: string,
  apiKey: string,
  baseUrl?: string
): Promise<{ success: boolean; message?: string; error?: string; details?: string; latency?: number }> {
  const startTime = Date.now()
  const url = `${baseUrl || 'https://open.bigmodel.cn/api/paas/v4'}/chat/completions`

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: 'Hi' }],
        max_tokens: 5,
      }),
    })

    const latency = Date.now() - startTime

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
        details: JSON.stringify(errorData, null, 2),
        latency,
      }
    }

    return {
      success: true,
      message: `模型 ${model} 连接成功`,
      latency,
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || '网络请求失败',
      details: error.toString(),
      latency: Date.now() - startTime,
    }
  }
}
