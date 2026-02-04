/**
 * 测试环境设置
 * 在所有测试运行前执行
 */

import { beforeAll, afterAll, afterEach } from 'vitest'
import { prisma } from '@/lib/db'

// 设置测试环境变量
process.env.NODE_ENV = 'test'
process.env.JWT_SECRET = 'test-jwt-secret'
process.env.ENCRYPTION_SECRET = 'test-encryption-secret'

// 全局测试钩子
beforeAll(async () => {
  // 测试开始前的初始化
  console.log('🧪 测试环境初始化...')
})

afterEach(async () => {
  // 每个测试后清理数据库（可选）
  // 注意：这会删除所有测试数据，谨慎使用
  // await prisma.user.deleteMany()
  // await prisma.generation.deleteMany()
  // await prisma.order.deleteMany()
})

afterAll(async () => {
  // 测试结束后断开数据库连接
  await prisma.$disconnect()
  console.log('✅ 测试环境清理完成')
})
