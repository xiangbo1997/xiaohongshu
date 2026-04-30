import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'
import { calculateExpireDate, WECHAT_CONFIG, wechatDecryptResource, wechatVerifySign } from '@/lib/payment'

export async function POST(req: NextRequest) {
  try {
    // 获取签名验证所需的请求头
    const timestamp = req.headers.get('wechatpay-timestamp') || ''
    const nonce = req.headers.get('wechatpay-nonce') || ''
    const signature = req.headers.get('wechatpay-signature') || ''
    const serial = req.headers.get('wechatpay-serial') || ''

    // 获取原始请求体
    const rawBody = await req.text()

    await logger.info('payment', '收到微信支付回调', {
      timestamp,
      nonce,
      serial,
      bodyPreview: rawBody.substring(0, 200)
    })

    // 验证签名（如果配置了微信平台公钥）
    if (WECHAT_CONFIG.platformPublicKey) {
      const isValid = wechatVerifySign(
        timestamp,
        nonce,
        rawBody,
        signature,
        WECHAT_CONFIG.platformPublicKey
      )
      if (!isValid) {
        await logger.error('payment', '微信支付回调签名验证失败', { timestamp, nonce, serial })
        return NextResponse.json({ code: 'FAIL', message: '签名验证失败' })
      }
    }

    const body = JSON.parse(rawBody)

    // 解密通知数据
    const { resource } = body
    if (!resource) {
      return NextResponse.json({ code: 'FAIL', message: '缺少resource' })
    }

    let decryptedData: {
      out_trade_no: string
      transaction_id: string
      trade_state: string
    }

    try {
      const decryptedStr = wechatDecryptResource(
        resource.ciphertext,
        resource.associated_data || '',
        resource.nonce,
        WECHAT_CONFIG.apiV3Key
      )
      decryptedData = JSON.parse(decryptedStr)
    } catch (e) {
      await logger.error('payment', '微信支付通知解密失败', { error: String(e) })
      return NextResponse.json({ code: 'FAIL', message: '解密失败' })
    }

    const orderNo = decryptedData.out_trade_no
    const tradeNo = decryptedData.transaction_id
    const tradeState = decryptedData.trade_state

    // 查找订单
    const order = await prisma.order.findUnique({
      where: { orderNo },
      include: { user: true },
    })

    if (!order) {
      await logger.error('payment', `订单不存在: ${orderNo}`)
      return NextResponse.json({ code: 'FAIL', message: '订单不存在' })
    }

    // 已处理过的订单直接返回成功
    if (order.status === 'PAID') {
      return NextResponse.json({ code: 'SUCCESS', message: '成功' })
    }

    // 支付成功
    if (tradeState === 'SUCCESS') {
      // 计算会员到期时间
      const memberType = order.productType as 'DAY' | 'MONTH' | 'YEAR'
      const expireDate = calculateExpireDate(memberType, order.user.memberExpire)

      // 更新订单状态和用户会员
      await prisma.$transaction([
        prisma.order.update({
          where: { id: order.id },
          data: {
            status: 'PAID',
            tradeNo,
            paidAt: new Date(),
          },
        }),
        prisma.user.update({
          where: { id: order.userId },
          data: {
            memberType: 'VIP',
            memberExpire: expireDate,
          },
        }),
      ])

      await logger.info('payment', `微信支付成功: ${orderNo}`, {
        tradeNo,
        userId: order.userId,
        memberType: order.productType,
        expireDate: expireDate.toISOString(),
      })
    }

    return NextResponse.json({ code: 'SUCCESS', message: '成功' })
  } catch (error) {
    console.error('Wechat notify error:', error)
    await logger.error('payment', '微信支付回调处理失败', { error: String(error) })
    return NextResponse.json({ code: 'FAIL', message: '处理失败' })
  }
}
