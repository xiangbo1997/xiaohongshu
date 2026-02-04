#!/usr/bin/env tsx
/**
 * 性能监控脚本
 *
 * 功能：
 * - 数据库性能监控
 * - API 响应时间统计
 * - 系统资源使用情况
 * - 慢查询分析
 * - 性能报告生成
 */

import { PrismaClient } from '@prisma/client'
import * as os from 'os'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
}

function colorize(text: string, color: keyof typeof colors): string {
  return `${colors[color]}${text}${colors.reset}`
}

// 格式化字节
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`
}

// 格式化百分比
function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`
}

// 系统信息
async function systemInfo() {
  console.log(colorize('\n🖥️  系统信息', 'cyan'))
  console.log(colorize('─'.repeat(80), 'gray'))

  const cpus = os.cpus()
  const totalMem = os.totalmem()
  const freeMem = os.freemem()
  const usedMem = totalMem - freeMem
  const memUsage = (usedMem / totalMem) * 100

  console.log(colorize('\nCPU 信息：', 'yellow'))
  console.log(`  型号: ${cpus[0].model}`)
  console.log(`  核心数: ${cpus.length}`)
  console.log(`  速度: ${cpus[0].speed} MHz`)

  console.log(colorize('\n内存信息：', 'yellow'))
  console.log(`  总内存: ${formatBytes(totalMem)}`)
  console.log(`  已用: ${formatBytes(usedMem)} (${formatPercent(memUsage)})`)
  console.log(`  可用: ${formatBytes(freeMem)}`)

  console.log(colorize('\n系统信息：', 'yellow'))
  console.log(`  平台: ${os.platform()}`)
  console.log(`  架构: ${os.arch()}`)
  console.log(`  主机名: ${os.hostname()}`)
  console.log(`  运行时间: ${Math.floor(os.uptime() / 3600)} 小时`)

  // Node.js 进程信息
  const processMemory = process.memoryUsage()
  console.log(colorize('\nNode.js 进程：', 'yellow'))
  console.log(`  RSS: ${formatBytes(processMemory.rss)}`)
  console.log(`  Heap 总量: ${formatBytes(processMemory.heapTotal)}`)
  console.log(`  Heap 使用: ${formatBytes(processMemory.heapUsed)}`)
  console.log(`  外部内存: ${formatBytes(processMemory.external)}`)
}

// 数据库统计
async function databaseStats() {
  console.log(colorize('\n💾 数据库统计', 'cyan'))
  console.log(colorize('─'.repeat(80), 'gray'))

  const [userCount, generationCount, orderCount, codeCount, logCount] = await Promise.all([
    prisma.user.count(),
    prisma.generation.count(),
    prisma.order.count(),
    prisma.redemptionCode.count(),
    prisma.log.count(),
  ])

  console.log(colorize('\n数据量统计：', 'yellow'))
  console.log(`  用户: ${userCount.toLocaleString()}`)
  console.log(`  生成记录: ${generationCount.toLocaleString()}`)
  console.log(`  订单: ${orderCount.toLocaleString()}`)
  console.log(`  兑换码: ${codeCount.toLocaleString()}`)
  console.log(`  日志: ${logCount.toLocaleString()}`)

  // 今日统计
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [todayUsers, todayGenerations, todayOrders] = await Promise.all([
    prisma.user.count({ where: { createdAt: { gte: today } } }),
    prisma.generation.count({ where: { createdAt: { gte: today } } }),
    prisma.order.count({ where: { createdAt: { gte: today } } }),
  ])

  console.log(colorize('\n今日新增：', 'yellow'))
  console.log(`  新用户: ${todayUsers}`)
  console.log(`  生成记录: ${todayGenerations}`)
  console.log(`  订单: ${todayOrders}`)
}

// 性能指标
async function performanceMetrics() {
  console.log(colorize('\n⚡ 性能指标', 'cyan'))
  console.log(colorize('─'.repeat(80), 'gray'))

  // 测试数据库查询性能
  console.log(colorize('\n数据库查询性能：', 'yellow'))

  const tests = [
    {
      name: '简单查询 (findFirst)',
      fn: async () => {
        const start = Date.now()
        await prisma.user.findFirst()
        return Date.now() - start
      },
    },
    {
      name: '计数查询 (count)',
      fn: async () => {
        const start = Date.now()
        await prisma.user.count()
        return Date.now() - start
      },
    },
    {
      name: '复杂查询 (with include)',
      fn: async () => {
        const start = Date.now()
        await prisma.generation.findMany({
          take: 10,
          include: { user: true },
        })
        return Date.now() - start
      },
    },
    {
      name: '聚合查询 (groupBy)',
      fn: async () => {
        const start = Date.now()
        await prisma.generation.groupBy({
          by: ['contentType'],
          _count: true,
        })
        return Date.now() - start
      },
    },
  ]

  for (const test of tests) {
    const time = await test.fn()
    const color = time < 50 ? 'green' : time < 200 ? 'yellow' : 'red'
    console.log(`  ${test.name}: ${colorize(`${time}ms`, color)}`)
  }
}

// 热点数据分析
async function hotspotAnalysis() {
  console.log(colorize('\n🔥 热点数据分析', 'cyan'))
  console.log(colorize('─'.repeat(80), 'gray'))

  // 最活跃用户
  const topUsers = await prisma.user.findMany({
    orderBy: { totalUsage: 'desc' },
    take: 5,
    select: {
      phone: true,
      email: true,
      nickname: true,
      totalUsage: true,
      memberType: true,
    },
  })

  console.log(colorize('\n最活跃用户 (Top 5)：', 'yellow'))
  topUsers.forEach((user, index) => {
    const identifier = user.phone || user.email || user.nickname || 'Unknown'
    console.log(`  ${index + 1}. ${identifier} - ${user.totalUsage} 次 (${user.memberType})`)
  })

  // 热门内容类型
  const contentTypes = await prisma.generation.groupBy({
    by: ['contentType'],
    _count: true,
    orderBy: { _count: { contentType: 'desc' } },
  })

  console.log(colorize('\n热门内容类型：', 'yellow'))
  contentTypes.forEach((item) => {
    console.log(`  ${item.contentType}: ${item._count} 次`)
  })

  // 热门分类
  const categories = await prisma.generation.groupBy({
    by: ['category'],
    _count: true,
    orderBy: { _count: { category: 'desc' } },
    take: 5,
  })

  console.log(colorize('\n热门分类 (Top 5)：', 'yellow'))
  categories.forEach((item) => {
    console.log(`  ${item.category}: ${item._count} 次`)
  })

  // AI 提供商使用情况
  const aiProviders = await prisma.generation.groupBy({
    by: ['aiProvider'],
    _count: true,
  })

  console.log(colorize('\nAI 提供商使用情况：', 'yellow'))
  aiProviders.forEach((item) => {
    console.log(`  ${item.aiProvider}: ${item._count} 次`)
  })
}

// 收入分析
async function revenueAnalysis() {
  console.log(colorize('\n💰 收入分析', 'cyan'))
  console.log(colorize('─'.repeat(80), 'gray'))

  // 总收入
  const orders = await prisma.order.findMany({
    where: { status: 'PAID' },
  })

  const totalRevenue = orders.reduce((sum, order) => sum + order.amount, 0)

  console.log(colorize('\n总收入统计：', 'yellow'))
  console.log(`  总订单数: ${orders.length}`)
  console.log(`  总收入: ¥${(totalRevenue / 100).toFixed(2)}`)
  console.log(`  平均订单金额: ¥${(totalRevenue / orders.length / 100).toFixed(2)}`)

  // 按产品类型统计
  const byProduct = await prisma.order.groupBy({
    by: ['productType'],
    where: { status: 'PAID' },
    _count: true,
    _sum: { amount: true },
  })

  console.log(colorize('\n按产品类型统计：', 'yellow'))
  byProduct.forEach((item) => {
    const revenue = item._sum.amount || 0
    console.log(`  ${item.productType}: ${item._count} 单，¥${(revenue / 100).toFixed(2)}`)
  })

  // 本月收入
  const thisMonth = new Date()
  thisMonth.setDate(1)
  thisMonth.setHours(0, 0, 0, 0)

  const monthlyOrders = await prisma.order.findMany({
    where: {
      status: 'PAID',
      paidAt: { gte: thisMonth },
    },
  })

  const monthlyRevenue = monthlyOrders.reduce((sum, order) => sum + order.amount, 0)

  console.log(colorize('\n本月收入：', 'yellow'))
  console.log(`  订单数: ${monthlyOrders.length}`)
  console.log(`  收入: ¥${(monthlyRevenue / 100).toFixed(2)}`)
}

// 生成性能报告
async function generateReport() {
  console.log(colorize('\n📊 生成性能报告', 'cyan'))
  console.log(colorize('─'.repeat(80), 'gray'))

  const report = {
    generatedAt: new Date().toISOString(),
    system: {
      platform: os.platform(),
      arch: os.arch(),
      cpus: os.cpus().length,
      totalMemory: os.totalmem(),
      freeMemory: os.freemem(),
      uptime: os.uptime(),
    },
    database: {
      users: await prisma.user.count(),
      generations: await prisma.generation.count(),
      orders: await prisma.order.count(),
      redemptionCodes: await prisma.redemptionCode.count(),
      logs: await prisma.log.count(),
    },
    performance: {
      // 这里可以添加更多性能指标
    },
  }

  const dir = 'reports'
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
  const filename = path.join(dir, `performance-${timestamp}.json`)

  fs.writeFileSync(filename, JSON.stringify(report, null, 2))

  console.log(colorize(`✅ 性能报告已生成: ${filename}`, 'green'))
}

// 主函数
async function main() {
  console.log(colorize('\n╔════════════════════════════════════════╗', 'cyan'))
  console.log(colorize('║      ⚡ 性能监控工具                  ║', 'cyan'))
  console.log(colorize('╚════════════════════════════════════════╝', 'cyan'))

  try {
    await systemInfo()
    await databaseStats()
    await performanceMetrics()
    await hotspotAnalysis()
    await revenueAnalysis()
    await generateReport()

    console.log(colorize('\n✅ 性能监控完成', 'green'))
  } catch (error) {
    console.error(colorize(`\n❌ 错误: ${error}`, 'red'))
  } finally {
    await prisma.$disconnect()
  }
}

// 运行
main().catch((error) => {
  console.error(colorize(`\n❌ 致命错误: ${error}`, 'red'))
  process.exit(1)
})
