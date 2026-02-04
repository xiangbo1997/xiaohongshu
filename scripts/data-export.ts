#!/usr/bin/env tsx
/**
 * 数据导入导出工具
 *
 * 功能：
 * - 导出用户数据
 * - 导出生成记录
 * - 导出订单数据
 * - 导出兑换码
 * - 导入数据
 * - 数据备份和恢复
 */

import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'
import * as readline from 'readline'

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

// 创建输入接口
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, resolve)
  })
}

// 确保导出目录存在
function ensureExportDir() {
  const dir = 'exports'
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  return dir
}

// 生成文件名
function generateFilename(prefix: string, ext: string = 'json'): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
  return `${prefix}-${timestamp}.${ext}`
}

// 导出用户数据
async function exportUsers() {
  console.log(colorize('\n👥 导出用户数据', 'cyan'))
  console.log(colorize('─'.repeat(80), 'gray'))

  const memberTypeStr = await question('会员类型 (FREE/VIP，留空导出全部): ')
  const memberType = memberTypeStr.trim() || undefined

  const users = await prisma.user.findMany({
    where: {
      ...(memberType && { memberType }),
    },
    select: {
      id: true,
      phone: true,
      email: true,
      nickname: true,
      memberType: true,
      memberExpire: true,
      points: true,
      dailyFreeUsed: true,
      dailyFreeLimit: true,
      totalUsage: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  const dir = ensureExportDir()
  const filename = path.join(dir, generateFilename('users'))

  fs.writeFileSync(filename, JSON.stringify(users, null, 2))

  console.log(colorize(`✅ 已导出 ${users.length} 个用户到 ${filename}`, 'green'))
}

// 导出生成记录
async function exportGenerations() {
  console.log(colorize('\n📝 导出生成记录', 'cyan'))
  console.log(colorize('─'.repeat(80), 'gray'))

  const startStr = await question('开始日期 (YYYY-MM-DD，留空导出全部): ')
  const endStr = await question('结束日期 (YYYY-MM-DD，留空导出全部): ')

  let startDate: Date | undefined
  let endDate: Date | undefined

  if (startStr.trim()) {
    startDate = new Date(startStr)
    if (isNaN(startDate.getTime())) {
      console.log(colorize('❌ 开始日期格式错误', 'red'))
      return
    }
  }

  if (endStr.trim()) {
    endDate = new Date(endStr)
    endDate.setHours(23, 59, 59, 999)
    if (isNaN(endDate.getTime())) {
      console.log(colorize('❌ 结束日期格式错误', 'red'))
      return
    }
  }

  const generations = await prisma.generation.findMany({
    where: {
      ...(startDate && endDate && {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      }),
    },
    include: {
      user: {
        select: {
          phone: true,
          email: true,
          nickname: true,
        },
      },
    },
  })

  const dir = ensureExportDir()
  const filename = path.join(dir, generateFilename('generations'))

  fs.writeFileSync(filename, JSON.stringify(generations, null, 2))

  console.log(colorize(`✅ 已导出 ${generations.length} 条生成记录到 ${filename}`, 'green'))
}

// 导出订单数据
async function exportOrders() {
  console.log(colorize('\n💰 导出订单数据', 'cyan'))
  console.log(colorize('─'.repeat(80), 'gray'))

  const statusStr = await question('订单状态 (PENDING/PAID/FAILED/REFUNDED，留空导出全部): ')
  const status = statusStr.trim() || undefined

  const orders = await prisma.order.findMany({
    where: {
      ...(status && { status }),
    },
    include: {
      user: {
        select: {
          phone: true,
          email: true,
          nickname: true,
        },
      },
    },
  })

  const dir = ensureExportDir()
  const filename = path.join(dir, generateFilename('orders'))

  fs.writeFileSync(filename, JSON.stringify(orders, null, 2))

  // 计算统计
  const totalAmount = orders.reduce((sum, order) => sum + order.amount, 0)
  const paidOrders = orders.filter((o) => o.status === 'PAID')
  const paidAmount = paidOrders.reduce((sum, order) => sum + order.amount, 0)

  console.log(colorize(`✅ 已导出 ${orders.length} 个订单到 ${filename}`, 'green'))
  console.log(colorize(`   总金额: ¥${(totalAmount / 100).toFixed(2)}`, 'yellow'))
  console.log(colorize(`   已支付: ${paidOrders.length} 个，¥${(paidAmount / 100).toFixed(2)}`, 'yellow'))
}

// 导出兑换码
async function exportRedemptionCodes() {
  console.log(colorize('\n🎫 导出兑换码', 'cyan'))
  console.log(colorize('─'.repeat(80), 'gray'))

  const statusStr = await question('状态 (ACTIVE/USED/EXPIRED，留空导出全部): ')
  const status = statusStr.trim() || undefined

  const codes = await prisma.redemptionCode.findMany({
    where: {
      ...(status && { status }),
    },
    select: {
      id: true,
      codeDisplay: true,
      codeCategory: true,
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

  const dir = ensureExportDir()
  const filename = path.join(dir, generateFilename('redemption-codes'))

  fs.writeFileSync(filename, JSON.stringify(codes, null, 2))

  console.log(colorize(`✅ 已导出 ${codes.length} 个兑换码到 ${filename}`, 'green'))
}

// 导出完整数据备份
async function exportFullBackup() {
  console.log(colorize('\n💾 导出完整数据备份', 'cyan'))
  console.log(colorize('─'.repeat(80), 'gray'))

  console.log(colorize('正在导出数据...', 'yellow'))

  const [users, generations, orders, codes, pointRecords] = await Promise.all([
    prisma.user.findMany(),
    prisma.generation.findMany(),
    prisma.order.findMany(),
    prisma.redemptionCode.findMany(),
    prisma.pointRecord.findMany(),
  ])

  const backup = {
    exportedAt: new Date().toISOString(),
    version: '1.0.0',
    data: {
      users,
      generations,
      orders,
      redemptionCodes: codes,
      pointRecords,
    },
    statistics: {
      users: users.length,
      generations: generations.length,
      orders: orders.length,
      redemptionCodes: codes.length,
      pointRecords: pointRecords.length,
    },
  }

  const dir = ensureExportDir()
  const filename = path.join(dir, generateFilename('full-backup'))

  fs.writeFileSync(filename, JSON.stringify(backup, null, 2))

  console.log(colorize(`✅ 完整备份已导出到 ${filename}`, 'green'))
  console.log(colorize('\n备份内容：', 'yellow'))
  console.log(`  用户: ${users.length}`)
  console.log(`  生成记录: ${generations.length}`)
  console.log(`  订单: ${orders.length}`)
  console.log(`  兑换码: ${codes.length}`)
  console.log(`  点数记录: ${pointRecords.length}`)
}

// 导出为 CSV
async function exportToCSV() {
  console.log(colorize('\n📊 导出为 CSV', 'cyan'))
  console.log(colorize('─'.repeat(80), 'gray'))

  console.log('请选择导出类型：')
  console.log('  1. 用户列表')
  console.log('  2. 生成记录')
  console.log('  3. 订单列表')

  const choice = await question('请选择: ')

  const dir = ensureExportDir()

  switch (choice.trim()) {
    case '1': {
      const users = await prisma.user.findMany()
      const csv = [
        'ID,手机号,邮箱,昵称,会员类型,会员到期,点数,总使用次数,注册时间',
        ...users.map((u) =>
          [
            u.id,
            u.phone || '',
            u.email || '',
            u.nickname || '',
            u.memberType,
            u.memberExpire?.toISOString() || '',
            u.points,
            u.totalUsage,
            u.createdAt.toISOString(),
          ].join(',')
        ),
      ].join('\n')

      const filename = path.join(dir, generateFilename('users', 'csv'))
      fs.writeFileSync(filename, '\uFEFF' + csv) // 添加 BOM 以支持 Excel 中文
      console.log(colorize(`✅ 已导出 ${users.length} 个用户到 ${filename}`, 'green'))
      break
    }

    case '2': {
      const generations = await prisma.generation.findMany({
        include: {
          user: {
            select: { phone: true, nickname: true },
          },
        },
      })

      const csv = [
        'ID,用户手机号,用户昵称,内容类型,分类,主题,AI提供商,创建时间',
        ...generations.map((g) =>
          [
            g.id,
            g.user.phone || '',
            g.user.nickname || '',
            g.contentType,
            g.category,
            g.topic,
            g.aiProvider,
            g.createdAt.toISOString(),
          ].join(',')
        ),
      ].join('\n')

      const filename = path.join(dir, generateFilename('generations', 'csv'))
      fs.writeFileSync(filename, '\uFEFF' + csv)
      console.log(colorize(`✅ 已导出 ${generations.length} 条生成记录到 ${filename}`, 'green'))
      break
    }

    case '3': {
      const orders = await prisma.order.findMany({
        include: {
          user: {
            select: { phone: true, nickname: true },
          },
        },
      })

      const csv = [
        'ID,订单号,用户手机号,用户昵称,产品类型,产品名称,金额,状态,创建时间,支付时间',
        ...orders.map((o) =>
          [
            o.id,
            o.orderNo,
            o.user.phone || '',
            o.user.nickname || '',
            o.productType,
            o.productName,
            (o.amount / 100).toFixed(2),
            o.status,
            o.createdAt.toISOString(),
            o.paidAt?.toISOString() || '',
          ].join(',')
        ),
      ].join('\n')

      const filename = path.join(dir, generateFilename('orders', 'csv'))
      fs.writeFileSync(filename, '\uFEFF' + csv)
      console.log(colorize(`✅ 已导出 ${orders.length} 个订单到 ${filename}`, 'green'))
      break
    }

    default:
      console.log(colorize('❌ 无效选项', 'red'))
  }
}

// 列出导出文件
async function listExports() {
  console.log(colorize('\n📂 导出文件列表', 'cyan'))
  console.log(colorize('─'.repeat(80), 'gray'))

  const dir = 'exports'
  if (!fs.existsSync(dir)) {
    console.log(colorize('暂无导出文件', 'yellow'))
    return
  }

  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json') || f.endsWith('.csv'))

  if (files.length === 0) {
    console.log(colorize('暂无导出文件', 'yellow'))
    return
  }

  console.log(colorize(`\n找到 ${files.length} 个导出文件：\n`, 'green'))

  files.forEach((file, index) => {
    const filepath = path.join(dir, file)
    const stats = fs.statSync(filepath)
    const size = (stats.size / 1024).toFixed(2)
    const time = stats.mtime.toLocaleString('zh-CN')

    console.log(`${colorize((index + 1).toString().padStart(3), 'gray')}. ${colorize(file, 'cyan')}`)
    console.log(`     大小: ${size} KB  |  修改时间: ${time}`)
  })
}

// 清理导出文件
async function cleanExports() {
  console.log(colorize('\n🗑️  清理导出文件', 'cyan'))
  console.log(colorize('─'.repeat(80), 'gray'))

  const dir = 'exports'
  if (!fs.existsSync(dir)) {
    console.log(colorize('暂无导出文件', 'yellow'))
    return
  }

  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json') || f.endsWith('.csv'))

  if (files.length === 0) {
    console.log(colorize('暂无导出文件', 'yellow'))
    return
  }

  console.log(colorize(`找到 ${files.length} 个导出文件`, 'yellow'))

  const confirm = await question('确认删除所有导出文件？(y/N): ')

  if (confirm.toLowerCase() !== 'y') {
    console.log(colorize('❌ 已取消', 'yellow'))
    return
  }

  let deleted = 0
  files.forEach((file) => {
    fs.unlinkSync(path.join(dir, file))
    deleted++
  })

  console.log(colorize(`✅ 已删除 ${deleted} 个文件`, 'green'))
}

// 主菜单
async function main() {
  console.log(colorize('\n╔════════════════════════════════════════╗', 'cyan'))
  console.log(colorize('║      💾 数据导入导出工具              ║', 'cyan'))
  console.log(colorize('╚════════════════════════════════════════╝', 'cyan'))

  while (true) {
    console.log(colorize('\n请选择操作：', 'yellow'))
    console.log('  1. 导出用户数据')
    console.log('  2. 导出生成记录')
    console.log('  3. 导出订单数据')
    console.log('  4. 导出兑换码')
    console.log('  5. 导出完整备份')
    console.log('  6. 导出为 CSV')
    console.log('  7. 列出导出文件')
    console.log('  8. 清理导出文件')
    console.log('  0. 退出')

    const choice = await question(colorize('\n请输入选项: ', 'cyan'))

    try {
      switch (choice.trim()) {
        case '1':
          await exportUsers()
          break
        case '2':
          await exportGenerations()
          break
        case '3':
          await exportOrders()
          break
        case '4':
          await exportRedemptionCodes()
          break
        case '5':
          await exportFullBackup()
          break
        case '6':
          await exportToCSV()
          break
        case '7':
          await listExports()
          break
        case '8':
          await cleanExports()
          break
        case '0':
          console.log(colorize('\n👋 再见！', 'green'))
          rl.close()
          await prisma.$disconnect()
          process.exit(0)
        default:
          console.log(colorize('❌ 无效选项', 'red'))
      }
    } catch (error) {
      console.error(colorize(`\n❌ 错误: ${error}`, 'red'))
    }
  }
}

// 运行
main().catch((error) => {
  console.error(colorize(`\n❌ 致命错误: ${error}`, 'red'))
  process.exit(1)
})
