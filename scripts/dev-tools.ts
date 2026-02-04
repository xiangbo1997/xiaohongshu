/**
 * 开发辅助工具脚本
 * 提供常用的开发任务
 */

import { PrismaClient } from '@prisma/client'
import { hashPassword } from '../src/lib/auth'
import { generateRedemptionCode } from '../src/lib/redemption'

const prisma = new PrismaClient()

// 命令行参数
const command = process.argv[2]
const args = process.argv.slice(3)

async function main() {
  switch (command) {
    case 'create-admin':
      await createAdminUser()
      break
    case 'create-test-user':
      await createTestUser()
      break
    case 'generate-codes':
      await generateCodes(parseInt(args[0]) || 10)
      break
    case 'reset-daily-usage':
      await resetDailyUsage()
      break
    case 'grant-vip':
      await grantVip(args[0], parseInt(args[1]) || 30)
      break
    case 'grant-points':
      await grantPoints(args[0], parseInt(args[1]) || 10)
      break
    case 'stats':
      await showStats()
      break
    case 'clean-test-data':
      await cleanTestData()
      break
    default:
      showHelp()
  }
}

// 显示帮助
function showHelp() {
  console.log(`
📦 开发辅助工具

用法: pnpm tsx scripts/dev-tools.ts <command> [args]

命令:
  create-admin                    - 创建管理员账号
  create-test-user                - 创建测试用户
  generate-codes <count>          - 生成兑换码（默认 10 个）
  reset-daily-usage               - 重置所有用户的每日使用次数
  grant-vip <userId> <days>       - 给用户赠送 VIP（默认 30 天）
  grant-points <userId> <amount>  - 给用户赠送点数（默认 10 点）
  stats                           - 显示数据统计
  clean-test-data                 - 清理测试数据

示例:
  pnpm tsx scripts/dev-tools.ts create-admin
  pnpm tsx scripts/dev-tools.ts generate-codes 50
  pnpm tsx scripts/dev-tools.ts grant-vip clxxx 30
  pnpm tsx scripts/dev-tools.ts stats
`)
}

// 创建管理员账号
async function createAdminUser() {
  console.log('👤 创建管理员账号...\n')
  
  const adminData = {
    phone: '13900000000',
    email: 'admin@example.com',
    password: await hashPassword('admin123456'),
    nickname: '系统管理员',
    memberType: 'VIP' as const,
    memberExpire: new Date('2099-12-31'),
    points: 9999,
  }

  const admin = await prisma.user.upsert({
    where: { phone: adminData.phone },
    update: adminData,
    create: adminData,
  })

  console.log('✅ 管理员账号创建成功！')
  console.log(`   手机号: ${admin.phone}`)
  console.log(`   密码: admin123456`)
  console.log(`   ID: ${admin.id}`)
}

// 创建测试用户
async function createTestUser() {
  console.log('👤 创建测试用户...\n')
  
  const timestamp = Date.now().toString().slice(-8)
  const userData = {
    phone: `139${timestamp}`,
    email: `test${timestamp}@example.com`,
    password: await hashPassword('123456'),
    nickname: `测试用户${timestamp}`,
    memberType: 'FREE' as const,
    points: 10,
  }

  const user = await prisma.user.create({ data: userData })

  console.log('✅ 测试用户创建成功！')
  console.log(`   手机号: ${user.phone}`)
  console.log(`   邮箱: ${user.email}`)
  console.log(`   密码: 123456`)
  console.log(`   ID: ${user.id}`)
}

// 生成兑换码
async function generateCodes(count: number) {
  console.log(`🎫 生成 ${count} 个兑换码...\n`)
  
  const codes = []
  
  for (let i = 0; i < count; i++) {
    const codeDisplay = generateRedemptionCode()
    const code = await prisma.redemptionCode.create({
      data: {
        code: codeDisplay,
        codeDisplay,
        codeCategory: 'VIP',
        rewardType: 'VIP_7',
        rewardValue: 7,
        status: 'ACTIVE',
        maxUses: 1,
        usedCount: 0,
        note: `批量生成 - ${new Date().toISOString()}`,
      },
    })
    codes.push(code.codeDisplay)
  }

  console.log('✅ 兑换码生成成功！\n')
  console.log('兑换码列表:')
  codes.forEach((code, index) => {
    console.log(`  ${index + 1}. ${code}`)
  })
  
  // 保存到文件
  const fs = require('fs')
  const filename = `codes_${Date.now()}.txt`
  fs.writeFileSync(filename, codes.join('\n'))
  console.log(`\n💾 已保存到文件: ${filename}`)
}

// 重置每日使用次数
async function resetDailyUsage() {
  console.log('🔄 重置所有用户的每日使用次数...\n')
  
  const result = await prisma.user.updateMany({
    data: {
      dailyFreeUsed: 0,
      lastUsageDate: new Date(),
    },
  })

  console.log(`✅ 已重置 ${result.count} 个用户的每日使用次数`)
}

// 赠送 VIP
async function grantVip(userId: string, days: number) {
  if (!userId) {
    console.log('❌ 请提供用户 ID')
    return
  }

  console.log(`🎁 给用户 ${userId} 赠送 ${days} 天 VIP...\n`)
  
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) {
    console.log('❌ 用户不存在')
    return
  }

  const now = new Date()
  const currentExpire = user.memberExpire && user.memberExpire > now ? user.memberExpire : now
  const newExpire = new Date(currentExpire)
  newExpire.setDate(newExpire.getDate() + days)

  await prisma.user.update({
    where: { id: userId },
    data: {
      memberType: 'VIP',
      memberExpire: newExpire,
    },
  })

  console.log('✅ VIP 赠送成功！')
  console.log(`   用户: ${user.nickname || user.phone}`)
  console.log(`   到期时间: ${newExpire.toISOString()}`)
}

// 赠送点数
async function grantPoints(userId: string, amount: number) {
  if (!userId) {
    console.log('❌ 请提供用户 ID')
    return
  }

  console.log(`🎁 给用户 ${userId} 赠送 ${amount} 点数...\n`)
  
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) {
    console.log('❌ 用户不存在')
    return
  }

  await prisma.$transaction(async (tx) => {
    const updatedUser = await tx.user.update({
      where: { id: userId },
      data: { points: { increment: amount } },
    })

    await tx.pointRecord.create({
      data: {
        userId,
        type: 'GIFT',
        amount,
        balance: updatedUser.points,
        description: '系统赠送',
      },
    })
  })

  console.log('✅ 点数赠送成功！')
  console.log(`   用户: ${user.nickname || user.phone}`)
  console.log(`   新余额: ${user.points + amount} 点`)
}

// 显示统计信息
async function showStats() {
  console.log('📊 数据统计\n')
  
  // 用户统计
  const totalUsers = await prisma.user.count()
  const freeUsers = await prisma.user.count({ where: { memberType: 'FREE' } })
  const vipUsers = await prisma.user.count({ where: { memberType: 'VIP' } })
  
  console.log('👥 用户统计:')
  console.log(`   总用户数: ${totalUsers}`)
  console.log(`   免费用户: ${freeUsers}`)
  console.log(`   VIP 用户: ${vipUsers}`)
  console.log('')

  // 生成记录统计
  const totalGenerations = await prisma.generation.count()
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayGenerations = await prisma.generation.count({
    where: { createdAt: { gte: today } },
  })
  
  console.log('📝 生成记录统计:')
  console.log(`   总生成数: ${totalGenerations}`)
  console.log(`   今日生成: ${todayGenerations}`)
  console.log('')

  // 订单统计
  const totalOrders = await prisma.order.count()
  const paidOrders = await prisma.order.count({ where: { status: 'PAID' } })
  const totalAmount = await prisma.order.aggregate({
    where: { status: 'PAID' },
    _sum: { amount: true },
  })
  
  console.log('💰 订单统计:')
  console.log(`   总订单数: ${totalOrders}`)
  console.log(`   已支付: ${paidOrders}`)
  console.log(`   总金额: ¥${((totalAmount._sum.amount || 0) / 100).toFixed(2)}`)
  console.log('')

  // 兑换码统计
  const totalCodes = await prisma.redemptionCode.count()
  const activeCodes = await prisma.redemptionCode.count({ where: { status: 'ACTIVE' } })
  const usedCodes = await prisma.redemptionCode.count({ where: { status: 'DEPLETED' } })
  
  console.log('🎫 兑换码统计:')
  console.log(`   总兑换码: ${totalCodes}`)
  console.log(`   有效: ${activeCodes}`)
  console.log(`   已用完: ${usedCodes}`)
  console.log('')

  // 点数统计
  const pointsStats = await prisma.user.aggregate({
    _sum: { points: true },
    _avg: { points: true },
  })
  
  console.log('💎 点数统计:')
  console.log(`   总点数: ${pointsStats._sum.points || 0}`)
  console.log(`   平均点数: ${(pointsStats._avg.points || 0).toFixed(2)}`)
}

// 清理测试数据
async function cleanTestData() {
  console.log('🧹 清理测试数据...\n')
  
  console.log('⚠️  警告: 此操作将删除所有测试数据！')
  console.log('将删除:')
  console.log('  - 手机号以 138/139 开头的用户')
  console.log('  - 邮箱包含 test/example 的用户')
  console.log('  - 相关的生成记录、订单、收藏等')
  console.log('')
  
  // 这里应该添加确认逻辑，但在脚本中简化处理
  
  // 查找测试用户
  const testUsers = await prisma.user.findMany({
    where: {
      OR: [
        { phone: { startsWith: '138' } },
        { phone: { startsWith: '139' } },
        { email: { contains: 'test' } },
        { email: { contains: 'example' } },
      ],
    },
  })

  console.log(`找到 ${testUsers.length} 个测试用户`)
  
  // 删除相关数据
  for (const user of testUsers) {
    await prisma.generation.deleteMany({ where: { userId: user.id } })
    await prisma.favorite.deleteMany({ where: { userId: user.id } })
    await prisma.order.deleteMany({ where: { userId: user.id } })
    await prisma.redemptionRecord.deleteMany({ where: { userId: user.id } })
    await prisma.pointRecord.deleteMany({ where: { userId: user.id } })
    await prisma.user.delete({ where: { id: user.id } })
    
    console.log(`  ✅ 删除用户: ${user.nickname || user.phone}`)
  }

  console.log('\n✅ 测试数据清理完成！')
}

// 执行主函数
main()
  .catch((e) => {
    console.error('❌ 执行失败:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
