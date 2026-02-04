'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Search,
  Plus,
  Trash2,
  X,
  Copy,
  Check,
  Download,
  RefreshCw,
} from 'lucide-react'

interface RedemptionCode {
  id: string
  codeDisplay: string
  codeCategory: 'VIP' | 'POINTS'
  rewardType: string
  rewardValue: number
  status: string
  maxUses: number
  usedCount: number
  recordCount: number
  expireAt: string | null
  note: string | null
  createdAt: string
}

const vipRewardTypeLabels: Record<string, string> = {
  VIP_1: '1天VIP',
  VIP_3: '3天VIP',
  VIP_7: '7天VIP',
  VIP_30: '30天VIP',
  VIP_CUSTOM: '自定义VIP天数',
}

const pointsRewardTypeLabels: Record<string, string> = {
  POINTS_10: '10点数',
  POINTS_50: '50点数',
  POINTS_100: '100点数',
  POINTS_CUSTOM: '自定义点数',
}

const categoryLabels: Record<string, string> = {
  VIP: 'VIP天数',
  POINTS: '点数',
}

const categoryColors: Record<string, string> = {
  VIP: 'bg-yellow-100 text-yellow-800',
  POINTS: 'bg-blue-100 text-blue-800',
}

const statusLabels: Record<string, string> = {
  ACTIVE: '有效',
  EXPIRED: '已过期',
  DEPLETED: '已用完',
  DISABLED: '已禁用',
}

const statusColors: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-800',
  EXPIRED: 'bg-gray-100 text-gray-800',
  DEPLETED: 'bg-red-100 text-red-800',
  DISABLED: 'bg-yellow-100 text-yellow-800',
}

export default function CodesPage() {
  const [codes, setCodes] = useState<RedemptionCode[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<'' | 'VIP' | 'POINTS'>('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [stats, setStats] = useState<{ vipCount: number; pointsCount: number }>({ vipCount: 0, pointsCount: 0 })

  // 弹窗状态
  const [showGenerateModal, setShowGenerateModal] = useState(false)
  const [generateForm, setGenerateForm] = useState({
    count: 1,
    codeCategory: 'VIP' as 'VIP' | 'POINTS',
    rewardType: 'VIP_1',
    customValue: 1,
    maxUses: 1,
    expireDays: 30,
    note: '',
  })
  const [generatedCodes, setGeneratedCodes] = useState<string[]>([])
  const [generating, setGenerating] = useState(false)

  // 复制状态
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  const fetchCodes = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      })
      if (search) params.set('search', search)
      if (statusFilter) params.set('status', statusFilter)
      if (categoryFilter) params.set('category', categoryFilter)

      const res = await fetch(`/api/admin/codes?${params}`)
      const data = await res.json()

      setCodes(data.codes || [])
      setTotalPages(data.totalPages || 1)
      setTotal(data.total || 0)
      setStats(data.stats || { vipCount: 0, pointsCount: 0 })
    } catch (error) {
      console.error('Failed to fetch codes:', error)
    } finally {
      setLoading(false)
    }
  }, [page, search, statusFilter, categoryFilter])

  useEffect(() => {
    fetchCodes()
  }, [fetchCodes])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    fetchCodes()
  }

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    setGenerating(true)
    try {
      const res = await fetch('/api/admin/codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(generateForm),
      })

      const data = await res.json()

      if (!res.ok) {
        alert(data.error || '生成失败')
        return
      }

      setGeneratedCodes(data.codes || [])
      fetchCodes()
    } catch {
      alert('生成失败，请重试')
    } finally {
      setGenerating(false)
    }
  }

  const handleDelete = async (id: string, codeDisplay: string) => {
    if (!confirm(`确定要删除兑换码 "${codeDisplay}" 吗？`)) {
      return
    }

    try {
      const res = await fetch(`/api/admin/codes/${id}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const data = await res.json()
        alert(data.error || '删除失败')
        return
      }

      fetchCodes()
    } catch {
      alert('删除失败，请重试')
    }
  }

  const handleDisable = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/codes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'DISABLED' }),
      })

      if (!res.ok) {
        const data = await res.json()
        alert(data.error || '操作失败')
        return
      }

      fetchCodes()
    } catch {
      alert('操作失败，请重试')
    }
  }

  // 安全的剪贴板复制函数（兼容不支持 clipboard API 的环境）
  const copyToClipboard = async (text: string): Promise<boolean> => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(text)
        return true
      }
      // 降级方案：使用传统的 document.execCommand
      const textArea = document.createElement('textarea')
      textArea.value = text
      textArea.style.position = 'fixed'
      textArea.style.left = '-999999px'
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      const successful = document.execCommand('copy')
      document.body.removeChild(textArea)
      return successful
    } catch {
      return false
    }
  }

  const copyCode = async (code: string) => {
    const success = await copyToClipboard(code)
    if (success) {
      setCopiedCode(code)
      setTimeout(() => setCopiedCode(null), 2000)
    } else {
      alert('复制失败，请手动复制')
    }
  }

  const copyAllCodes = async () => {
    const success = await copyToClipboard(generatedCodes.join('\n'))
    if (success) {
      alert('已复制到剪贴板')
    } else {
      alert('复制失败，请手动复制')
    }
  }

  const downloadCodes = () => {
    const blob = new Blob([generatedCodes.join('\n')], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `redemption-codes-${Date.now()}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('zh-CN')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/admin" className="text-gray-700 hover:text-gray-700">
                ← 返回后台
              </Link>
              <h1 className="text-xl font-bold">兑换码管理</h1>
            </div>
            <button
              onClick={() => {
                setGenerateForm({
                  count: 1,
                  codeCategory: 'VIP',
                  rewardType: 'VIP_1',
                  customValue: 1,
                  maxUses: 1,
                  expireDays: 30,
                  note: '',
                })
                setGeneratedCodes([])
                setShowGenerateModal(true)
              }}
              className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
            >
              <Plus className="w-4 h-4" />
              生成兑换码
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* 分类标签页 */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="flex items-center gap-4 p-4 border-b">
            <button
              onClick={() => setCategoryFilter('')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                categoryFilter === ''
                  ? 'bg-orange-500 text-white'
                  : 'text-gray-800 hover:bg-gray-100'
              }`}
            >
              全部 ({stats.vipCount + stats.pointsCount})
            </button>
            <button
              onClick={() => setCategoryFilter('VIP')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                categoryFilter === 'VIP'
                  ? 'bg-yellow-500 text-white'
                  : 'text-gray-800 hover:bg-gray-100'
              }`}
            >
              VIP天数 ({stats.vipCount})
            </button>
            <button
              onClick={() => setCategoryFilter('POINTS')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                categoryFilter === 'POINTS'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-800 hover:bg-gray-100'
              }`}
            >
              点数 ({stats.pointsCount})
            </button>
          </div>
        </div>

        {/* 搜索和筛选 */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <form onSubmit={handleSearch} className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-700" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="搜索兑换码或备注..."
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
            >
              <option value="">全部状态</option>
              <option value="ACTIVE">有效</option>
              <option value="DEPLETED">已用完</option>
              <option value="EXPIRED">已过期</option>
              <option value="DISABLED">已禁用</option>
            </select>
            <button
              type="submit"
              className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900"
            >
              搜索
            </button>
            <button
              type="button"
              onClick={() => {
                setSearch('')
                setStatusFilter('')
                setCategoryFilter('')
                setPage(1)
              }}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              重置
            </button>
          </form>
        </div>

        {/* 兑换码列表 */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-4 py-3 border-b bg-gray-50">
            <span className="text-sm text-gray-800">共 {total} 个兑换码</span>
          </div>

          {loading ? (
            <div className="p-8 text-center text-gray-700">加载中...</div>
          ) : codes.length === 0 ? (
            <div className="p-8 text-center text-gray-700">暂无兑换码</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-3 px-4">兑换码</th>
                    <th className="text-left py-3 px-4">类别</th>
                    <th className="text-left py-3 px-4">奖励</th>
                    <th className="text-left py-3 px-4">状态</th>
                    <th className="text-left py-3 px-4">使用情况</th>
                    <th className="text-left py-3 px-4">过期时间</th>
                    <th className="text-left py-3 px-4">备注</th>
                    <th className="text-left py-3 px-4">创建时间</th>
                    <th className="text-center py-3 px-4">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {codes.map((code) => (
                    <tr key={code.id} className="hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <code className="font-mono text-orange-600">
                            {code.codeDisplay}
                          </code>
                          <button
                            onClick={() => copyCode(code.codeDisplay)}
                            className="p-1 text-gray-700 hover:text-gray-800"
                            title="复制"
                          >
                            {copiedCode === code.codeDisplay ? (
                              <Check className="w-3 h-3 text-green-500" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-1 text-xs rounded ${categoryColors[code.codeCategory]}`}
                        >
                          {categoryLabels[code.codeCategory]}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {code.codeCategory === 'VIP'
                          ? vipRewardTypeLabels[code.rewardType]
                          : pointsRewardTypeLabels[code.rewardType]}
                        {(code.rewardType === 'VIP_CUSTOM' || code.rewardType === 'POINTS_CUSTOM') &&
                          ` (${code.rewardValue}${code.codeCategory === 'VIP' ? '天' : '点'})`}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-1 text-xs rounded ${statusColors[code.status]}`}
                        >
                          {statusLabels[code.status]}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {code.usedCount}/{code.maxUses}
                        {code.recordCount > 0 && (
                          <span className="text-gray-700 text-xs ml-1">
                            ({code.recordCount} 条记录)
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-gray-800">
                        {code.expireAt ? formatDate(code.expireAt) : '永久有效'}
                      </td>
                      <td className="py-3 px-4 text-gray-800 max-w-[200px] truncate">
                        {code.note || '-'}
                      </td>
                      <td className="py-3 px-4 text-gray-800">
                        {formatDate(code.createdAt)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-2">
                          {code.status === 'ACTIVE' && code.usedCount === 0 && (
                            <button
                              onClick={() => handleDisable(code.id)}
                              className="p-1 text-yellow-600 hover:bg-yellow-50 rounded"
                              title="禁用"
                            >
                              <RefreshCw className="w-4 h-4" />
                            </button>
                          )}
                          {code.usedCount === 0 && (
                            <button
                              onClick={() =>
                                handleDelete(code.id, code.codeDisplay)
                              }
                              className="p-1 text-red-600 hover:bg-red-50 rounded"
                              title="删除"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* 分页 */}
          {totalPages > 1 && (
            <div className="px-4 py-3 border-t flex items-center justify-between">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                上一页
              </button>
              <span className="text-sm text-gray-800">
                第 {page} / {totalPages} 页
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                下一页
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 生成兑换码弹窗 */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-bold">生成兑换码</h2>
              <button
                onClick={() => setShowGenerateModal(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {generatedCodes.length > 0 ? (
              // 显示生成的兑换码
              <div className="p-6">
                <div className="mb-4 p-4 bg-green-50 text-green-700 rounded-lg">
                  成功生成 {generatedCodes.length} 个兑换码！
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    生成的兑换码
                  </label>
                  <div className="p-3 bg-gray-50 rounded-lg max-h-40 overflow-y-auto">
                    {generatedCodes.map((code, index) => (
                      <div key={index} className="font-mono text-sm py-1">
                        {code}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={copyAllCodes}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50"
                  >
                    <Copy className="w-4 h-4" />
                    复制全部
                  </button>
                  <button
                    onClick={downloadCodes}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
                  >
                    <Download className="w-4 h-4" />
                    下载
                  </button>
                </div>

                <button
                  onClick={() => {
                    setGeneratedCodes([])
                    setShowGenerateModal(false)
                  }}
                  className="w-full mt-3 px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  关闭
                </button>
              </div>
            ) : (
              // 生成表单
              <form onSubmit={handleGenerate} className="p-6 space-y-4">
                {/* 类别选择 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    兑换码类别
                  </label>
                  <select
                    value={generateForm.codeCategory}
                    onChange={(e) => {
                      const category = e.target.value as 'VIP' | 'POINTS'
                      setGenerateForm({
                        ...generateForm,
                        codeCategory: category,
                        rewardType: category === 'VIP' ? 'VIP_1' : 'POINTS_10',
                        customValue: 1,
                      })
                    }}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                  >
                    <option value="VIP">VIP 天数兑换码</option>
                    <option value="POINTS">点数兑换码</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      生成数量
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={generateForm.count}
                      onChange={(e) =>
                        setGenerateForm({
                          ...generateForm,
                          count: parseInt(e.target.value) || 1,
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      奖励类型
                    </label>
                    <select
                      value={generateForm.rewardType}
                      onChange={(e) =>
                        setGenerateForm({
                          ...generateForm,
                          rewardType: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                    >
                      {generateForm.codeCategory === 'VIP' ? (
                        <>
                          <option value="VIP_1">1天VIP</option>
                          <option value="VIP_3">3天VIP</option>
                          <option value="VIP_7">7天VIP</option>
                          <option value="VIP_30">30天VIP</option>
                          <option value="VIP_CUSTOM">自定义天数</option>
                        </>
                      ) : (
                        <>
                          <option value="POINTS_10">10点数</option>
                          <option value="POINTS_50">50点数</option>
                          <option value="POINTS_100">100点数</option>
                          <option value="POINTS_CUSTOM">自定义点数</option>
                        </>
                      )}
                    </select>
                  </div>
                </div>

                {(generateForm.rewardType === 'VIP_CUSTOM' ||
                  generateForm.rewardType === 'POINTS_CUSTOM') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {generateForm.codeCategory === 'VIP' ? '自定义天数' : '自定义点数'}
                    </label>
                    <input
                      type="number"
                      min="1"
                      max={generateForm.codeCategory === 'VIP' ? 3650 : 10000}
                      value={generateForm.customValue}
                      onChange={(e) =>
                        setGenerateForm({
                          ...generateForm,
                          customValue: parseInt(e.target.value) || 1,
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      每码可用次数
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="1000"
                      value={generateForm.maxUses}
                      onChange={(e) =>
                        setGenerateForm({
                          ...generateForm,
                          maxUses: parseInt(e.target.value) || 1,
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      有效期（天）
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="3650"
                      placeholder="0=永久"
                      value={generateForm.expireDays}
                      onChange={(e) =>
                        setGenerateForm({
                          ...generateForm,
                          expireDays: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    备注（可选）
                  </label>
                  <input
                    type="text"
                    value={generateForm.note}
                    onChange={(e) =>
                      setGenerateForm({
                        ...generateForm,
                        note: e.target.value,
                      })
                    }
                    placeholder="如：活动赠品、补偿等"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowGenerateModal(false)}
                    className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    disabled={generating}
                    className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
                  >
                    {generating ? '生成中...' : '生成'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
