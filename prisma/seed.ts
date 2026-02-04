/**
 * 数据库种子数据脚本
 * 用于初始化开发和测试环境的数据
 * 
 * 运行方式：
 * pnpm tsx prisma/seed.ts
 */

import { PrismaClient } from '@prisma/client'
import { hashPassword } from '../src/lib/auth'
import { generateRedemptionCode } from '../src/lib/redemption'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 开始播种数据...\n')

  // 1. 创建测试用户
  console.log('📝 创建测试用户...')
  
  const testUsers = [
    {
      phone: '13800138000',
      email: 'free@example.com',
      password: await hashPassword('123456'),
      nickname: '免费用户',
      memberType: 'FREE' as const,
      points: 0,
    },
    {
      phone: '13800138001',
      email: 'vip@example.com',
      password: await hashPassword('123456'),
      nickname: 'VIP用户',
      memberType: 'VIP' as const,
      memberExpire: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 天后过期
      points: 50,
    },
    {
      phone: '13800138002',
      email: 'points@example.com',
      password: await hashPassword('123456'),
      nickname: '点数用户',
      memberType: 'FREE' as const,
      points: 100,
    },
  ]

  for (const userData of testUsers) {
    const user = await prisma.user.upsert({
      where: { phone: userData.phone },
      update: userData,
      create: userData,
    })
    console.log(`  ✅ 创建用户: ${user.nickname} (${user.phone})`)
  }

  // 2. 创建测试生成记录
  console.log('\n📝 创建测试��成记录...')
  
  const freeUser = await prisma.user.findUnique({ where: { phone: '13800138000' } })
  
  if (freeUser) {
    const generations = [
      {
        userId: freeUser.id,
        contentType: 'note',
        category: 'beauty',
        topic: '夏日防晒推荐',
        keywords: '防晒霜,SPF50',
        style: 'lively',
        aiProvider: 'anthropic',
        title: '🌞 夏日防晒必备！这些防晒霜真的好用',
        content: '姐妹们，夏天到了，防晒一定要做好！今天给大家推荐几款我用过的���好用防晒霜...',
        tags: ['防晒', '护肤', '夏日必备'],
        coverText: '防晒做得好，皮肤不会老',
      },
      {
        userId: freeUser.id,
        contentType: 'note',
        category: 'food',
        topic: '美食探店',
        keywords: '火锅,川菜',
        style: 'lively',
        aiProvider: 'anthropic',
        title: '🔥 这家火锅店太绝了！必须安利给你们',
        content: '今天去了一家超级好吃的火锅店，真的是我吃过最好吃的火锅之一...',
        tags: ['美食', '火锅', '探店'],
        coverText: '好吃到飞起的火锅店',
      },
    ]

    for (const genData of generations) {
      const generation = await prisma.generation.create({ data: genData })
      console.log(`  ✅ 创建生成记录: ${generation.title}`)
    }
  }

  // 3. 创建测试订单
  console.log('\n📝 创建测试订单...')
  
  const vipUser = await prisma.user.findUnique({ where: { phone: '13800138001' } })
  
  if (vipUser) {
    const orders = [
      {
        orderNo: `XHS${Date.now()}001`,
        userId: vipUser.id,
        productType: 'VIP_30',
        productName: '30天VIP会员',
        quantity: 1,
        amount: 2999,
        status: 'PAID' as const,
        payType: 'alipay',
        tradeNo: `ALIPAY${Date.now()}`,
        paidAt: new Date(),
      },
      {
        orderNo: `XHS${Date.now()}002`,
        userId: vipUser.id,
        productType: 'POINTS_50',
        productName: '50点数',
        quantity: 1,
        amount: 399,
        status: 'PAID' as const,
        payType: 'wechat',
        tradeNo: `WECHAT${Date.now()}`,
        paidAt: new Date(),
      },
    ]

    for (const orderData of orders) {
      const order = await prisma.order.create({ data: orderData })
      console.log(`  ✅ 创建订单: ${order.orderNo} - ${order.productName}`)
    }
  }

  // 4. 创建测试兑换码
  console.log('\n📝 创建测试兑换码...')
  
  const redemptionCodes = [
    {
      codeCategory: 'VIP' as const,
      rewardType: 'VIP_7' as const,
      rewardValue: 7,
      maxUses: 1,
      note: '测试兑换码 - 7天VIP',
    },
    {
      codeCategory: 'POINTS' as const,
      rewardType: 'POINTS_10' as const,
      rewardValue: 10,
      maxUses: 10,
      note: '测试兑换码 - 10点数（可用10次）',
    },
    {
      codeCategory: 'VIP' as const,
      rewardType: 'VIP_30' as const,
      rewardValue: 30,
      maxUses: 1,
      expireAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 天后过期
      note: '测试兑换码 - 30天VIP（7天后过期）',
    },
  ]

  for (const codeData of redemptionCodes) {
    const codeDisplay = generateRedemptionCode()
    const code = await prisma.redemptionCode.create({
      data: {
        ...codeData,
        code: codeDisplay, // 实际应该加密，这里简化处理
        codeDisplay,
        status: 'ACTIVE',
        usedCount: 0,
      },
    })
    console.log(`  ✅ 创建兑换码: ${code.codeDisplay} - ${code.note}`)
  }

  // 5. 创建点数配置
  console.log('\n📝 创建点数配置...')
  
  const pointsConfig = {
    dailyFreePoints: {
      free: 3,
      vip: 13,
    },
    generation: {
      basePointsPerVersion: 3,
    },
  }

  await prisma.settings.upsert({
    where: { key: 'points_config' },
    update: { value: JSON.stringify(pointsConfig) },
    create: {
      key: 'points_config',
      value: JSON.stringify(pointsConfig),
      desc: '点数系统配置',
    },
  })
  console.log('  ✅ 创建点数配置')

  // 6. 创建 AI 配置
  console.log('\n📝 创建 AI 配置...')
  
  const aiConfigs = [
    {
      provider: 'anthropic',
      name: 'Claude',
      model: 'claude-3-5-sonnet-20241022',
      enabled: true,
      sortOrder: 1,
    },
    {
      provider: 'openai',
      name: 'OpenAI GPT',
      model: 'gpt-4-turbo-preview',
      enabled: true,
      sortOrder: 2,
    },
    {
      provider: 'deepseek',
      name: 'DeepSeek',
      model: 'deepseek-chat',
      enabled: true,
      sortOrder: 3,
    },
    {
      provider: 'zhipu',
      name: '智谱 AI',
      model: 'glm-4',
      enabled: true,
      sortOrder: 4,
    },
  ]

  for (const aiConfig of aiConfigs) {
    await prisma.aIConfig.upsert({
      where: { provider: aiConfig.provider },
      update: aiConfig,
      create: aiConfig,
    })
    console.log(`  ✅ 创建 AI 配置: ${aiConfig.name}`)
  }

  console.log('\n✅ 数据播种完成！\n')
  console.log('📊 数据统计：')
  console.log(`  - 用户: ${await prisma.user.count()}`)
  console.log(`  - 生成记录: ${await prisma.generation.count()}`)
  console.log(`  - 订单: ${await prisma.order.count()}`)
  console.log(`  - 兑换码: ${await prisma.redemptionCode.count()}`)
  console.log(`  - 系统配置: ${await prisma.settings.count()}`)
  console.log(`  - AI 配置: ${await prisma.aIConfig.count()}`)
  
  console.log('\n🔑 测试账号：')
  console.log('  免费用户: 13800138000 / 123456')
  console.log('  VIP用户:  13800138001 / 123456')
  console.log('  点数用户: 13800138002 / 123456')
  
  console.log('\n🎫 测试兑换码：')
  const codes = await prisma.redemptionCode.findMany({
    where: { status: 'ACTIVE' },
    select: { codeDisplay: true, note: true },
  })
  codes.forEach(code => {
    console.log(`  ${code.codeDisplay} - ${code.note}`)
  })
}

main()
  .catch((e) => {
    console.error('❌ 播种数据失败:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
