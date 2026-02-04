'use client'

import { useState } from 'react'
import { Gift, X, Check } from 'lucide-react'

interface RedeemModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (codeCategory: 'VIP' | 'POINTS', rewardValue: number) => void
}

export default function RedeemModal({
  isOpen,
  onClose,
  onSuccess,
}: RedeemModalProps) {
  const [code, setCode] = useState('')
  const [redeeming, setRedeeming] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [redeemResult, setRedeemResult] = useState<{ codeCategory: 'VIP' | 'POINTS'; rewardValue: number } | null>(null)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setRedeeming(true)

    try {
      const res = await fetch('/api/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || '兑换失败')
        return
      }

      setSuccess(true)
      setRedeemResult({
        codeCategory: data.codeCategory,
        rewardValue: data.rewardValue,
      })
      onSuccess(data.codeCategory, data.rewardValue)

      setTimeout(() => {
        handleClose()
      }, 2000)
    } catch {
      setError('网络错误，请重试')
    } finally {
      setRedeeming(false)
    }
  }

  const handleClose = () => {
    setCode('')
    setError('')
    setSuccess(false)
    setRedeemResult(null)
    onClose()
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // 自动转大写并格式化为 XXXX-XXXX-XXXX-XXXX-XXXXX-XXXXX（26位）
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')
    let formatted = ''
    for (let i = 0; i < value.length && i < 26; i++) {
      // 前16位每4位一组，后10位每5位一组
      if (i > 0 && i < 16 && i % 4 === 0) formatted += '-'
      else if (i >= 16 && i === 21) formatted += '-'
      formatted += value[i]
    }
    setCode(formatted)
    setError('')
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Gift className="w-5 h-5 text-orange-500" />
            兑换码兑换
          </h2>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-gray-100 rounded"
            disabled={redeeming || success}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {success ? (
            <div className="py-8 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-green-500" />
              </div>
              <h3 className="text-lg font-bold text-green-600 mb-2">
                兑换成功！
              </h3>
              <p className="text-gray-800">
                {redeemResult?.codeCategory === 'VIP'
                  ? `已获得 ${redeemResult.rewardValue} 天 VIP 会员`
                  : `已获得 ${redeemResult?.rewardValue} 点数`}
              </p>
            </div>
          ) : (
            <>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  请输入兑换码
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={handleInputChange}
                  placeholder="XXXX-XXXX-XXXX-XXXX-XXXXX-XXXXX"
                  className="w-full px-4 py-3 text-center text-lg tracking-widest border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none font-mono"
                  disabled={redeeming}
                  maxLength={31}
                />
                <p className="mt-2 text-xs text-gray-700">
                  兑换码格式为 26 位字符，系统会自动格式化
                </p>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg">
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={redeeming}
                  className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={redeeming || code.replace(/-/g, '').length !== 26}
                  className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
                >
                  {redeeming ? '兑换中...' : '立即兑换'}
                </button>
              </div>

              <div className="mt-4 p-3 bg-orange-50 text-orange-700 text-xs rounded-lg">
                <p className="font-medium mb-1">兑换说明：</p>
                <ul className="list-disc list-inside space-y-1 text-orange-600">
                  <li>每个兑换码仅可使用一次</li>
                  <li>VIP 会员时间累加，点数立即到账</li>
                  <li>请妥善保管兑换码，泄露后可能被他人使用</li>
                </ul>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  )
}
