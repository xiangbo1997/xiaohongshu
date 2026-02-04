'use client'

import { Card, CardContent } from '@/components/ui/card'

export function AdBanner() {
  return (
    <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-100">
      <CardContent className="py-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-blue-800">🎉 限时优惠</p>
            <p className="text-xs text-blue-600 mt-1">新用户首月仅需 9.9 元，立省 20 元！</p>
          </div>
          <div className="text-xs text-gray-700">广告</div>
        </div>
      </CardContent>
    </Card>
  )
}

export function AdSidebar() {
  return (
    <Card>
      <CardContent className="py-4 text-center">
        <p className="text-xs text-gray-700 mb-2">推广</p>
        <div className="bg-gray-100 rounded-lg p-4 min-h-[200px] flex items-center justify-center">
          <span className="text-sm text-gray-700">广告位招租</span>
        </div>
        <p className="text-xs text-gray-700 mt-2">联系微信：xxxxx</p>
      </CardContent>
    </Card>
  )
}
