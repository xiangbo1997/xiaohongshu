import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { logger } from '@/lib/logger'
import {
  MEMBER_PRICES,
  MEMBER_NAMES,
  generateOrderNo,
  createAlipayUrl,
  createWechatNativeOrder,
  ALIPAY_CONFIG,
  WECHAT_CONFIG,
} from '@/lib/payment'

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 })
    }

    const body = await req.json()
    const { memberType, payType } = body

    // 验证会员类型
    if (!['DAY', 'MONTH', 'YEAR'].includes(memberType)) {
      return NextResponse.json({ error: '无效的会员类型' }, { status: 400 })
    }

    // 验证支付方式
    if (!['alipay', 'wechat'].includes(payType)) {
      return NextResponse.json({ error: '无效的支付方式' }, { status: 400 })
    }

    const amount = MEMBER_PRICES[memberType as keyof typeof MEMBER_PRICES]
    const productName = MEMBER_NAMES[memberType as keyof typeof MEMBER_NAMES]
    const orderNo = generateOrderNo()

    // 创建订单
    const order = await prisma.order.create({
      data: {
        orderNo,
        userId: user.id,
        productType: memberType,
        amount,
        payType,
      },
    })

    await logger.info('payment', `创建订单: ${orderNo}`, {
      userId: user.id,
      memberType,
      payType,
      amount,
    })

    // 根据支付方式创建支付
    if (payType === 'alipay') {
      // 检查支付宝配置
      if (!ALIPAY_CONFIG.appId || !ALIPAY_CONFIG.privateKey) {
        return NextResponse.json({ error: '支付宝支付暂未配置' }, { status: 500 })
      }

      const payUrl = createAlipayUrl(orderNo, amount, `小红书文案生成器-${productName}`)
      return NextResponse.json({
        orderNo: order.orderNo,
        payType: 'alipay',
        payUrl,
      })
    } else if (payType === 'wechat') {
      // 检查微信支付配置
      if (!WECHAT_CONFIG.appId || !WECHAT_CONFIG.mchId) {
        return NextResponse.json({ error: '微信支付暂未配置' }, { status: 500 })
      }

      const result = await createWechatNativeOrder(
        orderNo,
        amount,
        `小红书文案生成器-${productName}`
      )

      if ('error' in result) {
        await logger.error('payment', `微信支付创建失败: ${result.error}`, { orderNo })
        return NextResponse.json({ error: result.error }, { status: 500 })
      }

      return NextResponse.json({
        orderNo: order.orderNo,
        payType: 'wechat',
        codeUrl: result.codeUrl,
      })
    }

    return NextResponse.json({ error: '不支持的支付方式' }, { status: 400 })
  } catch (error) {
    console.error('Create payment error:', error)
    await logger.error('payment', '创建支付订单失败', { error: String(error) })
    return NextResponse.json({ error: '创建支付订单失败' }, { status: 500 })
  }
}
