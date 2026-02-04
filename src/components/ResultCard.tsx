'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { GenerateResult } from '@/types'
import { Copy, Heart, Check } from 'lucide-react'

interface ResultCardProps {
  result: GenerateResult
  index: number
  onFavorite?: (result: GenerateResult) => void
}

export function ResultCard({ result, index, onFavorite }: ResultCardProps) {
  const [copied, setCopied] = useState<'title' | 'content' | 'all' | null>(null)

  const copyToClipboard = async (text: string, type: 'title' | 'content' | 'all') => {
    await navigator.clipboard.writeText(text)
    setCopied(type)
    setTimeout(() => setCopied(null), 2000)
  }

  const copyAll = () => {
    const fullText = `${result.title}\n\n${result.content}\n\n${result.tags.map((t) => `#${t}`).join(' ')}`
    copyToClipboard(fullText, 'all')
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-red-50 to-pink-50 pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-base">版本 {index + 1}</CardTitle>
          <div className="flex gap-2">
            {onFavorite && (
              <Button variant="ghost" size="icon" onClick={() => onFavorite(result)}>
                <Heart className="h-4 w-4" />
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={copyAll}>
              {copied === 'all' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        {/* 标题 */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-gray-700">标题</span>
            <button
              className="text-xs text-gray-700 hover:text-gray-800 flex items-center gap-1"
              onClick={() => copyToClipboard(result.title, 'title')}
            >
              {copied === 'title' ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
              复制
            </button>
          </div>
          <p className="text-lg font-semibold text-gray-900">{result.title}</p>
        </div>

        {/* 封面文案 */}
        {result.coverText && (
          <div>
            <span className="text-xs font-medium text-gray-700">封面文案</span>
            <p className="mt-1 text-sm text-gray-700 bg-yellow-50 p-2 rounded">{result.coverText}</p>
          </div>
        )}

        {/* 正文 */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-gray-700">正文</span>
            <button
              className="text-xs text-gray-700 hover:text-gray-800 flex items-center gap-1"
              onClick={() => copyToClipboard(result.content, 'content')}
            >
              {copied === 'content' ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
              复制
            </button>
          </div>
          <div className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 p-3 rounded-lg max-h-64 overflow-y-auto">
            {result.content}
          </div>
        </div>

        {/* 话题标签 */}
        <div>
          <span className="text-xs font-medium text-gray-700">话题标签</span>
          <div className="mt-1 flex flex-wrap gap-2">
            {result.tags.map((tag, i) => (
              <span key={i} className="text-xs bg-red-50 text-red-600 px-2 py-1 rounded-full">
                #{tag}
              </span>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
