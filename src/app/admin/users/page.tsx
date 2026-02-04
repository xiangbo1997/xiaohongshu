'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Search, Plus, Edit2, Trash2, X, BarChart2 } from 'lucide-react'

interface User {
  id: string
  phone: string | null
  email: string | null
  nickname: string | null
  memberType: 'FREE' | 'DAY' | 'MONTH' | 'YEAR'
  memberExpire: string | null
  todayUsage: number
  totalUsage: number
  generationCount: number
  createdAt: string
}

const memberTypeLabels: Record<string, string> = {
  FREE: '免费用户',
  DAY: '日卡会员',
  MONTH: '月卡会员',
  YEAR: '年卡会员',
}

const memberTypeColors: Record<string, string> = {
  FREE: 'bg-gray-100 text-gray-800',
  DAY: 'bg-blue-100 text-blue-800',
  MONTH: 'bg-purple-100 text-purple-800',
  YEAR: 'bg-orange-100 text-orange-800',
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  // 弹窗状态
  const [showModal, setShowModal] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [formData, setFormData] = useState({
    phone: '',
    email: '',
    password: '',
    nickname: '',
    memberType: 'FREE',
    memberExpire: '',
  })
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      })
      if (search) params.set('search', search)

      const res = await fetch(`/api/admin/users?${params}`)
      const data = await res.json()

      setUsers(data.users || [])
      setTotalPages(data.totalPages || 1)
      setTotal(data.total || 0)
    } catch (error) {
      console.error('Failed to fetch users:', error)
    } finally {
      setLoading(false)
    }
  }, [page, search])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    fetchUsers()
  }

  const openCreateModal = () => {
    setEditingUser(null)
    setFormData({
      phone: '',
      email: '',
      password: '',
      nickname: '',
      memberType: 'FREE',
      memberExpire: '',
    })
    setFormError('')
    setShowModal(true)
  }

  const openEditModal = (user: User) => {
    setEditingUser(user)
    setFormData({
      phone: user.phone || '',
      email: user.email || '',
      password: '',
      nickname: user.nickname || '',
      memberType: user.memberType,
      memberExpire: user.memberExpire ? user.memberExpire.split('T')[0] : '',
    })
    setFormError('')
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    setSaving(true)

    try {
      const url = editingUser
        ? `/api/admin/users/${editingUser.id}`
        : '/api/admin/users'
      const method = editingUser ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await res.json()

      if (!res.ok) {
        setFormError(data.error || '操作失败')
        return
      }

      setShowModal(false)
      fetchUsers()
    } catch {
      setFormError('操作失败，请重试')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (user: User) => {
    const identifier = user.phone || user.email || user.nickname || user.id
    if (!confirm(`确定要删除用户 "${identifier}" 吗？此操作不可恢复！`)) {
      return
    }

    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const data = await res.json()
        alert(data.error || '删除失败')
        return
      }

      fetchUsers()
    } catch {
      alert('删除失败，请重试')
    }
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
              <h1 className="text-xl font-bold">用户管理</h1>
            </div>
            <button
              onClick={openCreateModal}
              className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
            >
              <Plus className="w-4 h-4" />
              新增用户
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* 搜索栏 */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <form onSubmit={handleSearch} className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-700" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="搜索手机号、邮箱或昵称..."
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900"
            >
              搜索
            </button>
          </form>
        </div>

        {/* 用户列表 */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-4 py-3 border-b bg-gray-50">
            <span className="text-sm text-gray-800">共 {total} 个用户</span>
          </div>

          {loading ? (
            <div className="p-8 text-center text-gray-700">加载中...</div>
          ) : users.length === 0 ? (
            <div className="p-8 text-center text-gray-700">暂无用户</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-3 px-4">用户</th>
                    <th className="text-left py-3 px-4">会员类型</th>
                    <th className="text-left py-3 px-4">会员到期</th>
                    <th className="text-right py-3 px-4">今日/总生成</th>
                    <th className="text-left py-3 px-4">注册时间</th>
                    <th className="text-center py-3 px-4">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div>
                          <div className="font-medium">
                            {user.nickname || '未设置昵称'}
                          </div>
                          <div className="text-gray-700 text-xs">
                            {user.phone || user.email || user.id}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-1 text-xs rounded ${
                            memberTypeColors[user.memberType]
                          }`}
                        >
                          {memberTypeLabels[user.memberType]}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-800">
                        {user.memberExpire
                          ? new Date(user.memberExpire).toLocaleDateString('zh-CN')
                          : '-'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="text-orange-600">{user.todayUsage}</span>
                        <span className="text-gray-700"> / </span>
                        <span>{user.totalUsage}</span>
                      </td>
                      <td className="py-3 px-4 text-gray-800">
                        {formatDate(user.createdAt)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-2">
                          <Link
                            href={`/admin/users/${user.id}/profile`}
                            className="p-1 text-green-600 hover:bg-green-50 rounded"
                            title="用户画像"
                          >
                            <BarChart2 className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => openEditModal(user)}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                            title="编辑"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(user)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                            title="删除"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
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

      {/* 新增/编辑弹窗 */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-bold">
                {editingUser ? '编辑用户' : '新增用户'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  手机号
                </label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  placeholder="选填"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  邮箱
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="选填"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  密码 {editingUser && '(留空则不修改)'}
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  placeholder={editingUser ? '留空则不修改' : '请输入密码'}
                  required={!editingUser}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  昵称
                </label>
                <input
                  type="text"
                  value={formData.nickname}
                  onChange={(e) =>
                    setFormData({ ...formData, nickname: e.target.value })
                  }
                  placeholder="选填"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  会员类型
                </label>
                <select
                  value={formData.memberType}
                  onChange={(e) =>
                    setFormData({ ...formData, memberType: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                >
                  <option value="FREE">免费用户</option>
                  <option value="DAY">日卡会员</option>
                  <option value="MONTH">月卡会员</option>
                  <option value="YEAR">年卡会员</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  会员到期时间
                </label>
                <input
                  type="date"
                  value={formData.memberExpire}
                  onChange={(e) =>
                    setFormData({ ...formData, memberExpire: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                />
              </div>

              {formError && (
                <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg">
                  {formError}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
                >
                  {saving ? '保存中...' : '保存'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
