/**
 * 能力：AI 账号定位（PRD 4.1）
 *
 * 输入：用户基础信息（年龄/职业/兴趣/擅长领域/商业目标）
 * 输出：人设定位、账号名建议、简介、内容方向、目标用户
 */
import { z } from 'zod'
import type { Capability } from './types'

// 输入校验
const inputSchema = z.object({
  age: z.string().max(20, '年龄最多 20 字').optional(),
  profession: z.string().max(50, '职业最多 50 字').optional(),
  interests: z.string().min(1, '请填写兴趣爱好').max(200, '兴趣最多 200 字'),
  expertise: z.string().max(200, '擅长领域最多 200 字').optional(),
  goal: z.string().min(1, '请填写商业目标').max(200, '商业目标最多 200 字'),
})

// 输出校验（校验 AI 返回结构）
const outputSchema = z.object({
  positioning: z.string(),            // 人设定位
  accountNames: z.array(z.string()),  // 账号名称建议
  bio: z.string(),                    // 简介
  contentDirections: z.array(z.string()), // 内容方向
  targetAudience: z.string(),         // 目标用户
})

type PositioningInput = z.infer<typeof inputSchema>
type PositioningOutput = z.infer<typeof outputSchema>

function buildPrompt(input: PositioningInput): string {
  const { age, profession, interests, expertise, goal } = input

  return `你是一位资深的小红书个人IP定位专家，擅长为普通人打造清晰、有辨识度、易变现的账号人设。

## 用户信息
${age ? `- 年龄：${age}` : ''}
${profession ? `- 职业：${profession}` : ''}
- 兴趣爱好：${interests}
${expertise ? `- 擅长领域：${expertise}` : ''}
- 商业目标：${goal}

## 定位要求
1. 人设定位：一句话概括账号人设，要有记忆点、有差异化（如"90后科学育儿妈妈"）
2. 账号名称：提供 3-5 个候选，简短好记、贴合人设、便于搜索
3. 简介：一段小红书个人简介，60 字以内，突出价值主张与信任感
4. 内容方向：给出 3-5 个可长期产出的内容支柱方向
5. 目标用户：清晰描述核心目标人群及其痛点

## 输出格式（严格按此 JSON 输出，不要有任何额外文字）
{
  "positioning": "人设定位一句话",
  "accountNames": ["名称1", "名称2", "名称3"],
  "bio": "个人简介",
  "contentDirections": ["方向1", "方向2", "方向3"],
  "targetAudience": "目标用户描述"
}`
}

export const positioningCapability: Capability<PositioningInput, PositioningOutput> = {
  id: 'positioning',
  name: 'AI账号定位',
  description: '根据个人信息生成人设定位、账号名、简介、内容方向',
  tier: 'vip', // PRD: Pro 会员功能
  inputSchema,
  outputSchema,
  buildPrompt,
  cost: (_input, basePoints) => basePoints,
}
