/**
 * 能力：评论回复助手（PRD 4.7）
 *
 * 输入：用户评论（可选场景/账号定位）
 * 输出：多种语气的回复（专业型/亲切型/转化型）
 */
import { z } from 'zod'
import type { Capability } from './types'

// 输入校验
const inputSchema = z.object({
  comment: z.string().min(1, '请输入用户评论').max(500, '评论最多 500 字'),
  context: z.string().max(200, '场景说明最多 200 字').optional(), // 账号定位/笔记场景
})

// 回复语气枚举（与 PRD 对齐）
const toneSchema = z.enum(['professional', 'friendly', 'conversion'])

// 单条回复方案
const replyItemSchema = z.object({
  tone: toneSchema,   // 语气类型
  reply: z.string(),  // 回复内容
})

// 输出校验
const outputSchema = z.object({
  replies: z.array(replyItemSchema),
})

type CommentReplyInput = z.infer<typeof inputSchema>
type CommentReplyOutput = z.infer<typeof outputSchema>

function buildPrompt(input: CommentReplyInput): string {
  const { comment, context } = input

  return `你是一位小红书运营互动专家，擅长用恰当的语气回复评论，既维护账号形象又促进转化。

## 待回复评论
"${comment}"
${context ? `\n## 账号/场景背景\n${context}` : ''}

## 回复要求
针对该评论，分别生成 3 种语气的回复（tone 字段取值）：
- professional：专业型（体现专业度、解答疑问、建立信任）
- friendly：亲切型（像朋友聊天、拉近距离、有温度）
- conversion：转化型（自然引导关注/私信/购买，不生硬）

每条回复口语化、自然、符合小红书氛围，可含少量 emoji。

## 输出格式（严格按此 JSON 输出，不要有任何额外文字）
{
  "replies": [
    { "tone": "professional", "reply": "回复内容" },
    { "tone": "friendly", "reply": "回复内容" },
    { "tone": "conversion", "reply": "回复内容" }
  ]
}`
}

export const commentReplyCapability: Capability<CommentReplyInput, CommentReplyOutput> = {
  id: 'comment-reply',
  name: '评论回复助手',
  description: '为用户评论生成专业型/亲切型/转化型多种回复',
  tier: 'vip', // PRD: Pro 会员功能
  inputSchema,
  outputSchema,
  buildPrompt,
  cost: (_input, basePoints) => basePoints,
}
