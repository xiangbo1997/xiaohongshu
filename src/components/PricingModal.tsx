'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PAY_PRODUCTS } from '@/types'
import { Crown, Check, X, Loader2 } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'

interface PricingModalProps {
  isOpen: boolean
  onClose: () => void
}

export function PricingModal({ isOpen, onClose }: PricingModalProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null)
  const [payType, setPayType] = useState<'alipay' | 'wechat'>('alipay')
  const [qrCode, setQrCode] = useState('')
  const [orderNo, setOrderNo] = useState('')
  const [error, setError] = useState('')
  const pollingRef = useRef<NodeJS.Timeout | null>(null)

  // 清理轮询
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
      }
    }
  }, [])

  if (!isOpen) return null

  const handleSelectProduct = (productType: string) => {
    setSelectedProduct(productType)
    setQrCode('')
    setOrderNo('')
    setError('')
  }

  const handlePurchase = async () => {
    if (!selectedProduct) return

    setLoading(selectedProduct)
    setError('')

    try {
      const res = await fetch('/api/payment/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberType: selectedProduct,
          payType
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || '创建订单失败')
        return
      }

      setOrderNo(data.orderNo)

      if (payType === 'alipay' && data.payUrl) {
        // 支付宝跳转支付
        window.open(data.payUrl, '_blank')
        startPolling(data.orderNo)
      } else if (payType === 'wechat' && data.codeUrl) {
        // 微信扫码支付
        setQrCode(data.codeUrl)
        startPolling(data.orderNo)
      }
    } catch {
      setError('网络错误，请重试')
    } finally {
      setLoading(null)
    }
  }

  const startPolling = (orderNo: string) => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
    }

    pollingRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/payment/status?orderNo=${orderNo}`)
        const data = await res.json()

        if (data.order?.status === 'PAID') {
          if (pollingRef.current) {
            clearInterval(pollingRef.current)
          }
          handleClose()
          window.location.reload()
        }
      } catch (e) {
        console.error('Polling error:', e)
      }
    }, 2000)

    // 5分钟后停止轮询
    setTimeout(() => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
      }
    }, 5 * 60 * 1000)
  }

  const handleClose = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
    }
    setSelectedProduct(null)
    setQrCode('')
    setOrderNo('')
    setError('')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="relative text-center">
          <button onClick={handleClose} className="absolute right-4 top-4 text-gray-700 hover:text-gray-800">
            <X className="h-5 w-5" />
          </button>
          <CardTitle className="flex items-center justify-center gap-2 text-xl">
            <Crown className="h-6 w-6 text-yellow-500" />
            升级会员，无限生成
          </CardTitle>
          <p className="text-sm text-gray-700 mt-2">解锁全部功能，畅享无限创作</p>
        </CardHeader>
        <CardContent>
          {/* 套餐选择 */}
          <div className="grid md:grid-cols-3 gap-4 mb-6">
            {PAY_PRODUCTS.map((product) => (
              <div
                key={product.type}
                onClick={() => handleSelectProduct(product.type)}
                className={`relative rounded-xl border-2 p-4 cursor-pointer transition-all ${
                  selectedProduct === product.type
                    ? 'border-red-500 bg-red-50'
                    : product.type === 'MONTH'
                    ? 'border-orange-300 bg-orange-50/50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {product.type === 'MONTH' && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                    推荐
                  </span>
                )}
                <h3 className="text-lg font-semibold text-center">{product.name}</h3>
                <div className="text-center my-4">
                  <span className="text-3xl font-bold text-red-500">¥{(product.price / 100).toFixed(0)}</span>
                  {product.originalPrice && (
                    <span className="text-sm text-gray-700 line-through ml-2">
                      ¥{(product.originalPrice / 100).toFixed(0)}
                    </span>
                  )}
                </div>
                <ul className="space-y-2 text-sm text-gray-800 mb-4">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    无限次生成
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    全部 AI 模型
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    历史记录保存
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    {product.days} 天有效期
                  </li>
                </ul>
              </div>
            ))}
          </div>

          {/* 支付方式选择 */}
          {selectedProduct && !qrCode && (
            <div className="mb-6">
              <h3 className="font-medium mb-3">选择支付方式</h3>
              <div className="flex gap-4">
                <button
                  onClick={() => setPayType('alipay')}
                  className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                    payType === 'alipay'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <svg className="w-6 h-6" viewBox="0 0 1024 1024" fill="#1677FF">
                      <path d="M1024 629.76c0-0.64 0-1.28 0-1.92-0.64-5.12-1.28-10.24-2.56-15.36-0.64-1.92-0.64-3.84-1.28-5.76-1.28-5.12-3.2-10.24-5.12-14.72-0.64-1.28-1.28-2.56-1.92-3.84-2.56-5.12-5.12-9.6-8.32-14.08-0.64-0.64-0.64-1.28-1.28-1.92-3.84-5.12-7.68-9.6-12.16-13.44l-0.64-0.64c-4.48-3.84-9.6-7.68-14.72-10.88-1.28-0.64-2.56-1.28-3.84-1.92-4.48-2.56-9.6-5.12-14.72-6.4-1.92-0.64-3.84-1.28-5.76-1.92-5.12-1.28-10.24-2.56-15.36-3.2-1.92 0-3.84-0.64-5.76-0.64-6.4-0.64-12.8-0.64-19.2 0H640v-128h256c35.2 0 64-28.8 64-64s-28.8-64-64-64H640V128c0-35.2-28.8-64-64-64s-64 28.8-64 64v128H256c-35.2 0-64 28.8-64 64s28.8 64 64 64h256v128H170.88c-6.4 0-12.8 0.64-19.2 1.28-1.92 0-3.84 0.64-5.76 0.64-5.12 0.64-10.24 1.92-15.36 3.2-1.92 0.64-3.84 1.28-5.76 1.92-5.12 1.92-9.6 3.84-14.72 6.4-1.28 0.64-2.56 1.28-3.84 1.92-5.12 3.2-10.24 6.4-14.72 10.88l-0.64 0.64c-4.48 3.84-8.32 8.32-12.16 13.44-0.64 0.64-0.64 1.28-1.28 1.92-3.2 4.48-5.76 8.96-8.32 14.08-0.64 1.28-1.28 2.56-1.92 3.84-1.92 4.48-3.84 9.6-5.12 14.72-0.64 1.92-0.64 3.84-1.28 5.76-1.28 5.12-1.92 10.24-2.56 15.36 0 0.64 0 1.28 0 1.92-0.64 3.84-0.64 7.68-0.64 11.52v234.88c0 3.84 0 7.68 0.64 11.52 0 0.64 0 1.28 0 1.92 0.64 5.12 1.28 10.24 2.56 15.36 0.64 1.92 0.64 3.84 1.28 5.76 1.28 5.12 3.2 10.24 5.12 14.72 0.64 1.28 1.28 2.56 1.92 3.84 2.56 5.12 5.12 9.6 8.32 14.08 0.64 0.64 0.64 1.28 1.28 1.92 3.84 5.12 7.68 9.6 12.16 13.44l0.64 0.64c4.48 3.84 9.6 7.68 14.72 10.88 1.28 0.64 2.56 1.28 3.84 1.92 4.48 2.56 9.6 5.12 14.72 6.4 1.92 0.64 3.84 1.28 5.76 1.92 5.12 1.28 10.24 2.56 15.36 3.2 1.92 0 3.84 0.64 5.76 0.64 6.4 0.64 12.8 0.64 19.2 0h682.24c6.4 0 12.8-0.64 19.2-1.28 1.92 0 3.84-0.64 5.76-0.64 5.12-0.64 10.24-1.92 15.36-3.2 1.92-0.64 3.84-1.28 5.76-1.92 5.12-1.92 9.6-3.84 14.72-6.4 1.28-0.64 2.56-1.28 3.84-1.92 5.12-3.2 10.24-6.4 14.72-10.88l0.64-0.64c4.48-3.84 8.32-8.32 12.16-13.44 0.64-0.64 0.64-1.28 1.28-1.92 3.2-4.48 5.76-8.96 8.32-14.08 0.64-1.28 1.28-2.56 1.92-3.84 1.92-4.48 3.84-9.6 5.12-14.72 0.64-1.92 0.64-3.84 1.28-5.76 1.28-5.12 1.92-10.24 2.56-15.36 0-0.64 0-1.28 0-1.92 0.64-3.84 0.64-7.68 0.64-11.52V640c0-3.84 0-7.04-0.64-10.24z"/>
                    </svg>
                    <span className="font-medium">支付宝</span>
                  </div>
                </button>
                <button
                  onClick={() => setPayType('wechat')}
                  className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                    payType === 'wechat'
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <svg className="w-6 h-6" viewBox="0 0 1024 1024" fill="#07C160">
                      <path d="M690.1 377.4c5.9 0 11.8 0.2 17.6 0.5-15.8-73.2-88.9-127.9-174.3-127.9-95.5 0-173.1 63.4-173.1 141.5 0 45.2 24.6 82.4 65.7 110.5l-16.4 49.4 57.5-28.7c20.5 4.1 37 8.2 57.5 8.2 5.7 0 11.4-0.2 17-0.7-3.6-12.1-5.6-24.7-5.6-37.8 0-64.4 68.5-115 154.1-115z m-93.5-32.7c12.3 0 20.5 8.2 20.5 20.5s-8.2 20.5-20.5 20.5-24.6-8.2-24.6-20.5 12.3-20.5 24.6-20.5z m-122.9 41c-12.3 0-24.6-8.2-24.6-20.5s12.3-20.5 24.6-20.5 20.5 8.2 20.5 20.5-8.2 20.5-20.5 20.5z"/>
                      <path d="M868.2 491.1c0-69.8-68.5-127.9-149.2-127.9-84.8 0-149.2 58.1-149.2 127.9s64.4 127.9 149.2 127.9c16.4 0 32.8-4.1 49.2-8.2l45.2 24.6-12.3-41c32.8-24.6 67.1-57.5 67.1-103.3z m-196.4-20.5c-8.2 0-16.4-8.2-16.4-16.4s8.2-16.4 16.4-16.4 20.5 8.2 20.5 16.4-12.3 16.4-20.5 16.4z m94.3 0c-8.2 0-16.4-8.2-16.4-16.4s8.2-16.4 16.4-16.4 20.5 8.2 20.5 16.4-12.3 16.4-20.5 16.4z"/>
                    </svg>
                    <span className="font-medium">微信支付</span>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* 微信二维码 */}
          {qrCode && (
            <div className="text-center mb-6">
              <p className="text-gray-800 mb-4">请使用微信扫描二维码完成支付</p>
              <div className="inline-block p-4 bg-white border rounded-xl">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrCode)}`}
                  alt="微信支付二维码"
                  className="w-48 h-48"
                />
              </div>
              <p className="text-sm text-gray-700 mt-4">订单号：{orderNo}</p>
              <p className="text-sm text-orange-500 mt-2">支付完成后页面将自动刷新</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => {
                  setQrCode('')
                  setOrderNo('')
                }}
              >
                重新选择
              </Button>
            </div>
          )}

          {/* 错误提示 */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* 支付按钮 */}
          {selectedProduct && !qrCode && (
            <Button
              className="w-full h-12 text-lg bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600"
              onClick={handlePurchase}
              disabled={!!loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  处理中...
                </>
              ) : (
                <>
                  立即支付 ¥{(PAY_PRODUCTS.find(p => p.type === selectedProduct)?.price || 0) / 100}
                </>
              )}
            </Button>
          )}

          <p className="text-center text-xs text-gray-700 mt-4">支付即表示同意《用户协议》和《隐私政策》</p>
        </CardContent>
      </Card>
    </div>
  )
}
