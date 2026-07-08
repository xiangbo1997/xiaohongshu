/**
 * AI 能力（Capability）框架类型定义
 *
 * 设计目标：把「一种 AI 功能」抽象为一个可注册的能力单元，
 * 统一路由 /api/ai/[capability] 依赖此接口驱动，新增功能 = 新增一个 Capability 注册项，
 * 无需改动路由、鉴权、积分、记录等公共流水线。
 */
import { z } from 'zod'

/**
 * 能力标识（与路由 path 段、AiTask.capability、前端调用一一对应）
 */
export type CapabilityId =
  | 'positioning'    // 账号定位
  | 'planning'       // 30天内容规划
  | 'titles'         // 爆款标题生成
  | 'comment-reply'  // 评论回复助手

/**
 * 能力所需的会员等级（门禁）
 *
 * 当前系统仅有 FREE / VIP 两档，故落地为二值。
 * PRD 规划的 Pro(29元) / 创作者(99元) / 企业版(499元) 三级分层，
 * 待 MemberType 枚举扩展后，此处可平滑扩为 'free' | 'pro' | 'creator' | 'enterprise'，
 * 门禁函数 assertTierAllowed 无需改动，仅调整各能力的 tier 标注即可。
 * PRD 映射（未来）：
 *   - titles(标题) → free
 *   - positioning(定位) / planning(规划) → pro
 *   - comment-reply(评论) → pro
 *   - 爆款分析 / 数据复盘 → creator
 */
export type CapabilityTier = 'free' | 'vip'

/**
 * 单个 AI 能力定义
 *
 * @template TInput  输入参数类型（由 inputSchema 推导）
 * @template TOutput 输出结果类型（由 outputSchema 推导）
 */
export interface Capability<
  TInput = unknown,
  TOutput = unknown,
> {
  /** 能力标识 */
  id: CapabilityId
  /** 展示名称（用于日志、前端） */
  name: string
  /** 能力简介 */
  description: string
  /** 所需会员等级（门禁）。free = 所有登录用户可用；vip = 仅有效 VIP 可用 */
  tier: CapabilityTier
  /** 输入参数校验 schema（zod） */
  inputSchema: z.ZodType<TInput>
  /** 输出结果校验 schema（zod，用于校验 AI 返回的 JSON） */
  outputSchema: z.ZodType<TOutput>
  /**
   * 构建发送给 AI 的 prompt。
   * 约定：prompt 必须要求 AI 严格输出符合 outputSchema 的 JSON。
   */
  buildPrompt: (input: TInput) => string
  /**
   * 本能力单次调用消耗的点数。
   * 传入点数基础配置，返回实际消耗值（不同能力成本可不同）。
   */
  cost: (input: TInput, basePoints: number) => number
}

/**
 * 能力注册表类型：capability id -> Capability
 */
export type CapabilityRegistry = Record<CapabilityId, Capability>
