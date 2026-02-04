/**
 * 测试辅助工具
 * 提供测试中常用的 Mock 数据和工具函数
 */

import type { UserSession } from '@/types'

/**
 * 创建测试用户会话
 */
export function createMockUserSession(overrides?: Partial<UserSession>): UserSession {
  return {
    id: 'test-user-id',
    phone: '13800138000',
    email: 'test@example.com',
    nickname: '测试用户',
    memberType: 'FREE',
    points: 0,
    dailyFreeUsed: 0,
    dailyFreeLimit: 3,
    isVip: false,
    ...overrides,
  }
}

/**
 * 创建 VIP 用户会话
 */
export function createMockVipUser(overrides?: Partial<UserSession>): UserSession {
  const futureDate = new Date()
  futureDate.setDate(futureDate.getDate() + 30)

  return createMockUserSession({
    memberType: 'VIP',
    memberExpire: futureDate,
    dailyFreeLimit: 13,
    isVip: true,
    ...overrides,
  })
}

/**
 * 创建测试订单数据
 */
export function createMockOrder(overrides?: any) {
  return {
    id: 'test-order-id',
    orderNo: 'XHS20240108120000ABC123',
    userId: 'test-user-id',
    productType: 'VIP_7',
    productName: '7天VIP会员',
    quantity: 1,
    amount: 999,
    status: 'PENDING',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

/**
 * 创建测试生成记录
 */
export function createMockGeneration(overrides?: any) {
  return {
    id: 'test-generation-id',
    userId: 'test-user-id',
    contentType: 'note',
    category: 'beauty',
    topic: '夏日防晒推荐',
    keywords: '防晒霜,SPF50',
    style: 'lively',
    aiProvider: 'anthropic',
    title: '🌞 夏日防晒必备！这些防晒霜真的好用',
    content: '姐妹们，夏天到了，防晒一定要做好...',
    tags: ['防晒', '护肤', '夏日必备'],
    coverText: '防晒做得好，皮肤不会老',
    createdAt: new Date(),
    ...overrides,
  }
}

/**
 * 创建测试兑换码
 */
export function createMockRedemptionCode(overrides?: any) {
  return {
    id: 'test-code-id',
    code: 'encrypted-code',
    codeDisplay: 'AAAA-BBBB-CCCC-DDDD-EEEEE-FFFFF',
    codeCategory: 'VIP',
    rewardType: 'VIP_7',
    rewardValue: 7,
    status: 'ACTIVE',
    maxUses: 1,
    usedCount: 0,
    expireAt: null,
    note: '测试兑换码',
    createdAt: new Date(),
    ...overrides,
  }
}

/**
 * 延迟函数（用于测试异步操作）
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * 生成随机字符串
 */
export function randomString(length: number = 10): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

/**
 * 生成随机手机号
 */
export function randomPhone(): string {
  const prefixes = ['138', '139', '150', '151', '188', '189']
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)]
  const suffix = Math.floor(Math.random() * 100000000).toString().padStart(8, '0')
  return prefix + suffix
}

/**
 * 生成随机邮箱
 */
export function randomEmail(): string {
  return `test${randomString(8)}@example.com`
}

/**
 * Mock Prisma 事务
 */
export function mockPrismaTransaction<T>(callback: (tx: any) => Promise<T>): Promise<T> {
  // 简单的 mock，实际测试中可能需要更复杂的实现
  return callback({
    user: {
      update: vi.fn(),
      findUnique: vi.fn(),
    },
    pointRecord: {
      create: vi.fn(),
    },
    order: {
      update: vi.fn(),
    },
  })
}
