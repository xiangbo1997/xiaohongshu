// 日志存储工具
// 使用数据库存储

import { prisma } from '@/lib/db'

export interface LogEntry {
  id: string
  createdAt: Date
  level: 'info' | 'warn' | 'error'
  type: 'generate' | 'auth' | 'payment' | 'system'
  message: string
  details?: string | null
}

export async function addLog(
  level: LogEntry['level'],
  type: LogEntry['type'],
  message: string,
  details?: unknown
): Promise<void> {
  try {
    await prisma.log.create({
      data: {
        level,
        type,
        message,
        details: details ? (typeof details === 'string' ? details : JSON.stringify(details, null, 2)) : null,
      },
    })

    // 同时输出到控制台
    const consoleMethod = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log
    consoleMethod(`[${type.toUpperCase()}] ${message}`, details || '')
  } catch (error) {
    // 如果数据库写入失败，至少输出到控制台
    console.error('Failed to write log to database:', error)
    console.log(`[${type.toUpperCase()}] ${message}`, details || '')
  }
}

export async function getLogs(options?: {
  type?: LogEntry['type']
  level?: LogEntry['level']
  limit?: number
}): Promise<LogEntry[]> {
  const where: { type?: string; level?: string } = {}

  if (options?.type) {
    where.type = options.type
  }

  if (options?.level) {
    where.level = options.level
  }

  const logs = await prisma.log.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: options?.limit || 100,
  })

  return logs as LogEntry[]
}

export async function clearLogs(): Promise<void> {
  await prisma.log.deleteMany()
}

// 便捷方法
export const logger = {
  info: (type: LogEntry['type'], message: string, details?: unknown) => addLog('info', type, message, details),
  warn: (type: LogEntry['type'], message: string, details?: unknown) => addLog('warn', type, message, details),
  error: (type: LogEntry['type'], message: string, details?: unknown) => addLog('error', type, message, details),
}
