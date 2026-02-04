/**
 * 支付模块单元测试
 * 测试 src/lib/payment.ts 中的核心功能
 */

import { describe, it, expect } from 'vitest'
import {
  generateOrderNo,
  calculateVipExpireDate,
  getProductPrice,
  getProductName,
  isVipProduct,
  isPointsProduct,
  VIP_PRICES,
  POINTS_PRICES,
  VIP_DURATION,
  POINTS_AMOUNT,
} from '@/lib/payment'

describe('支付模块 - 订单号生成', () => {
  it('应该生成格式正确的订单号', () => {
    const orderNo = generateOrderNo()

    expect(orderNo).toBeTruthy()
    expect(orderNo).toMatch(/^XHS\d{14}[A-Z0-9]{6}$/)
    // 格式：XHS + 14位时间戳 + 6位随机字符
  })

  it('应该生成唯一的订单号', () => {
    const orderNos = new Set()
    for (let i = 0; i < 100; i++) {
      orderNos.add(generateOrderNo())
    }

    // 100 个订单号应该都是唯一的
    expect(orderNos.size).toBe(100)
  })

  it('订单号应该以 XHS 开头', () => {
    const orderNo = generateOrderNo()
    expect(orderNo.startsWith('XHS')).toBe(true)
  })

  it('订单号应该包含时间信息', () => {
    const orderNo = generateOrderNo()
    const timestamp = orderNo.substring(3, 17) // 提取时间戳部分

    // 验证时间戳格式（YYYYMMDDHHMMSS）
    expect(timestamp).toMatch(/^\d{14}$/)

    // 验证年份合理性
    const year = parseInt(timestamp.substring(0, 4))
    expect(year).toBeGreaterThanOrEqual(2024)
    expect(year).toBeLessThanOrEqual(2030)
  })
})

describe('支付模块 - VIP 到期时间计算', () => {
  it('应该正确计算新 VIP 的到期时间', () => {
    const days = 7
    const expireDate = calculateVipExpireDate(days)

    const now = new Date()
    const expected = new Date(now)
    expected.setDate(expected.getDate() + days)

    // 允许 1 秒的误差
    const diff = Math.abs(expireDate.getTime() - expected.getTime())
    expect(diff).toBeLessThan(1000)
  })

  it('应该从当前到期时间延长（未过期）', () => {
    const days = 7
    const currentExpire = new Date()
    currentExpire.setDate(currentExpire.getDate() + 3) // 3 天后过期

    const expireDate = calculateVipExpireDate(days, currentExpire)

    const expected = new Date(currentExpire)
    expected.setDate(expected.getDate() + days)

    const diff = Math.abs(expireDate.getTime() - expected.getTime())
    expect(diff).toBeLessThan(1000)
  })

  it('应该从当前时间计算（已过期）', () => {
    const days = 7
    const currentExpire = new Date()
    currentExpire.setDate(currentExpire.getDate() - 1) // 已过期

    const expireDate = calculateVipExpireDate(days, currentExpire)

    const now = new Date()
    const expected = new Date(now)
    expected.setDate(expected.getDate() + days)

    const diff = Math.abs(expireDate.getTime() - expected.getTime())
    expect(diff).toBeLessThan(1000)
  })

  it('应该处理 null 的当前到期时间', () => {
    const days = 7
    const expireDate = calculateVipExpireDate(days, null)

    const now = new Date()
    const expected = new Date(now)
    expected.setDate(expected.getDate() + days)

    const diff = Math.abs(expireDate.getTime() - expected.getTime())
    expect(diff).toBeLessThan(1000)
  })
})

describe('支付模块 - 产品配置', () => {
  it('应该有正确的 VIP 价格配置', () => {
    expect(VIP_PRICES.VIP_1).toBe(199)
    expect(VIP_PRICES.VIP_3).toBe(499)
    expect(VIP_PRICES.VIP_7).toBe(999)
    expect(VIP_PRICES.VIP_30).toBe(2999)
  })

  it('应该有正确的点数价格配置', () => {
    expect(POINTS_PRICES.POINTS_10).toBe(99)
    expect(POINTS_PRICES.POINTS_50).toBe(399)
    expect(POINTS_PRICES.POINTS_100).toBe(699)
    expect(POINTS_PRICES.POINTS_500).toBe(2999)
  })

  it('应该有正确的 VIP 时长配置', () => {
    expect(VIP_DURATION.VIP_1).toBe(1)
    expect(VIP_DURATION.VIP_3).toBe(3)
    expect(VIP_DURATION.VIP_7).toBe(7)
    expect(VIP_DURATION.VIP_30).toBe(30)
  })

  it('应该有正确的点数数量配置', () => {
    expect(POINTS_AMOUNT.POINTS_10).toBe(10)
    expect(POINTS_AMOUNT.POINTS_50).toBe(50)
    expect(POINTS_AMOUNT.POINTS_100).toBe(100)
    expect(POINTS_AMOUNT.POINTS_500).toBe(500)
  })
})

describe('支付模块 - 产品信息获取', () => {
  it('应该正确获取 VIP 产品价格', () => {
    expect(getProductPrice('VIP_1')).toBe(199)
    expect(getProductPrice('VIP_30')).toBe(2999)
  })

  it('应该正确获取点数产品价格', () => {
    expect(getProductPrice('POINTS_10')).toBe(99)
    expect(getProductPrice('POINTS_500')).toBe(2999)
  })

  it('应该返回 0 对于未知产品', () => {
    expect(getProductPrice('UNKNOWN')).toBe(0)
  })

  it('应该正确获取产品名称', () => {
    expect(getProductName('VIP_1')).toBe('1天VIP会员')
    expect(getProductName('POINTS_10')).toBe('10点数')
  })

  it('应该返回默认名称对于未知产品', () => {
    expect(getProductName('UNKNOWN')).toBe('未知产品')
  })
})

describe('支付模块 - 产品类型判断', () => {
  it('应该正确识别 VIP 产品', () => {
    expect(isVipProduct('VIP_1')).toBe(true)
    expect(isVipProduct('VIP_30')).toBe(true)
    expect(isVipProduct('POINTS_10')).toBe(false)
  })

  it('应该正确识别点数产品', () => {
    expect(isPointsProduct('POINTS_10')).toBe(true)
    expect(isPointsProduct('POINTS_500')).toBe(true)
    expect(isPointsProduct('VIP_1')).toBe(false)
  })

  it('应该拒绝未知产品类型', () => {
    expect(isVipProduct('UNKNOWN')).toBe(false)
    expect(isPointsProduct('UNKNOWN')).toBe(false)
  })
})

describe('支付模块 - 价格合理性', () => {
  it('VIP 套餐应该有合理的价格梯度', () => {
    expect(VIP_PRICES.VIP_1).toBeLessThan(VIP_PRICES.VIP_3)
    expect(VIP_PRICES.VIP_3).toBeLessThan(VIP_PRICES.VIP_7)
    expect(VIP_PRICES.VIP_7).toBeLessThan(VIP_PRICES.VIP_30)
  })

  it('点数卡应该有合理的价格梯度', () => {
    expect(POINTS_PRICES.POINTS_10).toBeLessThan(POINTS_PRICES.POINTS_50)
    expect(POINTS_PRICES.POINTS_50).toBeLessThan(POINTS_PRICES.POINTS_100)
    expect(POINTS_PRICES.POINTS_100).toBeLessThan(POINTS_PRICES.POINTS_500)
  })

  it('大额套餐应该有更优惠的单价', () => {
    const price10 = POINTS_PRICES.POINTS_10 / POINTS_AMOUNT.POINTS_10
    const price500 = POINTS_PRICES.POINTS_500 / POINTS_AMOUNT.POINTS_500

    expect(price500).toBeLessThan(price10)
  })
})
