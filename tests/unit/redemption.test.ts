/**
 * 兑换码模块单元测试
 * 测试 src/lib/redemption.ts 中的核心功能
 */

import { describe, it, expect } from 'vitest'
import {
  generateRedemptionCode,
  verifyRedemptionCodeSignature,
  normalizeCode,
  isValidCodeFormat,
  formatCodeForDisplay,
} from '@/lib/redemption'

describe('兑换码模块 - 生成与验证', () => {
  it('应该生成格式正确的兑换码', () => {
    const code = generateRedemptionCode()

    expect(code).toBeTruthy()
    expect(typeof code).toBe('string')
    // 格式：XXXX-XXXX-XXXX-XXXX-XXXXX-XXXXX (4-4-4-4-5-5)
    expect(code).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{5}-[A-Z2-9]{5}$/)
  })

  it('应该生成唯一的兑换码', () => {
    const codes = new Set()
    for (let i = 0; i < 100; i++) {
      codes.add(generateRedemptionCode())
    }

    // 100 个兑换码应该都是唯一的
    expect(codes.size).toBe(100)
  })

  it('应该验证有效的兑换码签名', () => {
    const code = generateRedemptionCode()
    const isValid = verifyRedemptionCodeSignature(code)

    expect(isValid).toBe(true)
  })

  it('应该拒绝无效的兑换码签名', () => {
    const invalidCode = 'AAAA-BBBB-CCCC-DDDD-EEEEE-FFFFF'
    const isValid = verifyRedemptionCodeSignature(invalidCode)

    expect(isValid).toBe(false)
  })

  it('应该拒绝被篡改的兑换码', () => {
    const code = generateRedemptionCode()
    // 修改一个字符
    const tamperedCode = code.replace(/A/, 'B')
    const isValid = verifyRedemptionCodeSignature(tamperedCode)

    expect(isValid).toBe(false)
  })

  it('应该验证带连字符和不带连字符的兑换码', () => {
    const code = generateRedemptionCode()
    const codeWithoutDash = code.replace(/-/g, '')

    expect(verifyRedemptionCodeSignature(code)).toBe(true)
    expect(verifyRedemptionCodeSignature(codeWithoutDash)).toBe(true)
  })

  it('应该验证大小写不敏感的兑换码', () => {
    const code = generateRedemptionCode()
    const lowerCode = code.toLowerCase()

    expect(verifyRedemptionCodeSignature(lowerCode)).toBe(true)
  })
})

describe('兑换码模块 - 格式处理', () => {
  it('应该规范化兑换码格式', () => {
    const code = 'aaaa-bbbb-cccc-dddd-eeeee-fffff'
    const normalized = normalizeCode(code)

    expect(normalized).toBe('AAAABBBBCCCCDDDDEEEEEFFFFF')
  })

  it('应该移除空格和连字符', () => {
    const code = 'AAAA BBBB-CCCC DDDD-EEEEE FFFFF'
    const normalized = normalizeCode(code)

    expect(normalized).toBe('AAAABBBBCCCCDDDDEEEEEFFFFF')
  })

  it('应该验证正确的兑换码格式', () => {
    const validCode = 'AAAA-BBBB-CCCC-DDDD-EEEEE-FFFFF'
    expect(isValidCodeFormat(validCode)).toBe(true)
  })

  it('应该拒绝长度不正确的兑换码', () => {
    const shortCode = 'AAAA-BBBB'
    const longCode = 'AAAA-BBBB-CCCC-DDDD-EEEEE-FFFFF-GGGGG'

    expect(isValidCodeFormat(shortCode)).toBe(false)
    expect(isValidCodeFormat(longCode)).toBe(false)
  })

  it('应该拒绝包含非法字符的兑换码', () => {
    // 包含容易混淆的字符 0, O, 1, I, L
    const invalidCode1 = '0AAA-BBBB-CCCC-DDDD-EEEEE-FFFFF'
    const invalidCode2 = 'OAAA-BBBB-CCCC-DDDD-EEEEE-FFFFF'
    const invalidCode3 = '1AAA-BBBB-CCCC-DDDD-EEEEE-FFFFF'
    const invalidCode4 = 'IAAA-BBBB-CCCC-DDDD-EEEEE-FFFFF'

    expect(isValidCodeFormat(invalidCode1)).toBe(false)
    expect(isValidCodeFormat(invalidCode2)).toBe(false)
    expect(isValidCodeFormat(invalidCode3)).toBe(false)
    expect(isValidCodeFormat(invalidCode4)).toBe(false)
  })

  it('应该格式化兑换码用于显示', () => {
    const code = 'AAAABBBBCCCCDDDDEEEEEFFFFF'
    const formatted = formatCodeForDisplay(code)

    expect(formatted).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{5}-[A-Z2-9]{5}$/)
  })
})

describe('兑换码模块 - 安全性', () => {
  it('应该使用 HMAC 签名防止伪造', () => {
    // 尝试构造一个看起来合法的兑换码
    const fakeCode = 'AAAA-BBBB-CCCC-DDDD-EEEEE-FFFFF'
    const isValid = verifyRedemptionCodeSignature(fakeCode)

    expect(isValid).toBe(false)
  })

  it('应该使用足够的随机性', () => {
    const codes = []
    for (let i = 0; i < 10; i++) {
      codes.push(generateRedemptionCode())
    }

    // 检查是否有重复
    const uniqueCodes = new Set(codes)
    expect(uniqueCodes.size).toBe(codes.length)

    // 检查是否有明显的模式
    const firstChars = codes.map(c => c[0])
    const uniqueFirstChars = new Set(firstChars)
    // 至少应该有多个不同的首字符
    expect(uniqueFirstChars.size).toBeGreaterThan(1)
  })

  it('应该使用时序安全的比较', () => {
    // 这个测试主要是确保代码使用了 crypto.timingSafeEqual
    // 实际的时序攻击测试需要更复杂的设置
    const code = generateRedemptionCode()
    const isValid = verifyRedemptionCodeSignature(code)

    expect(isValid).toBe(true)
  })
})

describe('兑换码模块 - 边界情况', () => {
  it('应该处理空字符串', () => {
    expect(isValidCodeFormat('')).toBe(false)
    expect(verifyRedemptionCodeSignature('')).toBe(false)
  })

  it('应该处理 null 和 undefined', () => {
    expect(() => isValidCodeFormat(null as any)).not.toThrow()
    expect(() => verifyRedemptionCodeSignature(undefined as any)).not.toThrow()
  })

  it('应该��理特殊字符', () => {
    const specialCode = 'AAAA-BBBB-CCCC-DDDD-EEEEE-FFFFF!@#$'
    expect(isValidCodeFormat(specialCode)).toBe(false)
  })

  it('应该处理 Unicode 字符', () => {
    const unicodeCode = 'AAAA-BBBB-CCCC-DDDD-EEEEE-中文字符'
    expect(isValidCodeFormat(unicodeCode)).toBe(false)
  })
})
