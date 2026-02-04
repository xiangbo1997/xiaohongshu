'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ResultCard } from '@/components/ResultCard'
import { X, History, Heart } from 'lucide-react'

interface HistoryItem {
  id: string
  title: string
  content: string
  tags: string[]
  coverText?: string
  contentType: string
  category?: string
  topic: string
  createdAt: string
  isFavorite: boolean
}

interface HistoryModalProps {
  isOpen: boolean
  onClose: () => void
  type: 'history' | 'favorites'
}

export function HistoryModal({ isOpen, onClose, type }: HistoryModalProps) {
  const [items, setItems] = useState<HistoryItem[]>([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  useEffect(() => {
    if (isOpen) {
      setItems([])
      setPage(1)
      setHasMore(true)
      loadData(1)
    }
  }, [isOpen, type])

  const loadData = async (pageNum: number) => {
    setLoading(true)
    try {
      const endpoint = type === 'history' ? '/api/user/history' : '/api/user/favorites'
      const res = await fetch(`${endpoint}?page=${pageNum}&limit=10`)
      const data = await res.json()

      if (res.ok) {
        if (pageNum === 1) {
          setItems(data.data)
        } else {
          setItems((prev) => [...prev, ...data.data])
        }
        setHasMore(pageNum < data.pagination.totalPages)
      }
    } catch (error) {
      console.error('Load data error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLoadMore = () => {
    const nextPage = page + 1
    setPage(nextPage)
    loadData(nextPage)
  }

  const toggleFavorite = async (id: string) => {
    try {
      const res = await fetch('/api/user/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ generationId: id }),
      })

      if (res.ok) {
        const data = await res.json()
        setItems((prev) =>
          type === 'favorites'
            ? prev.filter((item) => item.id !== id)
            : prev.map((item) => (item.id === id ? { ...item, isFavorite: data.isFavorite } : item))
        )
      }
    } catch (error) {
      console.error('Toggle favorite error:', error)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-4xl max-h-[80vh] flex flex-col">
        <CardHeader className="relative flex-shrink-0">
          <button onClick={onClose} className="absolute right-4 top-4 text-gray-700 hover:text-gray-800">
            <X className="h-5 w-5" />
          </button>
          <CardTitle className="flex items-center gap-2">
            {type === 'history' ? <History className="h-5 w-5" /> : <Heart className="h-5 w-5" />}
            {type === 'history' ? '历史记录' : '我的收藏'}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto">
          {items.length === 0 && !loading ? (
            <div className="text-center py-12 text-gray-700">
              {type === 'history' ? '暂无历史记录' : '暂无收藏'}
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item, index) => (
                <div key={item.id} className="relative">
                  <div className="absolute -left-2 top-2 text-xs text-gray-700">
                    {new Date(item.createdAt).toLocaleDateString()}
                  </div>
                  <ResultCard
                    result={{
                      title: item.title,
                      content: item.content,
                      tags: item.tags,
                      coverText: item.coverText,
                    }}
                    index={index}
                    onFavorite={() => toggleFavorite(item.id)}
                  />
                </div>
              ))}
              {hasMore && (
                <div className="text-center pt-4">
                  <Button variant="outline" onClick={handleLoadMore} loading={loading}>
                    加载更多
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
