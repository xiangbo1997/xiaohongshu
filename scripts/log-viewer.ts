#!/usr/bin/env tsx
/**
 * 日志查看和分析工具
 *
 * 功能：
 * - 查看系统日志
 * - 按级别过滤
 * - 按类型过滤
 * - 按时间范围过滤
 * - 统计分析
 * - 导出日志
 */

import { PrismaClient } from '@prisma/client'
import * as readline from 'readline'

const prisma = new PrismaClient()

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
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

// 日志级别颜色映射
const levelColors: Record<string, keyof typeof colors> = {
  info: 'blue',
  warn: 'yellow',
  error: 'red',
}

// 格式化日志
function formatLog(log: any): string {
  const timestamp = new Date(log.createdAt).toLocaleString('zh-CN')
  const level = log.level.toUpperCase().padEnd(5)
  const type = log.type.padEnd(10)
  const color = levelColors[log.level] || 'reset'

  let output = `${colorize(timestamp, 'gray')} ${colorize(level, color)} ${colorize(type, 'cyan')} ${log.message}`

  if (log.details) {
    try {
      const details = JSON.parse(log.details)
      output += `\n${colorize('  Details:', 'gray')} ${JSON.stringify(details, null, 2)}`
    } catch {
      output += `\n${colorize('  Details:', 'gray')} ${log.details}`
    }
  }

  return output
}

// 查看最近日志
async function viewRecentLogs() {
  console.log(colorize('\n📋 最近日志', 'cyan'))
  console.log(colorize('─'.repeat(80), 'gray'))

  const limitStr = await question('显示条数 (默认 50): ')
  const limit = parseInt(limitStr) || 50

  const levelStr = await question('日志级别 (info/warn/error，留空显示全部): ')
  const level = levelStr.trim() || undefined

  const typeStr = await question('日志类型 (generate/auth/payment/system，留空显示全部): ')
  const type = typeStr.trim() || undefined

  const logs = await prisma.log.findMany({
    where: {
      ...(level && { level }),
      ...(type && { type }),
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })

  console.log(colorize(`\n找到 ${logs.length} 条日志：\n`, 'green'))

  logs.forEach((log) => {
    console.log(formatLog(log))
    console.log(colorize('─'.repeat(80), 'gray'))
  })
}

// 按时间范围查看日志
async function viewLogsByTimeRange() {
  console.log(colorize('\n📅 按时间范围查看日志', 'cyan'))
  console.log(colorize('─'.repeat(80), 'gray'))

  const startStr = await question('开始时间 (YYYY-MM-DD HH:mm:ss): ')
  const endStr = await question('结束时间 (YYYY-MM-DD HH:mm:ss): ')

  const startDate = new Date(startStr)
  const endDate = new Date(endStr)

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    console.log(colorize('❌ 时间格式错误', 'red'))
    return
  }

  const logs = await prisma.log.findMany({
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  console.log(colorize(`\n找到 ${logs.length} 条日志：\n`, 'green'))

  logs.forEach((log) => {
    console.log(formatLog(log))
    console.log(colorize('─'.repeat(80), 'gray'))
  })
}

// 日志统计
async function logStatistics() {
  console.log(colorize('\n📊 日志统计', 'cyan'))
  console.log(colorize('─'.repeat(80), 'gray'))

  // 按级别统计
  const byLevel = await prisma.log.groupBy({
    by: ['level'],
    _count: true,
  })

  console.log(colorize('\n按级别统计：', 'yellow'))
  byLevel.forEach((item) => {
    const color = levelColors[item.level] || 'reset'
    console.log(`  ${colorize(item.level.toUpperCase().padEnd(10), color)} ${item._count} 条`)
  })

  // 按类型统计
  const byType = await prisma.log.groupBy({
    by: ['type'],
    _count: true,
  })

  console.log(colorize('\n按类型统计：', 'yellow'))
  byType.forEach((item) => {
    console.log(`  ${colorize(item.type.padEnd(10), 'cyan')} ${item._count} 条`)
  })

  // 今日统计
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const todayCount = await prisma.log.count({
    where: {
      createdAt: { gte: today },
    },
  })

  console.log(colorize(`\n今日日志：${todayCount} 条`, 'green'))

  // 最近错误
  const recentErrors = await prisma.log.count({
    where: {
      level: 'error',
      createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
  })

  console.log(colorize(`最近 24 小时错误：${recentErrors} 条`, recentErrors > 0 ? 'red' : 'green'))
}

// 搜索日志
async function searchLogs() {
  console.log(colorize('\n🔍 搜索日志', 'cyan'))
  console.log(colorize('─'.repeat(80), 'gray'))

  const keyword = await question('搜索关键词: ')

  if (!keyword.trim()) {
    console.log(colorize('❌ 请输入搜索关键词', 'red'))
    return
  }

  const logs = await prisma.log.findMany({
    where: {
      OR: [
        { message: { contains: keyword } },
        { details: { contains: keyword } },
      ],
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  console.log(colorize(`\n找到 ${logs.length} 条匹配的日志：\n`, 'green'))

  logs.forEach((log) => {
    console.log(formatLog(log))
    console.log(colorize('─'.repeat(80), 'gray'))
  })
}

// 清理旧日志
async function cleanOldLogs() {
  console.log(colorize('\n🗑️  清理旧日志', 'cyan'))
  console.log(colorize('─'.repeat(80), 'gray'))

  const daysStr = await question('保留最近多少天的日志 (默认 30): ')
  const days = parseInt(daysStr) || 30

  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - days)

  const count = await prisma.log.count({
    where: {
      createdAt: { lt: cutoffDate },
    },
  })

  if (count === 0) {
    console.log(colorize('✅ 没有需要清理的日志', 'green'))
    return
  }

  const confirm = await question(`将删除 ${count} 条日志，确认？(y/N): `)

  if (confirm.toLowerCase() !== 'y') {
    console.log(colorize('❌ 已取消', 'yellow'))
    return
  }

  const result = await prisma.log.deleteMany({
    where: {
      createdAt: { lt: cutoffDate },
    },
  })

  console.log(colorize(`✅ 已删除 ${result.count} 条日志`, 'green'))
}

// 导出日志
async function exportLogs() {
  console.log(colorize('\n💾 导出日志', 'cyan'))
  console.log(colorize('─'.repeat(80), 'gray'))

  const levelStr = await question('日志级别 (info/warn/error，留空导出全部): ')
  const level = levelStr.trim() || undefined

  const typeStr = await question('日志类型 (generate/auth/payment/system，留空导出全部): ')
  const type = typeStr.trim() || undefined

  const logs = await prisma.log.findMany({
    where: {
      ...(level && { level }),
      ...(type && { type }),
    },
    orderBy: { createdAt: 'desc' },
  })

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
  const filename = `logs/export-${timestamp}.json`

  const fs = await import('fs')
  const path = await import('path')

  // 确保目录存在
  const dir = path.dirname(filename)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }

  fs.writeFileSync(filename, JSON.stringify(logs, null, 2))

  console.log(colorize(`✅ 已导出 ${logs.length} 条日志到 ${filename}`, 'green'))
}

// 实时监控日志
async function monitorLogs() {
  console.log(colorize('\n👁️  实时监控日志 (Ctrl+C 退出)', 'cyan'))
  console.log(colorize('─'.repeat(80), 'gray'))

  let lastId = (await prisma.log.findFirst({
    orderBy: { id: 'desc' },
    select: { id: true },
  }))?.id || ''

  console.log(colorize('开始监控...\n', 'green'))

  const interval = setInterval(async () => {
    const newLogs = await prisma.log.findMany({
      where: {
        id: { gt: lastId },
      },
      orderBy: { createdAt: 'asc' },
    })

    if (newLogs.length > 0) {
      newLogs.forEach((log) => {
        console.log(formatLog(log))
        console.log(colorize('─'.repeat(80), 'gray'))
      })

      lastId = newLogs[newLogs.length - 1].id
    }
  }, 1000)

  // 监听 Ctrl+C
  process.on('SIGINT', () => {
    clearInterval(interval)
    console.log(colorize('\n\n✅ 已停止监控', 'green'))
    process.exit(0)
  })
}

// 主菜单
async function main() {
  console.log(colorize('\n╔════════════════════════════════════════╗', 'cyan'))
  console.log(colorize('║      📋 日志查看和分析工具            ║', 'cyan'))
  console.log(colorize('╚════════════════════════════════════════╝', 'cyan'))

  while (true) {
    console.log(colorize('\n请选择操作：', 'yellow'))
    console.log('  1. 查看最近日志')
    console.log('  2. 按时间范围查看')
    console.log('  3. 日志统计')
    console.log('  4. 搜索日志')
    console.log('  5. 清理旧日志')
    console.log('  6. 导出日志')
    console.log('  7. 实时监控')
    console.log('  0. 退出')

    const choice = await question(colorize('\n请输入选项: ', 'cyan'))

    try {
      switch (choice.trim()) {
        case '1':
          await viewRecentLogs()
          break
        case '2':
          await viewLogsByTimeRange()
          break
        case '3':
          await logStatistics()
          break
        case '4':
          await searchLogs()
          break
        case '5':
          await cleanOldLogs()
          break
        case '6':
          await exportLogs()
          break
        case '7':
          await monitorLogs()
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
