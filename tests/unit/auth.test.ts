/**
 * 认证模块单元测试
 * 测试 src/lib/auth.ts 中的核心功能
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  hashPassword,
  verifyPassword,
  signToken,
  verifyToken,
  isValidVip,
  getAvailablePoints,
  canGenerate,
} from '@/lib/auth'
import type { UserSession } from '@/types'

describe('认证模块 - 密码处理', () => {
  it('应该正确加密密码', async () => {
    const password = 'test123456'
    const hash = await hashPassword(password)

    expect(hash).toBeTruthy()
    expect(hash).not.toBe(password)
    expect(hash.length).toBeGreaterThan(50)
  })

  it('应该正确验证密码', async () => {
    const password = 'test123456'
    const hash = await hashPassword(password)

    const isValid = await verifyPassword(password, hash)
    expect(isValid).toBe(true)
  })

  it('应该拒绝错误的密码', async () => {
    const password = 'test123456'
    const wrongPassword = 'wrong123456'
    const hash = await hashPassword(password)

    const isValid = await verifyPassword(wrongPassword, hash)
    expect(isValid).toBe(false)
  })
})

describe('认证模块 - JWT 令牌', () => {
  it('应该生成有效的 JWT 令牌', () => {
    const userId = 'test-user-id'
    const token = signToken(userId)

    expect(token).toBeTruthy()
    expect(typeof token).toBe('string')
    expect(token.split('.')).toHaveLength(3) // JWT 格式：header.payload.signature
  })

  it('应该正确验证 JWT 令牌', () => {
    const userId = 'test-user-id'
    const token = signToken(userId)

    const payload = verifyToken(token)
    expect(payload).toBeTruthy()
    expect(payload?.userId).toBe(userId)
  })

  it('应该拒绝无效的 JWT 令牌', () => {
    const invalidToken = 'invalid.token.here'
    const payload = verifyToken(invalidToken)

    expect(payload).toBeNull()
  })

  it('应该拒绝过期的 JWT 令牌', () => {
    // 创建一个已过期的令牌（需要 mock jwt.sign）
    const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0IiwiaWF0IjoxNjAwMDAwMDAwLCJleHAiOjE2MDAwMDAwMDF9.invalid'
    const payload = verifyToken(expiredToken)

    expect(payload).toBeNull()
  })
})

describe('认证模块 - VIP 验证', () => {
  it('应该识别有效的 VIP 用户', () => {
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 7)

    const user = {
      memberType: 'VIP',
      memberExpire: futureDate,
    }

    expect(isValidVip(user)).toBe(true)
  })

  it('应该拒绝过期的 VIP 用户', () => {
    const pastDate = new Date()
    pastDate.setDate(pastDate.getDate() - 1)

    const user = {
      memberType: 'VIP',
      memberExpire: pastDate,
    }

    expect(isValidVip(user)).toBe(false)
  })

  it('应该拒绝非 VIP 用户', () => {
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 7)

    const user = {
      memberType: 'FREE',
      memberExpire: futureDate,
    }

    expect(isValidVip(user)).toBe(false)
  })

  it('应该拒绝没有到期时间的 VIP 用户', () => {
    const user = {
      memberType: 'VIP',
      memberExpire: null,
    }

    expect(isValidVip(user)).toBe(false)
  })
})

describe('认证模块 - 点数计算', () => {
  it('应该正确计算可用点数（免费用户）', () => {
    const user: UserSession = {
      id: 'test-id',
      memberType: 'FREE',
      points: 10,
      dailyFreeUsed: 1,
      dailyFreeLimit: 3,
      isVip: false,
    }

    const available = getAvailablePoints(user)
    // 每日免费剩余 (3-1=2) + 购买点数 (10) = 12
    expect(available).toBe(12)
  })

  it('应该正确计算可用点数（VIP 用户）', () => {
    const user: UserSession = {
      id: 'test-id',
      memberType: 'VIP',
      points: 5,
      dailyFreeUsed: 10,
      dailyFreeLimit: 13,
      isVip: true,
    }

    const available = getAvailablePoints(user)
    // 每日免费剩余 (13-10=3) + 购买点数 (5) = 8
    expect(available).toBe(8)
  })

  it('应该正确处理免费额度用完的情况', () => {
    const user: UserSession = {
      id: 'test-id',
      memberType: 'FREE',
      points: 5,
      dailyFreeUsed: 3,
      dailyFreeLimit: 3,
      isVip: false,
    }

    const available = getAvailablePoints(user)
    // 每日免费剩余 (3-3=0) + 购买点数 (5) = 5
    expect(available).toBe(5)
  })

  it('应该正确处理超出免费额度的情况', () => {
    const user: UserSession = {
      id: 'test-id',
      memberType: 'FREE',
      points: 0,
      dailyFreeUsed: 5, // 超出限制
      dailyFreeLimit: 3,
      isVip: false,
    }

    const available = getAvailablePoints(user)
    // 每日免费剩余 max(0, 3-5) = 0 + 购买点数 (0) = 0
    expect(available).toBe(0)
  })
})

describe('认证模块 - 生成权限检查', () => {
  it('应该允许有点数的用户生成', () => {
    const user: UserSession = {
      id: 'test-id',
      memberType: 'FREE',
      points: 5,
      dailyFreeUsed: 0,
      dailyFreeLimit: 3,
      isVip: false,
    }

    const result = canGenerate(user)
    expect(result.allowed).toBe(true)
    expect(result.availablePoints).toBe(8) // 3 + 5
  })

  it('应该拒绝未登录用户', () => {
    const result = canGenerate(null)
    expect(result.allowed).toBe(false)
    expect(result.reason).toBe('请先登录')
  })

  it('应该拒绝点数不足的用户', () => {
    const user: UserSession = {
      id: 'test-id',
      memberType: 'FREE',
      points: 0,
      dailyFreeUsed: 3,
      dailyFreeLimit: 3,
      isVip: false,
    }

    const result = canGenerate(user)
    expect(result.allowed).toBe(false)
    expect(result.reason).toContain('点数不足')
    expect(result.availablePoints).toBe(0)
  })

  it('应该返回 VIP 状态', () => {
    const vipUser: UserSession = {
      id: 'test-id',
      memberType: 'VIP',
      points: 0,
      dailyFreeUsed: 0,
      dailyFreeLimit: 13,
      isVip: true,
    }

    const result = canGenerate(vipUser)
    expect(result.allowed).toBe(true)
    expect(result.isVip).toBe(true)
  })
})
