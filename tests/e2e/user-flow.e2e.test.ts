/**
 * 用户完整流程 E2E 测试
 * 测试从注册到生成文案的完整用户旅程
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { prisma } from '@/lib/db'

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000'

describe('用户完整流程 E2E 测试', () => {
  const testUser = {
    phone: `139${Date.now().toString().slice(-8)}`, // 动态生成手机号
    password: 'test123456',
    nickname: 'E2E测试用户',
  }

  let authToken: string
  let userId: string
  let generationId: string

  afterAll(async () => {
    // 清理测试数据
    if (userId) {
      await prisma.generation.deleteMany({ where: { userId } })
      await prisma.user.delete({ where: { id: userId } })
    }
  })

  it('步骤 1: 用户注册', async () => {
    const response = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser),
    })

    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.user.phone).toBe(testUser.phone)
    expect(data.data.user.memberType).toBe('FREE')
    expect(data.data.user.dailyFreeLimit).toBe(3)
    expect(data.data.user.points).toBe(0)

    userId = data.data.user.id
    authToken = data.data.token
  })

  it('步骤 2: 查看用户信息', async () => {
    const response = await fetch(`${BASE_URL}/api/user`, {
      headers: { 'Cookie': `token=${authToken}` },
    })

    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.id).toBe(userId)
    expect(data.data.dailyFreeUsed).toBe(0)
  })

  it('步骤 3: 生成第一篇文案（使用免费额度）', async () => {
    const response = await fetch(`${BASE_URL}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `token=${authToken}`,
      },
      body: JSON.stringify({
        contentType: 'note',
        category: 'beauty',
        topic: '夏日防晒推荐',
        keywords: '防晒霜,SPF50',
        style: 'lively',
        aiProvider: 'anthropic',
        count: 1,
      }),
    })

    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.generations).toHaveLength(1)
    expect(data.data.generations[0].title).toBeTruthy()
    expect(data.data.generations[0].content).toBeTruthy()
    expect(data.data.generations[0].tags).toBeInstanceOf(Array)
    expect(data.data.pointsUsed).toBe(1)
    expect(data.data.remainingPoints).toBe(2) // 3 - 1 = 2

    generationId = data.data.generations[0].id
  })

  it('步骤 4: 查看生成历史', async () => {
    const response = await fetch(`${BASE_URL}/api/user/history?page=1&pageSize=10`, {
      headers: { 'Cookie': `token=${authToken}` },
    })

    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.items).toHaveLength(1)
    expect(data.data.items[0].id).toBe(generationId)
    expect(data.data.pagination.total).toBe(1)
  })

  it('步骤 5: 收藏文案', async () => {
    const response = await fetch(`${BASE_URL}/api/user/favorites`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `token=${authToken}`,
      },
      body: JSON.stringify({
        generationId,
        action: 'add',
      }),
    })

    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.isFavorite).toBe(true)
  })

  it('步骤 6: 继续生成文案（消耗免费额度）', async () => {
    // 第二次生成
    const response1 = await fetch(`${BASE_URL}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `token=${authToken}`,
      },
      body: JSON.stringify({
        contentType: 'note',
        category: 'food',
        topic: '美食探店',
        style: 'lively',
        aiProvider: 'anthropic',
        count: 1,
      }),
    })

    const data1 = await response1.json()
    expect(data1.data.remainingPoints).toBe(1) // 2 - 1 = 1

    // 第三次生成
    const response2 = await fetch(`${BASE_URL}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `token=${authToken}`,
      },
      body: JSON.stringify({
        contentType: 'note',
        category: 'fashion',
        topic: '穿搭分享',
        style: 'lively',
        aiProvider: 'anthropic',
        count: 1,
      }),
    })

    const data2 = await response2.json()
    expect(data2.data.remainingPoints).toBe(0) // 1 - 1 = 0
  })

  it('步骤 7: 免费额度用完后应该无法生成', async () => {
    const response = await fetch(`${BASE_URL}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `token=${authToken}`,
      },
      body: JSON.stringify({
        contentType: 'note',
        category: 'beauty',
        topic: '测试',
        style: 'lively',
        aiProvider: 'anthropic',
        count: 1,
      }),
    })

    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.success).toBe(false)
    expect(data.error).toContain('点数不足')
  })

  it('步骤 8: 查看个人资料', async () => {
    const response = await fetch(`${BASE_URL}/api/user/profile`, {
      headers: { 'Cookie': `token=${authToken}` },
    })

    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.user.id).toBe(userId)
    expect(data.data.stats.totalGenerations).toBe(3)
    expect(data.data.stats.totalFavorites).toBe(1)
    expect(data.data.stats.availablePoints).toBe(0)
  })

  it('步骤 9: 取消收藏', async () => {
    const response = await fetch(`${BASE_URL}/api/user/favorites`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `token=${authToken}`,
      },
      body: JSON.stringify({
        generationId,
        action: 'remove',
      }),
    })

    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.isFavorite).toBe(false)
  })

  it('步骤 10: 用户登出', async () => {
    const response = await fetch(`${BASE_URL}/api/auth/logout`, {
      method: 'POST',
      headers: { 'Cookie': `token=${authToken}` },
    })

    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
  })
})

describe('VIP 用户流程 E2E 测试', () => {
  const vipUser = {
    phone: `138${Date.now().toString().slice(-8)}`,
    password: 'test123456',
    nickname: 'VIP测试用户',
  }

  let authToken: string
  let userId: string

  afterAll(async () => {
    if (userId) {
      await prisma.generation.deleteMany({ where: { userId } })
      await prisma.user.delete({ where: { id: userId } })
    }
  })

  it('步骤 1: 注册并升级为 VIP', async () => {
    // 注册
    const registerResponse = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(vipUser),
    })

    const registerData = await registerResponse.json()
    userId = registerData.data.user.id
    authToken = registerData.data.token

    // 手动升级为 VIP（模拟支付成功）
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 7)

    await prisma.user.update({
      where: { id: userId },
      data: {
        memberType: 'VIP',
        memberExpire: futureDate,
      },
    })
  })

  it('步骤 2: VIP 用户应该有更多免费额度', async () => {
    const response = await fetch(`${BASE_URL}/api/user`, {
      headers: { 'Cookie': `token=${authToken}` },
    })

    const data = await response.json()

    expect(data.data.memberType).toBe('VIP')
    expect(data.data.isVip).toBe(true)
    expect(data.data.dailyFreeLimit).toBe(13) // VIP 用户每日 13 次
  })

  it('步骤 3: VIP 用户可以生成多版本', async () => {
    const response = await fetch(`${BASE_URL}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `token=${authToken}`,
      },
      body: JSON.stringify({
        contentType: 'note',
        category: 'beauty',
        topic: 'VIP 测试',
        style: 'lively',
        aiProvider: 'anthropic',
        count: 3, // VIP 可以生成 3 个版本
      }),
    })

    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.generations).toHaveLength(3)
    expect(data.data.pointsUsed).toBe(3)
    expect(data.data.remainingPoints).toBe(10) // 13 - 3 = 10
  })
})
