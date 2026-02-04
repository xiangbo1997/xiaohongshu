'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { CheckCircle, XCircle, Loader2, AlertCircle, X } from 'lucide-react'

interface AIConfigItem {
  id: string
  provider: string
  name: string
  model: string
  apiKey: string | null
  baseUrl: string | null
  enabled: boolean
  sortOrder: number
}

interface TestResult {
  success: boolean
  message?: string
  error?: string
  details?: string
  latency?: number
}

interface TestState {
  [provider: string]: {
    testing: boolean
    result: TestResult | null
  }
}

// 错误详情弹窗组件
function ErrorDetailModal({
  isOpen,
  onClose,
  provider,
  result,
}: {
  isOpen: boolean
  onClose: () => void
  provider: string
  result: TestResult | null
}) {
  if (!isOpen || !result) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b bg-red-50">
          <h3 className="text-lg font-semibold text-red-700 flex items-center gap-2">
            <XCircle className="w-5 h-5" />
            测试失败 - {provider}
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-red-100 rounded"
          >
            <X className="w-5 h-5 text-red-600" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                错误信息
              </label>
              <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                {result.error || '未知错误'}
              </div>
            </div>
            {result.latency !== undefined && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  响应时间
                </label>
                <div className="text-sm text-gray-800">
                  {result.latency} ms
                </div>
              </div>
            )}
            {result.details && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  详细信息
                </label>
                <pre className="p-3 bg-gray-100 rounded-lg text-xs overflow-x-auto whitespace-pre-wrap break-all text-gray-700">
                  {result.details}
                </pre>
              </div>
            )}
          </div>
        </div>
        <div className="px-6 py-4 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  )
}

export default function SettingsPage() {
  const [configs, setConfigs] = useState<AIConfigItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [testStates, setTestStates] = useState<TestState>({})
  const [errorModal, setErrorModal] = useState<{ isOpen: boolean; provider: string; result: TestResult | null }>({
    isOpen: false,
    provider: '',
    result: null,
  })

  useEffect(() => {
    fetchConfigs()
  }, [])

  const fetchConfigs = async () => {
    try {
      const res = await fetch('/api/admin/ai-config')
      const data = await res.json()
      setConfigs(data)
    } catch {
      setMessage({ type: 'error', text: '加载配置失败' })
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (provider: string, field: keyof AIConfigItem, value: string | boolean) => {
    setConfigs(prev =>
      prev.map(config =>
        config.provider === provider ? { ...config, [field]: value } : config
      )
    )
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch('/api/admin/ai-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(configs),
      })
      if (res.ok) {
        setMessage({ type: 'success', text: '保存成功' })
        // 重新加载以获取掩码后的 API Key
        fetchConfigs()
      } else {
        setMessage({ type: 'error', text: '保存失败' })
      }
    } catch {
      setMessage({ type: 'error', text: '保存失败' })
    } finally {
      setSaving(false)
    }
  }

  // 测试 AI 模型连接
  const handleTest = async (config: AIConfigItem) => {
    // 检查是否有 API Key
    if (!config.apiKey || config.apiKey.includes('***')) {
      setMessage({ type: 'error', text: '请先输入有效的 API Key 并保存配置' })
      return
    }

    setTestStates(prev => ({
      ...prev,
      [config.provider]: { testing: true, result: null },
    }))

    try {
      const res = await fetch('/api/admin/ai-config/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: config.provider,
          model: config.model,
          apiKey: config.apiKey,
          baseUrl: config.baseUrl,
        }),
      })

      const result: TestResult = await res.json()

      setTestStates(prev => ({
        ...prev,
        [config.provider]: { testing: false, result },
      }))

      if (result.success) {
        setMessage({ type: 'success', text: `${config.name} 测试成功！响应时间: ${result.latency}ms` })
      }
    } catch (error: any) {
      const result: TestResult = {
        success: false,
        error: '网络请求失败',
        details: error.toString(),
      }
      setTestStates(prev => ({
        ...prev,
        [config.provider]: { testing: false, result },
      }))
    }
  }

  // 打开错误详情弹窗
  const openErrorModal = (provider: string, result: TestResult) => {
    setErrorModal({ isOpen: true, provider, result })
  }

  // 关闭错误详情弹窗
  const closeErrorModal = () => {
    setErrorModal({ isOpen: false, provider: '', result: null })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-700">加载中...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航 */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="text-gray-700 hover:text-gray-700">
              ← 返回
            </Link>
            <h1 className="text-xl font-bold">系统设置</h1>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 disabled:opacity-50"
          >
            {saving ? '保存中...' : '保存配置'}
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {message && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* AI 提供商配置 */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-6">AI 提供商配置</h2>
          <p className="text-sm text-gray-700 mb-6">
            配置各 AI 提供商的 API Key 和模型参数。API Key 保存后会以掩码形式显示。
          </p>

          <div className="space-y-6">
            {configs.map(config => (
              <div
                key={config.provider}
                className={`border rounded-lg p-4 ${
                  config.enabled ? 'border-pink-200 bg-pink-50/30' : 'border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.enabled}
                        onChange={e => handleChange(config.provider, 'enabled', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-pink-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-500"></div>
                    </label>
                    <span className="font-medium">{config.name}</span>
                    <span className="text-xs text-gray-700">({config.provider})</span>
                  </div>
                  {config.enabled && (
                    <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
                      已启用
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-800 mb-1">模型名称</label>
                    <input
                      type="text"
                      value={config.model}
                      onChange={e => handleChange(config.provider, 'model', e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                      placeholder="例如: gpt-4o-mini"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-800 mb-1">API Key</label>
                    <input
                      type="password"
                      value={config.apiKey || ''}
                      onChange={e => handleChange(config.provider, 'apiKey', e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                      placeholder="输入新的 API Key"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm text-gray-800 mb-1">Base URL（可选）</label>
                    <input
                      type="text"
                      value={config.baseUrl || ''}
                      onChange={e => handleChange(config.provider, 'baseUrl', e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                      placeholder="自定义 API 地址，留空使用默认"
                    />
                  </div>
                </div>

                {/* 测试按钮和状态 */}
                <div className="mt-4 pt-4 border-t flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {testStates[config.provider]?.result && (
                      <>
                        {testStates[config.provider].result?.success ? (
                          <div className="flex items-center gap-1 text-green-600 text-sm">
                            <CheckCircle className="w-4 h-4" />
                            <span>测试通过</span>
                            {testStates[config.provider].result?.latency && (
                              <span className="text-gray-700">
                                ({testStates[config.provider].result?.latency}ms)
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-red-600 text-sm">
                            <button
                              onClick={() => openErrorModal(config.name, testStates[config.provider].result!)}
                              className="flex items-center gap-1 hover:underline"
                              title="点击查看详细错误信息"
                            >
                              <AlertCircle className="w-4 h-4" />
                              <span>测试失败</span>
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  <button
                    onClick={() => handleTest(config)}
                    disabled={testStates[config.provider]?.testing || !config.apiKey}
                    className="px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {testStates[config.provider]?.testing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        测试中...
                      </>
                    ) : (
                      '测试连接'
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 使用说明 */}
        <div className="mt-6 bg-blue-50 rounded-xl p-6">
          <h3 className="font-medium text-blue-800 mb-2">配置说明</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• 至少启用一个 AI 提供商才能使用文案生成功能</li>
            <li>• API Key 保存后会加密存储，显示时以掩码形式展示</li>
            <li>• 如需使用代理或中转服务，请填写 Base URL</li>
            <li>• 修改配置后需要点击"保存配置"按钮才会生效</li>
            <li>• 点击"测试连接"可验证 API Key 和模型是否可用</li>
          </ul>
        </div>
      </main>

      {/* 错误详情弹窗 */}
      <ErrorDetailModal
        isOpen={errorModal.isOpen}
        onClose={closeErrorModal}
        provider={errorModal.provider}
        result={errorModal.result}
      />
    </div>
  )
}
