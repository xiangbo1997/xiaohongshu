import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const orderNo = searchParams.get('orderNo')

    if (!orderNo) {
      return NextResponse.json({ error: '缺少订单号' }, { status: 400 })
    }

    const order = await prisma.order.findUnique({
      where: { orderNo },
      select: {
        id: true,
        orderNo: true,
        userId: true,
        productType: true,
        amount: true,
        status: true,
        payType: true,
        paidAt: true,
        createdAt: true,
      },
    })

    if (!order) {
      return NextResponse.json({ error: '订单不存在' }, { status: 404 })
    }

    // 只能查看自己的订单
    if (order.userId !== user.id) {
      return NextResponse.json({ error: '无权查看此订单' }, { status: 403 })
    }

    return NextResponse.json({ order })
  } catch (error) {
    console.error('Get order status error:', error)
    return NextResponse.json({ error: '查询订单状态失败' }, { status: 500 })
  }
}
