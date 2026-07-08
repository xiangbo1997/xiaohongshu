/**
 * AI 能力注册表
 *
 * 统一路由 /api/ai/[capability] 通过此注册表按 id 查找能力。
 * 新增一个 AI 功能 = 在此注册一个 Capability，无需改动路由/鉴权/积分/记录逻辑。
 */
import type { Capability, CapabilityId, CapabilityTier } from './types'
import { positioningCapability } from './positioning'
import { planningCapability } from './planning'
import { titlesCapability } from './titles'
import { commentReplyCapability } from './comment-reply'

// 能力注册表：id -> Capability
const registry: Record<CapabilityId, Capability> = {
  'positioning': positioningCapability as Capability,
  'planning': planningCapability as Capability,
  'titles': titlesCapability as Capability,
  'comment-reply': commentReplyCapability as Capability,
}

/**
 * 按 id 获取能力，未注册返回 null。
 */
export function getCapability(id: string): Capability | null {
  if (id in registry) {
    return registry[id as CapabilityId]
  }
  return null
}

/**
 * 列出所有已注册能力的元信息（供前端展示能力清单，含所需会员等级）。
 */
export function listCapabilities(): Array<Pick<Capability, 'id' | 'name' | 'description' | 'tier'>> {
  return Object.values(registry).map(({ id, name, description, tier }) => ({ id, name, description, tier }))
}

/**
 * 门禁校验：判断指定会员状态是否满足能力所需等级。
 *
 * @param tier   能力所需等级
 * @param isVip  用户是否为有效 VIP
 * @returns allowed=false 时附带升级引导原因
 */
export function assertTierAllowed(
  tier: CapabilityTier,
  isVip: boolean
): { allowed: boolean; reason?: string } {
  if (tier === 'free') return { allowed: true }
  if (tier === 'vip' && isVip) return { allowed: true }
  return { allowed: false, reason: '该功能为 VIP 会员专属，请升级后使用' }
}

export type { Capability, CapabilityId, CapabilityTier } from './types'
