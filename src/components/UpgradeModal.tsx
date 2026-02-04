'use client'

import { useState } from 'react'
import { X, Crown, Check, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface UpgradeModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

const PLANS = [
  {
    type: 'DAY',
    name: '日卡会员',
    price: 1.99,
    originalPrice: 3.99,
    duration: '1天',
    features: ['无限次生成', '全部AI模型', '优先响应'],
    popular: false,
  },
  {
    type: 'MONTH',
    name: '月卡会员',
    price: 9.99,
    originalPrice: 19.99,
    duration: '30天',
    features: ['无限次生成', '全部AI模型', '优先响应', '历史记录'],
    popular: true,
  },
  {
    type: 'YEAR',
    name: '年卡会员',
    price: 49.99,
    originalPrice: 99.99,
    duration: '365天',
    features: ['无限次生成', '全部AI模型', '优先响应', '历史记录', '专属客服'],
    popular: false,
  },
]

export function UpgradeModal({ isOpen, onClose, onSuccess }: UpgradeModalProps) {
  const [selectedPlan, setSelectedPlan] = useState('MONTH')
  const [payType, setPayType] = useState<'alipay' | 'wechat'>('alipay')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [qrCode, setQrCode] = useState('')
  const [orderNo, setOrderNo] = useState('')

  if (!isOpen) return null

  const handlePay = async () => {
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/payment/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberType: selectedPlan,
          payType,
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
        // 开始轮询订单状态
        startPolling(data.orderNo)
      } else if (payType === 'wechat' && data.codeUrl) {
        // 微信扫码支付
        setQrCode(data.codeUrl)
        // 开始轮询订单状态
        startPolling(data.orderNo)
      }
    } catch (e) {
      setError('网络错误，请重试')
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const startPolling = (orderNo: string) => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/payment/status?orderNo=${orderNo}`)
        const data = await res.json()

        if (data.order?.status === 'PAID') {
          clearInterval(interval)
          onSuccess?.()
          onClose()
          // 刷新页面以更新用户状态
          window.location.reload()
        }
      } catch (e) {
        console.error('Polling error:', e)
      }
    }, 2000)

    // 5分钟后停止轮询
    setTimeout(() => clearInterval(interval), 5 * 60 * 1000)
  }

  const handleClose = () => {
    setQrCode('')
    setOrderNo('')
    setError('')
    onClose()
  }

  const selectedPlanData = PLANS.find((p) => p.type === selectedPlan)

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-2">
            <Crown className="h-6 w-6 text-yellow-500" />
            <h2 className="text-xl font-bold">升级会员</h2>
          </div>
          <button onClick={handleClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 内容 */}
        <div className="p-6">
          {/* 套餐选择 */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {PLANS.map((plan) => (
              <div
                key={plan.type}
                onClick={() => setSelectedPlan(plan.type)}
                className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  selectedPlan === plan.type
                    ? 'border-orange-500 bg-orange-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-orange-500 text-white text-xs rounded-full">
                    推荐
                  </div>
                )}
                <div className="text-center">
                  <h3 className="font-bold text-lg">{plan.name}</h3>
                  <p className="text-gray-700 text-sm">{plan.duration}</p>
                  <div className="mt-2">
                    <span className="text-2xl font-bold text-orange-500">¥{plan.price}</span>
                    <span className="text-gray-700 text-sm line-through ml-2">
                      ¥{plan.originalPrice}
                    </span>
                  </div>
                </div>
                <ul className="mt-4 space-y-2">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-gray-800">
                      <Check className="h-4 w-4 text-green-500" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* 支付方式 */}
          {!qrCode && (
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
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="#1677FF">
                      <path d="M21.422 15.358c-3.83-1.153-6.055-1.84-7.373-2.18.71-1.675 1.216-3.559 1.216-5.178 0-2.5-1.5-4-4-4s-4 1.5-4 4c0 1.619.506 3.503 1.216 5.178-1.318.34-3.543 1.027-7.373 2.18C.108 15.608 0 16.108 0 16.5c0 .892.608 1.5 1.5 1.5h21c.892 0 1.5-.608 1.5-1.5 0-.392-.108-.892-1.078-1.142z"/>
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
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="#07C160">
                      <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178A1.17 1.17 0 0 1 4.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178 1.17 1.17 0 0 1-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 0 1 .598.082l1.584.926a.272.272 0 0 0 .14.047c.134 0 .24-.111.24-.247 0-.06-.023-.12-.038-.177l-.327-1.233a.582.582 0 0 1-.023-.156.49.49 0 0 1 .201-.398C23.024 18.48 24 16.82 24 14.98c0-3.21-2.931-5.837-6.656-6.088V8.87l-.002-.002-.404-.01zm-2.53 2.04c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.97-.982zm4.844 0c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.97-.982z"/>
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
            </div>
          )}

          {/* 错误提示 */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* 支付按钮 */}
          {!qrCode && (
            <Button
              onClick={handlePay}
              disabled={loading}
              className="w-full h-12 text-lg bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  处理中...
                </>
              ) : (
                <>立即支付 ¥{selectedPlanData?.price}</>
              )}
            </Button>
          )}

          {/* 提示 */}
          <p className="text-center text-xs text-gray-700 mt-4">
            支付即表示同意《会员服务协议》
          </p>
        </div>
      </div>
    </div>
  )
}
