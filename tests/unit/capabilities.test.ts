/**
 * AI 能力框架单元测试
 * 测试 src/lib/capabilities 下的注册表、输入/输出校验、prompt 构建、成本、JSON 解析
 */

import { describe, it, expect } from 'vitest'
import { getCapability, listCapabilities, assertTierAllowed } from '@/lib/capabilities'
import { parseJsonFromAiResponse } from '@/lib/capabilities/parse'

describe('能力注册表', () => {
  it('应能按 id 查到已注册能力', () => {
    for (const id of ['positioning', 'planning', 'titles', 'comment-reply']) {
      const cap = getCapability(id)
      expect(cap).not.toBeNull()
      expect(cap?.id).toBe(id)
    }
  })

  it('未注册能力返回 null', () => {
    expect(getCapability('unknown')).toBeNull()
    expect(getCapability('')).toBeNull()
  })

  it('列出所有能力元信息（含 tier）', () => {
    const list = listCapabilities()
    expect(list).toHaveLength(4)
    list.forEach((c) => {
      expect(c.id).toBeTruthy()
      expect(c.name).toBeTruthy()
      expect(c.description).toBeTruthy()
      expect(['free', 'vip']).toContain(c.tier)
    })
  })
})

describe('会员分级门禁 assertTierAllowed', () => {
  it('free 能力对所有登录用户放行', () => {
    expect(assertTierAllowed('free', false).allowed).toBe(true)
    expect(assertTierAllowed('free', true).allowed).toBe(true)
  })

  it('vip 能力仅对 VIP 放行', () => {
    expect(assertTierAllowed('vip', true).allowed).toBe(true)
    const denied = assertTierAllowed('vip', false)
    expect(denied.allowed).toBe(false)
    expect(denied.reason).toBeTruthy()
  })

  it('能力 tier 标注符合 PRD 意图', () => {
    expect(getCapability('titles')!.tier).toBe('free')
    expect(getCapability('positioning')!.tier).toBe('vip')
    expect(getCapability('planning')!.tier).toBe('vip')
    expect(getCapability('comment-reply')!.tier).toBe('vip')
  })
})

describe('能力：账号定位 positioning', () => {
  const cap = getCapability('positioning')!

  it('接受合法输入', () => {
    const r = cap.inputSchema.safeParse({ interests: '育儿', goal: '赚钱' })
    expect(r.success).toBe(true)
  })

  it('缺少必填字段时拒绝', () => {
    expect(cap.inputSchema.safeParse({ interests: '育儿' }).success).toBe(false) // 缺 goal
    expect(cap.inputSchema.safeParse({ goal: '赚钱' }).success).toBe(false) // 缺 interests
  })

  it('prompt 包含用户输入', () => {
    const prompt = cap.buildPrompt({ interests: '育儿', goal: '副业变现' })
    expect(prompt).toContain('育儿')
    expect(prompt).toContain('副业变现')
    expect(prompt).toContain('JSON')
  })

  it('校验合法输出结构', () => {
    const valid = {
      positioning: '90后科学育儿妈妈',
      accountNames: ['育儿日记', '妈妈成长营'],
      bio: '分享科学育儿',
      contentDirections: ['育儿经验', '亲子关系'],
      targetAudience: '新手宝妈',
    }
    expect(cap.outputSchema.safeParse(valid).success).toBe(true)
  })

  it('拒绝缺字段的输出', () => {
    expect(cap.outputSchema.safeParse({ positioning: 'x' }).success).toBe(false)
  })

  it('成本等于基础点数', () => {
    expect(cap.cost({ interests: 'a', goal: 'b' }, 3)).toBe(3)
  })
})

describe('能力：内容规划 planning', () => {
  const cap = getCapability('planning')!

  it('days 默认 30、范围限制 7~30', () => {
    const r = cap.inputSchema.safeParse({ positioning: '育儿账号' })
    expect(r.success).toBe(true)
    expect((r as { data: { days: number } }).data.days).toBe(30)
    expect(cap.inputSchema.safeParse({ positioning: 'x', days: 5 }).success).toBe(false)
    expect(cap.inputSchema.safeParse({ positioning: 'x', days: 31 }).success).toBe(false)
  })

  it('成本为基础点数 2 倍', () => {
    expect(cap.cost({ positioning: 'x', days: 30 }, 3)).toBe(6)
  })

  it('prompt 中天数与定位正确注入', () => {
    const prompt = cap.buildPrompt({ positioning: '健身教练', days: 14 })
    expect(prompt).toContain('健身教练')
    expect(prompt).toContain('14')
  })
})

describe('能力：爆款标题 titles', () => {
  const cap = getCapability('titles')!

  it('count 默认 10', () => {
    const r = cap.inputSchema.safeParse({ topic: '防晒霜测评' })
    expect((r as { data: { count: number } }).data.count).toBe(10)
  })

  it('输出 type 只接受四种枚举', () => {
    expect(
      cap.outputSchema.safeParse({ titles: [{ title: 'x', type: 'emotional' }] }).success
    ).toBe(true)
    expect(
      cap.outputSchema.safeParse({ titles: [{ title: 'x', type: 'invalid' }] }).success
    ).toBe(false)
  })
})

describe('能力：评论回复 comment-reply', () => {
  const cap = getCapability('comment-reply')!

  it('评论必填', () => {
    expect(cap.inputSchema.safeParse({}).success).toBe(false)
    expect(cap.inputSchema.safeParse({ comment: '这个好用吗' }).success).toBe(true)
  })

  it('tone 只接受三种枚举', () => {
    expect(
      cap.outputSchema.safeParse({ replies: [{ tone: 'conversion', reply: 'x' }] }).success
    ).toBe(true)
    expect(
      cap.outputSchema.safeParse({ replies: [{ tone: 'angry', reply: 'x' }] }).success
    ).toBe(false)
  })
})

describe('JSON 解析容错 parseJsonFromAiResponse', () => {
  it('直接解析纯 JSON', () => {
    expect(parseJsonFromAiResponse('{"a":1}')).toEqual({ a: 1 })
  })

  it('从带说明文字的响应中提取 JSON', () => {
    const raw = '好的，这是结果：\n{"title":"标题","tags":["a"]}\n以上。'
    expect(parseJsonFromAiResponse(raw)).toEqual({ title: '标题', tags: ['a'] })
  })

  it('无 JSON 时抛错', () => {
    expect(() => parseJsonFromAiResponse('抱歉我无法生成')).toThrow()
  })
})
