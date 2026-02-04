'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle, XCircle, Loader2, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'

function PaymentResultContent() {
  const searchParams = useSearchParams()
  const orderNo = searchParams.get('out_trade_no') || searchParams.get('orderNo')

  const [status, setStatus] = useState<'loading' | 'success' | 'failed'>('loading')
  const [order, setOrder] = useState<{
    orderNo: string
    productType: string
    amount: number
    status: string
    paidAt: string | null
  } | null>(null)

  useEffect(() => {
    if (!orderNo) {
      setStatus('failed')
      return
    }

    const checkOrder = async () => {
      try {
        const res = await fetch(`/api/payment/status?orderNo=${orderNo}`)
        const data = await res.json()

        if (data.order) {
          setOrder(data.order)
          if (data.order.status === 'PAID') {
            setStatus('success')
          } else if (data.order.status === 'FAILED') {
            setStatus('failed')
          } else {
            // 继续轮询
            setTimeout(checkOrder, 2000)
          }
        } else {
          setStatus('failed')
        }
      } catch (e) {
        console.error(e)
        setStatus('failed')
      }
    }

    checkOrder()
  }, [orderNo])

  const memberTypeLabels: Record<string, string> = {
    DAY: '日卡会员',
    MONTH: '月卡会员',
    YEAR: '年卡会员',
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-pink-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
        {status === 'loading' && (
          <>
            <Loader2 className="h-16 w-16 text-orange-500 animate-spin mx-auto mb-4" />
            <h1 className="text-xl font-bold mb-2">正在确认支付结果...</h1>
            <p className="text-gray-700">请稍候，正在查询订单状态</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold mb-2">支付成功！</h1>
            <p className="text-gray-700 mb-6">
              恭喜您成为{memberTypeLabels[order?.productType || ''] || '会员'}
            </p>
            {order && (
              <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-700">订单号</span>
                  <span className="font-medium">{order.orderNo}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-700">会员类型</span>
                  <span className="font-medium">{memberTypeLabels[order.productType]}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-700">支付金额</span>
                  <span className="font-medium text-orange-500">
                    ¥{(order.amount / 100).toFixed(2)}
                  </span>
                </div>
                {order.paidAt && (
                  <div className="flex justify-between py-2">
                    <span className="text-gray-700">支付时间</span>
                    <span className="font-medium">
                      {new Date(order.paidAt).toLocaleString('zh-CN')}
                    </span>
                  </div>
                )}
              </div>
            )}
            <Link href="/">
              <Button className="w-full bg-gradient-to-r from-orange-500 to-pink-500">
                <Home className="h-4 w-4 mr-2" />
                返回首页开始创作
              </Button>
            </Link>
          </>
        )}

        {status === 'failed' && (
          <>
            <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold mb-2">支付未完成</h1>
            <p className="text-gray-700 mb-6">
              订单支付未成功，请重新尝试
            </p>
            <div className="space-y-3">
              <Link href="/">
                <Button className="w-full bg-gradient-to-r from-orange-500 to-pink-500">
                  <Home className="h-4 w-4 mr-2" />
                  返回首页
                </Button>
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function PaymentResultPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-pink-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-orange-500 animate-spin" />
      </div>
    }>
      <PaymentResultContent />
    </Suspense>
  )
}
