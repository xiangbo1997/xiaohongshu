/**
 * 兑换码工具模块
 *
 * 安全设计：
 * 1. 使用 12 字节随机数（96 位）作为基础
 * 2. 添加 4 字节 HMAC-SHA256 签名验证
 * 3. 使用 Base32 编码（避免歧义字符，易于输入）
 * 4. 最终格式：XXXX-XXXX-XXXX-XXXX
 *
 * 防破解机制：
 * - HMAC 签名验证，防止伪造
 * - 96 位随机空间，暴力破解不可行
 * - 数据库追踪使用状态
 */

import crypto from 'crypto'

// Base32 字符表（32 个字符，去掉容易混淆的 0/O, 1/I/L）
const BASE32_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const BASE32_PAD = '='

/**
 * 生成兑换码
 * @returns 格式化后的兑换码 (XXXX-XXXX-XXXX-XXXX)
 */
export function generateRedemptionCode(): string {
  // 1. 生成 12 字节随机数（96 位）
  const random = crypto.randomBytes(12)

  // 2. 计算签名（4 字节）
  const hmac = crypto.createHmac('sha256', getRedemptionSecret())
  hmac.update(random)
  const signature = hmac.digest().subarray(0, 4)

  // 3. 拼接随机数和签名
  const combined = Buffer.concat([random, signature])

  // 4. Base32 编码
  const encoded = base32Encode(combined)

  // 5. 格式化为 XXXX-XXXX-XXXX-XXXX
  return formatCode(encoded)
}

/**
 * 验证兑换码签名
 * @param code 兑换码（带或不带连字符）
 * @returns 是否有效
 */
export function verifyRedemptionCodeSignature(code: string): boolean {
  try {
    // 1. 移除连字符并转大写
    const clean = code.replace(/[-\s]/g, '').toUpperCase()

    // 2. Base32 解码
    const decoded = base32Decode(clean)
    if (decoded.length !== 16) return false // 12 + 4 = 16 字节

    // 3. 分离随机数和签名
    const random = decoded.subarray(0, 12)
    const signature = decoded.subarray(12, 16)

    // 4. 重新计算签名
    const hmac = crypto.createHmac('sha256', getRedemptionSecret())
    hmac.update(random)
    const expected = hmac.digest().subarray(0, 4)

    // 5. 使用时序安全的比较
    return crypto.timingSafeEqual(signature, expected)
  } catch {
    return false
  }
}

/**
 * 规范化兑换码格式
 * @param code 用户输入的兑换码
 * @returns 规范化后的兑换码（大写，不带连字符）
 */
export function normalizeCode(code: string): string {
  return code.replace(/[-\s]/g, '').toUpperCase()
}

/**
 * 验证兑换码格式
 * @param code 兑换码
 * @returns 是否符合格式要求
 */
export function isValidCodeFormat(code: string): boolean {
  const clean = code.replace(/[-\s]/g, '').toUpperCase()
  // 验证长度和字符（使用 BASE32_ALPHABET 中的字符）
  // 16 字节 Base32 编码后是 26 个字符
  return clean.length === 26 && /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]+$/.test(clean)
}

// ========== 私有函数 ==========

/**
 * 获取兑换码签名密钥
 */
function getRedemptionSecret(): Buffer {
  const secret = process.env.ENCRYPTION_SECRET || process.env.JWT_SECRET || 'default-redemption-key'
  // 使用固定盐派生密钥，确保同一环境生成的签名一致
  return crypto.pbkdf2Sync(secret, 'redemption-code-salt', 100000, 32, 'sha256')
}

/**
 * Base32 编码
 * @param data 二进制数据
 * @returns Base32 字符串
 */
function base32Encode(data: Buffer): string {
  let bits = 0
  let value = 0
  let output = ''

  for (let i = 0; i < data.length; i++) {
    value = (value << 8) | data[i]
    bits += 8

    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31]
  }

  return output
}

/**
 * Base32 解码
 * @param str Base32 字符串
 * @returns 二进制数据
 */
function base32Decode(str: string): Buffer {
  const clean = str.replace(new RegExp(`[${BASE32_PAD}\\s]`, 'g'), '')

  let bits = 0
  let value = 0
  let index = 0
  const output: number[] = []

  for (const char of clean) {
    const charIndex = BASE32_ALPHABET.indexOf(char)
    if (charIndex === -1) throw new Error('Invalid Base32 character')

    value = (value << 5) | charIndex
    bits += 5

    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 255)
      bits -= 8
    }
  }

  return Buffer.from(output)
}

/**
 * 格式化兑换码为 XXXX-XXXX-XXXX-XXXX-XXXXX-XXXXX
 * @param code 26 位 Base32 字符串
 * @returns 格式化后的兑换码（每 4 或 5 个字符一组，便于阅读）
 */
function formatCode(code: string): string {
  if (code.length !== 26) return code
  // 格式化为 4-4-4-4-5-5 格式
  return [
    code.slice(0, 4),
    code.slice(4, 8),
    code.slice(8, 12),
    code.slice(12, 16),
    code.slice(16, 21),
    code.slice(21, 26),
  ].join('-')
}

/**
 * 格式化兑换码用于显示和数据库查询
 * @param code 26 位纯字符串（不带连字符）
 * @returns 格式化后的兑换码（带连字符）
 */
export function formatCodeForDisplay(code: string): string {
  const clean = code.replace(/[-\s]/g, '').toUpperCase()
  return formatCode(clean)
}

/**
 * 奖励类型对应的 MemberType 和天数
 */
export const REWARD_TYPE_CONFIG = {
  DAY: { memberType: 'DAY' as const, days: 1 },
  MONTH: { memberType: 'MONTH' as const, days: 30 },
  YEAR: { memberType: 'YEAR' as const, days: 365 },
} as const

/**
 * 奖励类型显示名称
 */
export const REWARD_TYPE_LABELS: Record<string, string> = {
  DAY: '日卡会员',
  MONTH: '月卡会员',
  YEAR: '年卡会员',
  CUSTOM: '自定义天数',
}

/**
 * 兑换状态显示名称
 */
export const REDEMPTION_STATUS_LABELS: Record<string, string> = {
  ACTIVE: '有效',
  EXPIRED: '已过期',
  DEPLETED: '已用完',
  DISABLED: '已禁用',
}

/**
 * 兑换状态颜色
 */
export const REDEMPTION_STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-800',
  EXPIRED: 'bg-gray-100 text-gray-800',
  DEPLETED: 'bg-red-100 text-red-800',
  DISABLED: 'bg-yellow-100 text-yellow-800',
}
