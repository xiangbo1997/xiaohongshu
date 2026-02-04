import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAdminSession } from '@/lib/admin-auth'

// 修改兑换码（禁用/修改备注）
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 验证管理员权限
    const { isAdmin } = await getAdminSession()
    if (!isAdmin) {
      return NextResponse.json({ error: '未授权' }, { status: 401 })
    }

    const body = await req.json()
    const { status, note } = body

    // 查询兑换码
    const code = await prisma.redemptionCode.findUnique({
      where: { id: params.id },
    })

    if (!code) {
      return NextResponse.json({ error: '兑换码不存在' }, { status: 404 })
    }

    // 更新数据
    const updateData: any = {}
    if (status && ['ACTIVE', 'DISABLED', 'EXPIRED'].includes(status)) {
      updateData.status = status
    }
    if (note !== undefined) {
      updateData.note = note || null
    }

    const updated = await prisma.redemptionCode.update({
      where: { id: params.id },
      data: updateData,
      select: {
        id: true,
        codeDisplay: true,
        rewardType: true,
        rewardValue: true,
        status: true,
        maxUses: true,
        usedCount: true,
        expireAt: true,
        note: true,
        createdAt: true,
      },
    })

    return NextResponse.json({ success: true, code: updated })
  } catch (error) {
    console.error('Update redemption code error:', error)
    return NextResponse.json({ error: '更新兑换码失败' }, { status: 500 })
  }
}

// 删除兑换码
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 验证管理员权限
    const { isAdmin } = await getAdminSession()
    if (!isAdmin) {
      return NextResponse.json({ error: '未授权' }, { status: 401 })
    }

    // 检查兑换码是否存在
    const code = await prisma.redemptionCode.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: { records: true },
        },
      },
    })

    if (!code) {
      return NextResponse.json({ error: '兑换码不存在' }, { status: 404 })
    }

    // 如果已被使用，不允许删除
    if (code._count.records > 0) {
      return NextResponse.json(
        { error: '该兑换码已被使用，不允许删除' },
        { status: 400 }
      )
    }

    // 删除兑换码
    await prisma.redemptionCode.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete redemption code error:', error)
    return NextResponse.json({ error: '删除兑换码失败' }, { status: 500 })
  }
}
