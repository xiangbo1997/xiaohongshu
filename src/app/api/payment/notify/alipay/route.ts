import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'
import { alipayVerify, ALIPAY_CONFIG, calculateExpireDate } from '@/lib/payment'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const params: Record<string, string> = {}

    formData.forEach((value, key) => {
      params[key] = value.toString()
    })

    await logger.info('payment', '收到支付宝回调', params)

    // 验证签名
    if (!alipayVerify(params, ALIPAY_CONFIG.alipayPublicKey)) {
      await logger.error('payment', '支付宝签名验证失败', params)
      return new NextResponse('fail', { status: 400 })
    }

    const orderNo = params.out_trade_no
    const tradeNo = params.trade_no
    const tradeStatus = params.trade_status

    // 查找订单
    const order = await prisma.order.findUnique({
      where: { orderNo },
      include: { user: true },
    })

    if (!order) {
      await logger.error('payment', `订单不存在: ${orderNo}`)
      return new NextResponse('fail', { status: 400 })
    }

    // 已处理过的订单直接返回成功
    if (order.status === 'PAID') {
      return new NextResponse('success')
    }

    // 支付成功
    if (tradeStatus === 'TRADE_SUCCESS' || tradeStatus === 'TRADE_FINISHED') {
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

      await logger.info('payment', `支付成功: ${orderNo}`, {
        tradeNo,
        userId: order.userId,
        memberType: order.productType,
        expireDate: expireDate.toISOString(),
      })

      return new NextResponse('success')
    }

    return new NextResponse('success')
  } catch (error) {
    console.error('Alipay notify error:', error)
    await logger.error('payment', '支付宝回调处理失败', { error: String(error) })
    return new NextResponse('fail', { status: 500 })
  }
}
