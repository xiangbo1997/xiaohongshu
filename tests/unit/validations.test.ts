/**
 * 数据验证模块单元测试
 * 测试 src/lib/validations.ts 中的 Zod Schema
 */

import { describe, it, expect } from 'vitest'
import {
  phoneSchema,
  emailSchema,
  passwordSchema,
  loginSchema,
  registerSchema,
  generateSchema,
  validateRequest,
} from '@/lib/validations'

describe('验证模块 - 基础 Schema', () => {
  describe('手机号验证', () => {
    it('应该接受有效的手机号', () => {
      const validPhones = [
        '13800138000',
        '15912345678',
        '18888888888',
        '19999999999',
      ]

      validPhones.forEach(phone => {
        const result = phoneSchema.safeParse(phone)
        expect(result.success).toBe(true)
      })
    })

    it('应该拒绝无效的手机号', () => {
      const invalidPhones = [
        '12345678901',  // 不�� 1 开头
        '1380013800',   // 长度不够
        '138001380000', // 长度过长
        '10012345678',  // 第二位不是 3-9
        'abcdefghijk',  // 非数字
      ]

      invalidPhones.forEach(phone => {
        const result = phoneSchema.safeParse(phone)
        expect(result.success).toBe(false)
      })
    })
  })

  describe('邮箱验证', () => {
    it('应该接受有效的邮箱', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'user+tag@example.com',
        '123@test.com',
      ]

      validEmails.forEach(email => {
        const result = emailSchema.safeParse(email)
        expect(result.success).toBe(true)
      })
    })

    it('应该拒绝无效的邮箱', () => {
      const invalidEmails = [
        'invalid',
        '@example.com',
        'user@',
        'user @example.com',
        'user@example',
      ]

      invalidEmails.forEach(email => {
        const result = emailSchema.safeParse(email)
        expect(result.success).toBe(false)
      })
    })
  })

  describe('密码验证', () => {
    it('应该接受有效的密码', () => {
      const validPasswords = [
        '123456',
        'password123',
        'MyP@ssw0rd!',
        'a'.repeat(50),
      ]

      validPasswords.forEach(password => {
        const result = passwordSchema.safeParse(password)
        expect(result.success).toBe(true)
      })
    })

    it('应该拒绝过短的密码', () => {
      const result = passwordSchema.safeParse('12345')
      expect(result.success).toBe(false)
    })

    it('应该拒绝过长的密码', () => {
      const result = passwordSchema.safeParse('a'.repeat(51))
      expect(result.success).toBe(false)
    })
  })
})

describe('验证模块 - 认证 Schema', () => {
  describe('登录验证', () => {
    it('应该接受手机号登录', () => {
      const data = {
        phone: '13800138000',
        password: '123456',
      }

      const result = loginSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('应该接受邮箱登录', () => {
      const data = {
        email: 'test@example.com',
        password: '123456',
      }

      const result = loginSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('应该拒绝既无手机号也无邮箱', () => {
      const data = {
        password: '123456',
      }

      const result = loginSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('应该拒绝无密码', () => {
      const data = {
        phone: '13800138000',
      }

      const result = loginSchema.safeParse(data)
      expect(result.success).toBe(false)
    })
  })

  describe('注册验证', () => {
    it('应该接受完整的注册信息', () => {
      const data = {
        phone: '13800138000',
        password: '123456',
        nickname: '测试用户',
      }

      const result = registerSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('应该接受不带昵称的注册', () => {
      const data = {
        email: 'test@example.com',
        password: '123456',
      }

      const result = registerSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('应该拒绝过长的昵称', () => {
      const data = {
        phone: '13800138000',
        password: '123456',
        nickname: 'a'.repeat(21),
      }

      const result = registerSchema.safeParse(data)
      expect(result.success).toBe(false)
    })
  })
})

describe('验证模块 - 生成 Schema', () => {
  it('应该接受完整的生成请求', () => {
    const data = {
      contentType: 'note',
      category: 'beauty',
      topic: '夏日防晒推荐',
      keywords: '防晒霜,SPF50',
      style: 'lively',
      aiProvider: 'anthropic',
      count: 2,
    }

    const result = generateSchema.safeParse(data)
    expect(result.success).toBe(true)
  })

  it('应该使用默认值', () => {
    const data = {
      contentType: 'note',
      category: 'beauty',
      topic: '夏日防晒推荐',
    }

    const result = generateSchema.safeParse(data)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.style).toBe('lively')
      expect(result.data.aiProvider).toBe('anthropic')
      expect(result.data.count).toBe(1)
    }
  })

  it('应该拒绝无效的内容类型', () => {
    const data = {
      contentType: 'invalid',
      category: 'beauty',
      topic: '夏日防晒推荐',
    }

    const result = generateSchema.safeParse(data)
    expect(result.success).toBe(false)
  })

  it('应该拒绝空主题', () => {
    const data = {
      contentType: 'note',
      category: 'beauty',
      topic: '',
    }

    const result = generateSchema.safeParse(data)
    expect(result.success).toBe(false)
  })

  it('应该拒绝过长的主题', () => {
    const data = {
      contentType: 'note',
      category: 'beauty',
      topic: 'a'.repeat(201),
    }

    const result = generateSchema.safeParse(data)
    expect(result.success).toBe(false)
  })

  it('应该限制生成数量', () => {
    const data = {
      contentType: 'note',
      category: 'beauty',
      topic: '夏日防晒推荐',
      count: 4, // 超过最大值 3
    }

    const result = generateSchema.safeParse(data)
    expect(result.success).toBe(false)
  })
})

describe('验证模块 - 工具函数', () => {
  describe('validateRequest', () => {
    it('应该返回成功结果', () => {
      const data = {
        phone: '13800138000',
        password: '123456',
      }

      const result = validateRequest(loginSchema, data)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.phone).toBe('13800138000')
      }
    })

    it('应该返回失败结果和错误信息', () => {
      const data = {
        password: '123456',
      }

      const result = validateRequest(loginSchema, data)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBeTruthy()
        expect(result.error).toContain('手机号或邮箱')
      }
    })

    it('应该格式化多个错误', () => {
      const data = {
        phone: '123', // 无效手机号
        password: '123', // 密码过短
      }

      const result = validateRequest(loginSchema, data)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('手机号')
        expect(result.error).toContain('密码')
      }
    })
  })
})

describe('验证模块 - 边界情况', () => {
  it('应该处理 null 值', () => {
    const result = validateRequest(loginSchema, null)
    expect(result.success).toBe(false)
  })

  it('应该处理 undefined 值', () => {
    const result = validateRequest(loginSchema, undefined)
    expect(result.success).toBe(false)
  })

  it('应该处理空对象', () => {
    const result = validateRequest(loginSchema, {})
    expect(result.success).toBe(false)
  })

  it('应该处理额外的字段', () => {
    const data = {
      phone: '13800138000',
      password: '123456',
      extraField: 'should be ignored',
    }

    const result = validateRequest(loginSchema, data)
    expect(result.success).toBe(true)
  })
})
