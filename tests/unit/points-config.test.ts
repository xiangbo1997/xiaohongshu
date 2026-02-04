/**
 * 点数配置模块单元测试
 * 测试 src/lib/points-config.ts 中的核心功能
 */

import { describe, it, expect } from 'vitest'
import {
  DAILY_FREE_POINTS,
  BASE_POINTS_PER_GENERATION,
  calculatePointsCost,
  getDailyFreePoints,
  getMaxVersionCount,
  canSelectModel,
  VIP_PRIVILEGES,
  FREE_USER_LIMITS,
} from '@/lib/points-config'

describe('点数配置模块 - 基础配置', () => {
  it('应该有正确的默认免费点数配置', () => {
    expect(DAILY_FREE_POINTS.FREE).toBe(3)
    expect(DAILY_FREE_POINTS.VIP).toBe(13)
  })

  it('应该有正确的基础点数消耗配置', () => {
    expect(BASE_POINTS_PER_GENERATION).toBe(1)
  })
})

describe('点数配置模块 - 点数计算', () => {
  it('应该正确计算单版本点数消耗', () => {
    const cost = calculatePointsCost(1)
    expect(cost).toBe(1)
  })

  it('应该正确计算多版本点数消耗', () => {
    const cost = calculatePointsCost(3)
    expect(cost).toBe(3)
  })

  it('应该支持自定义基础点数', () => {
    const cost = calculatePointsCost(2, 2)
    expect(cost).toBe(4) // 2 版本 * 2 点/版本
  })

  it('应该处理零版本情况', () => {
    const cost = calculatePointsCost(0)
    expect(cost).toBe(0)
  })
})

describe('点数配置模块 - 每日免费点数', () => {
  it('应该返回免费用户的每日免费点数', () => {
    const points = getDailyFreePoints(false)
    expect(points).toBe(DAILY_FREE_POINTS.FREE)
  })

  it('应该返回 VIP 用户的每日免费点数', () => {
    const points = getDailyFreePoints(true)
    expect(points).toBe(DAILY_FREE_POINTS.VIP)
  })

  it('应该支持自定义配置', () => {
    const customConfig = {
      dailyFreePoints: {
        free: 5,
        vip: 20,
      },
      generation: {
        basePointsPerVersion: 1,
      },
    }

    const freePoints = getDailyFreePoints(false, customConfig)
    const vipPoints = getDailyFreePoints(true, customConfig)

    expect(freePoints).toBe(5)
    expect(vipPoints).toBe(20)
  })
})

describe('点数配置模块 - VIP 特权', () => {
  it('应该有正确的 VIP 特权配置', () => {
    expect(VIP_PRIVILEGES.canSelectModel).toBe(true)
    expect(VIP_PRIVILEGES.canMultiVersion).toBe(true)
    expect(VIP_PRIVILEGES.maxVersionCount).toBe(3)
  })

  it('应该有正确的免费用户限制', () => {
    expect(FREE_USER_LIMITS.canSelectModel).toBe(false)
    expect(FREE_USER_LIMITS.canMultiVersion).toBe(false)
    expect(FREE_USER_LIMITS.maxVersionCount).toBe(1)
    expect(FREE_USER_LIMITS.defaultModel).toBe('claude')
  })

  it('VIP 用户应该可以选择 AI 模型', () => {
    expect(canSelectModel(true)).toBe(true)
  })

  it('免费用户不应该可以选择 AI 模型', () => {
    expect(canSelectModel(false)).toBe(false)
  })

  it('VIP 用户应该可以生成多版本', () => {
    const maxCount = getMaxVersionCount(true)
    expect(maxCount).toBe(VIP_PRIVILEGES.maxVersionCount)
  })

  it('免费用户只能生成单版本', () => {
    const maxCount = getMaxVersionCount(false)
    expect(maxCount).toBe(FREE_USER_LIMITS.maxVersionCount)
  })
})

describe('点数配置模块 - 产品配置', () => {
  it('应该有正确的点数卡配置', () => {
    const { POINTS_PACKAGES } = require('@/lib/points-config')

    expect(POINTS_PACKAGES).toHaveLength(4)
    expect(POINTS_PACKAGES[0].id).toBe('POINTS_10')
    expect(POINTS_PACKAGES[0].points).toBe(10)
    expect(POINTS_PACKAGES[0].price).toBe(99)
  })

  it('应该有正确的 VIP 套餐配置', () => {
    const { VIP_PACKAGES } = require('@/lib/points-config')

    expect(VIP_PACKAGES).toHaveLength(4)
    expect(VIP_PACKAGES[0].id).toBe('VIP_1')
    expect(VIP_PACKAGES[0].days).toBe(1)
    expect(VIP_PACKAGES[0].price).toBe(199)
  })

  it('点数卡应该有折扣价', () => {
    const { POINTS_PACKAGES } = require('@/lib/points-config')

    // 检查是否有 originalPrice 字段（表示有折扣）
    const hasDiscount = POINTS_PACKAGES.some((pkg: any) => pkg.originalPrice)
    expect(hasDiscount).toBe(true)
  })

  it('VIP 套餐应该有折扣价', () => {
    const { VIP_PACKAGES } = require('@/lib/points-config')

    // 检查是否有 originalPrice 字段（表示有折扣）
    const hasDiscount = VIP_PACKAGES.some((pkg: any) => pkg.originalPrice)
    expect(hasDiscount).toBe(true)
  })
})
