/**
 * 能力：30天内容规划（PRD 4.2）
 *
 * 输入：账号定位/领域、目标、每周更新频率
 * 输出：一个月内容日历（日期、标题、内容类型、核心观点、建议标签）
 */
import { z } from 'zod'
import type { Capability } from './types'

// 输入校验
const inputSchema = z.object({
  positioning: z.string().min(1, '请填写账号定位或领域').max(200, '定位最多 200 字'),
  goal: z.string().max(200, '目标最多 200 字').optional(),
  days: z.coerce.number().int().min(7).max(30).default(30), // 规划天数（7~30）
})

// 单条内容计划
const planItemSchema = z.object({
  day: z.number(),                 // 第几天
  title: z.string(),               // 标题
  contentType: z.string(),         // 内容类型（经验分享/教程/测评等）
  keyPoint: z.string(),            // 核心观点
  tags: z.array(z.string()),       // 建议标签
})

// 输出校验
const outputSchema = z.object({
  plans: z.array(planItemSchema),
})

type PlanningInput = z.infer<typeof inputSchema>
type PlanningOutput = z.infer<typeof outputSchema>

function buildPrompt(input: PlanningInput): string {
  const { positioning, goal, days } = input

  return `你是一位小红书内容运营策划专家，擅长为账号制定可执行、有节奏、能持续涨粉的内容日历。

## 账号信息
- 账号定位/领域：${positioning}
${goal ? `- 运营目标：${goal}` : ''}
- 规划天数：${days} 天

## 规划要求
1. 每天一条内容选题，共 ${days} 条
2. 选题要围绕账号定位，兼顾涨粉爆款与用户价值
3. 内容类型多样化（经验分享、教程干货、测评种草、生活日常、互动话题等）
4. 标题要符合小红书爆款规律（含数字/痛点/好奇心，18-25字）
5. 每条给出核心观点与 3-5 个建议标签
6. 节奏合理：难度递进、话题不重复、穿插高互动选题

## 输出格式（严格按此 JSON 输出，不要有任何额外文字）
{
  "plans": [
    { "day": 1, "title": "标题", "contentType": "经验分享", "keyPoint": "核心观点", "tags": ["标签1", "标签2"] }
  ]
}

请确保 plans 数组恰好包含 ${days} 条。`
}

export const planningCapability: Capability<PlanningInput, PlanningOutput> = {
  id: 'planning',
  name: '30天内容规划',
  description: '生成一个月的内容日历（选题、类型、观点、标签）',
  tier: 'vip', // PRD: Pro 会员功能
  inputSchema,
  outputSchema,
  // 规划生成量大，成本为基础点数的 2 倍
  cost: (_input, basePoints) => basePoints * 2,
  buildPrompt,
}
