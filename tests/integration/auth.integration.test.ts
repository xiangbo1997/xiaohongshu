/**
 * 认证 API 集成测试
 * 测试完整的 HTTP 请求响应流程
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { prisma } from '@/lib/db'

// 测试基础 URL
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000'

// 测试用户数据
const testUser = {
  phone: '13800138000',
  email: 'test@example.com',
  password: 'test123456',
  nickname: '测试用户',
}

describe('认证 API 集成测试', () => {
  let authToken: string
  let userId: string

  // 测试前清理数据
  beforeAll(async () => {
    await prisma.user.deleteMany({
      where: {
        OR: [
          { phone: testUser.phone },
          { email: testUser.email },
        ],
      },
    })
  })

  // 测试后清理数据
  afterAll(async () => {
    if (userId) {
      await prisma.user.delete({ where: { id: userId } })
    }
  })

  describe('POST /api/auth/register - 用户注册', () => {
    it('应该成功注册新用户（手机号）', async () => {
      const response = await fetch(`${BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: testUser.phone,
          password: testUser.password,
          nickname: testUser.nickname,
        }),
      })

      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.user).toBeDefined()
      expect(data.data.user.phone).toBe(testUser.phone)
      expect(data.data.user.nickname).toBe(testUser.nickname)
      expect(data.data.user.memberType).toBe('FREE')
      expect(data.data.user.points).toBe(0)
      expect(data.data.token).toBeDefined()

      // 保存用户 ID 和 Token
      userId = data.data.user.id
      authToken = data.data.token
    })

    it('应该拒绝重复的手机号', async () => {
      const response = await fetch(`${BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: testUser.phone,
          password: testUser.password,
        }),
      })

      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('已存在')
    })

    it('应该拒绝无效的手机号', async () => {
      const response = await fetch(`${BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: '12345678901', // 无效手机号
          password: testUser.password,
        }),
      })

      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
    })

    it('应该拒绝过短的密码', async () => {
      const response = await fetch(`${BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: '13900139000',
          password: '123', // 过短
        }),
      })

      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('密码')
    })
  })

  describe('POST /api/auth/login - 用户登录', () => {
    it('应该成功登录（手机号）', async () => {
      const response = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: testUser.phone,
          password: testUser.password,
        }),
      })

      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.user).toBeDefined()
      expect(data.data.user.phone).toBe(testUser.phone)
      expect(data.data.token).toBeDefined()

      // 更新 Token
      authToken = data.data.token
    })

    it('应该拒绝错误的密码', async () => {
      const response = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: testUser.phone,
          password: 'wrongpassword',
        }),
      })

      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error).toContain('密码')
    })

    it('应该拒绝不存在的用户', async () => {
      const response = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: '13999999999',
          password: testUser.password,
        }),
      })

      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error).toContain('不存在')
    })
  })

  describe('GET /api/user - 获取当前用户', () => {
    it('应该返回当前用户信息', async () => {
      const response = await fetch(`${BASE_URL}/api/user`, {
        headers: {
          'Cookie': `token=${authToken}`,
        },
      })

      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.id).toBe(userId)
      expect(data.data.phone).toBe(testUser.phone)
      expect(data.data.memberType).toBe('FREE')
    })

    it('应该拒绝未认证的请求', async () => {
      const response = await fetch(`${BASE_URL}/api/user`)

      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error).toContain('登录')
    })

    it('应该拒绝无效的 Token', async () => {
      const response = await fetch(`${BASE_URL}/api/user`, {
        headers: {
          'Cookie': 'token=invalid-token',
        },
      })

      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
    })
  })

  describe('POST /api/auth/logout - 用户登出', () => {
    it('应该成功登出', async () => {
      const response = await fetch(`${BASE_URL}/api/auth/logout`, {
        method: 'POST',
        headers: {
          'Cookie': `token=${authToken}`,
        },
      })

      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('登出后应该无法访问需要认证的接口', async () => {
      const response = await fetch(`${BASE_URL}/api/user`, {
        headers: {
          'Cookie': `token=${authToken}`,
        },
      })

      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
    })
  })
})
