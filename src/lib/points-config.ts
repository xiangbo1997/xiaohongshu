/**
 * 点数系统配置
 *
 * 配置存储在数据库 Settings 表中，key 为 'points_config'
 * 可通过管理后台 /admin/points-config 页面修改
 */

import { prisma } from './db'

// ========== 默认配置（数据库无配置时使用） ==========

/**
 * 不同用户类型每天可获得的免费点数（默认值）
 */
export const DAILY_FREE_POINTS = {
  FREE: 3,   // 普通用户每天 3 点
  VIP: 13,   // VIP 用户每天 13 点
} as const

/**
 * 每次生成消耗的基础点数（默认值）
 * 生成 N 个版本 = BASE_POINTS_PER_GENERATION * N
 */
export const BASE_POINTS_PER_GENERATION = 3

// ========== 配置接口 ==========

export interface PointsConfigData {
  dailyFreePoints: {
    free: number
    vip: number
  }
  generation: {
    basePointsPerVersion: number
  }
}

// ========== 从数据库获取配置 ==========

// 配置缓存（避免频繁查询数据库）
let configCache: PointsConfigData | null = null
let cacheTime: number = 0
const CACHE_TTL = 60 * 1000 // 缓存 60 秒

/**
 * 获取点数配置（从数据库读取，带缓存）
 */
export async function getPointsConfig(): Promise<PointsConfigData> {
  const now = Date.now()

  // 检查缓存是否有效
  if (configCache && (now - cacheTime) < CACHE_TTL) {
    return configCache
  }

  try {
    const setting = await prisma.settings.findUnique({
      where: { key: 'points_config' },
    })

    if (setting) {
      configCache = JSON.parse(setting.value) as PointsConfigData
      cacheTime = now
      return configCache
    }
  } catch (error) {
    console.error('Failed to load points config from database:', error)
  }

  // 返回默认配置
  return {
    dailyFreePoints: {
      free: DAILY_FREE_POINTS.FREE,
      vip: DAILY_FREE_POINTS.VIP,
    },
    generation: {
      basePointsPerVersion: BASE_POINTS_PER_GENERATION,
    },
  }
}

/**
 * 清除配置缓存（配置更新后调用）
 */
export function clearPointsConfigCache(): void {
  configCache = null
  cacheTime = 0
}

// ========== 辅助函数 ==========

/**
 * 根据生成版本数计算消耗点数
 * @param count 生成版本数量
 * @param basePoints 每版本基础点数（可选，默认从配置读取）
 * @returns 消耗的点数
 */
export function calculatePointsCost(count: number, basePoints: number = BASE_POINTS_PER_GENERATION): number {
  return basePoints * count
}

/**
 * 获取用户每日免费点数
 * @param isVip 是否是 VIP 用户
 * @param config 配置（可选）
 */
export function getDailyFreePoints(isVip: boolean, config?: PointsConfigData): number {
  if (config) {
    return isVip ? config.dailyFreePoints.vip : config.dailyFreePoints.free
  }
  return isVip ? DAILY_FREE_POINTS.VIP : DAILY_FREE_POINTS.FREE
}

// ========== VIP 特权配置 ==========

/**
 * VIP 用户特权
 */
export const VIP_PRIVILEGES = {
  canSelectModel: true,      // 可以选择 AI 模型
  canMultiVersion: true,     // 可以生成多版本
  maxVersionCount: 3,        // 最大生成版本数
} as const

/**
 * 普通用户限制
 */
export const FREE_USER_LIMITS = {
  canSelectModel: false,     // 不能选择 AI 模型
  canMultiVersion: false,    // 不能生成多版本
  maxVersionCount: 1,        // 只能生成 1 个版本
  defaultModel: 'claude',    // 默认使用的 AI 模型
} as const

/**
 * 获取用户可用的最大生成版本数
 * @param isVip 是否是 VIP 用户
 */
export function getMaxVersionCount(isVip: boolean): number {
  return isVip ? VIP_PRIVILEGES.maxVersionCount : FREE_USER_LIMITS.maxVersionCount
}

/**
 * 检查用户是否可以选择 AI 模型
 * @param isVip 是否是 VIP 用户
 */
export function canSelectModel(isVip: boolean): boolean {
  return isVip ? VIP_PRIVILEGES.canSelectModel : FREE_USER_LIMITS.canSelectModel
}

// ========== 点数卡配置 ==========

/**
 * 点数卡产品配置
 * price 单位：分
 */
export const POINTS_PACKAGES = [
  { id: 'POINTS_10', name: '10点数', points: 10, price: 99 },
  { id: 'POINTS_50', name: '50点数', points: 50, price: 399, originalPrice: 495 },
  { id: 'POINTS_100', name: '100点数', points: 100, price: 699, originalPrice: 990 },
  { id: 'POINTS_500', name: '500点数', points: 500, price: 2999, originalPrice: 4950 },
] as const

// ========== VIP 套餐配置 ==========

/**
 * VIP 套餐配置
 * price 单位：分
 */
export const VIP_PACKAGES = [
  { id: 'VIP_1', name: '1天VIP', days: 1, price: 199 },
  { id: 'VIP_3', name: '3天VIP', days: 3, price: 499, originalPrice: 597 },
  { id: 'VIP_7', name: '7天VIP', days: 7, price: 999, originalPrice: 1393 },
  { id: 'VIP_30', name: '30天VIP', days: 30, price: 2999, originalPrice: 5970 },
] as const
