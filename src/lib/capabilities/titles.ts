/**
 * 能力：爆款标题生成（PRD 4.3）
 *
 * 输入：主题（可选风格倾向）
 * 输出：10 个标题方案，覆盖情绪型/冲突型/好奇型/教程型
 */
import { z } from 'zod'
import type { Capability } from './types'

// 输入校验
const inputSchema = z.object({
  topic: z.string().min(1, '请输入主题').max(200, '主题最多 200 字'),
  keywords: z.string().max(100, '关键词最多 100 字').optional(),
  count: z.coerce.number().int().min(5).max(15).default(10),
})

// 标题类型枚举（与 PRD 对齐）
const titleTypeSchema = z.enum(['emotional', 'conflict', 'curiosity', 'tutorial'])

// 单个标题方案
const titleItemSchema = z.object({
  title: z.string(),          // 标题内容
  type: titleTypeSchema,      // 标题类型
})

// 输出校验
const outputSchema = z.object({
  titles: z.array(titleItemSchema),
})

type TitlesInput = z.infer<typeof inputSchema>
type TitlesOutput = z.infer<typeof outputSchema>

function buildPrompt(input: TitlesInput): string {
  const { topic, keywords, count } = input

  return `你是一位小红书爆款标题专家，深谙平台标题算法与用户点击心理。

## 主题
- 主题：${topic}
${keywords ? `- 关键词：${keywords}` : ''}

## 标题规则
1. 每个标题 18-25 字
2. 使用数字或包含数字（如"5个""3天""99%"）
3. 包含痛点词或利益点（如"绝了""后悔""必看""神器"）
4. 适当使用 emoji 点缀（1-3 个）
5. 制造好奇心或紧迫感

## 标题类型（type 字段取值）
- emotional：情绪型（引发共鸣、戳中情绪）
- conflict：冲突型（制造反差、打破认知）
- curiosity：好奇型（留悬念、引发好奇）
- tutorial：教程型（干货承诺、方法论）

## 任务
生成 ${count} 个标题方案，四种类型均衡覆盖。

## 输出格式（严格按此 JSON 输出，不要有任何额外文字）
{
  "titles": [
    { "title": "标题内容", "type": "emotional" }
  ]
}

请确保 titles 数组恰好包含 ${count} 条。`
}

export const titlesCapability: Capability<TitlesInput, TitlesOutput> = {
  id: 'titles',
  name: '爆款标题生成',
  description: '为主题生成多个爆款标题方案（情绪/冲突/好奇/教程型）',
  tier: 'free', // PRD: 免费用户可用（受每日免费点数限制）
  inputSchema,
  outputSchema,
  buildPrompt,
  cost: (_input, basePoints) => basePoints,
}
