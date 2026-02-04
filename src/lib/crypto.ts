/**
 * 加密工具模块
 * 用于敏感数据（如 API Key）的加密存储
 */
import crypto from 'crypto'

// 加密配置
const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const AUTH_TAG_LENGTH = 16
const SALT_LENGTH = 32

// 获取加密密钥（从环境变量或派生）
function getEncryptionKey(): Buffer {
  const secret = process.env.ENCRYPTION_SECRET || process.env.JWT_SECRET || 'default-encryption-key'
  // 使用 PBKDF2 派生固定长度的密钥
  return crypto.pbkdf2Sync(secret, 'xiaohongshu-salt', 100000, 32, 'sha256')
}

/**
 * 加密字符串
 * @param plaintext 明文
 * @returns 加密后的字符串（格式：salt:iv:authTag:ciphertext，Base64编码）
 */
export function encrypt(plaintext: string): string {
  if (!plaintext) return ''

  const key = getEncryptionKey()
  const iv = crypto.randomBytes(IV_LENGTH)
  const salt = crypto.randomBytes(SALT_LENGTH)

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  let encrypted = cipher.update(plaintext, 'utf8', 'base64')
  encrypted += cipher.final('base64')
  const authTag = cipher.getAuthTag()

  // 组合所有部分
  const combined = Buffer.concat([
    salt,
    iv,
    authTag,
    Buffer.from(encrypted, 'base64'),
  ])

  return combined.toString('base64')
}

/**
 * 解密字符串
 * @param ciphertext 密文（Base64编码）
 * @returns 解密后的明文
 */
export function decrypt(ciphertext: string): string {
  if (!ciphertext) return ''

  try {
    const key = getEncryptionKey()
    const combined = Buffer.from(ciphertext, 'base64')

    // 提取各部分
    const salt = combined.subarray(0, SALT_LENGTH)
    const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH)
    const authTag = combined.subarray(
      SALT_LENGTH + IV_LENGTH,
      SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH
    )
    const encrypted = combined.subarray(SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH)

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(authTag)

    let decrypted = decipher.update(encrypted)
    decrypted = Buffer.concat([decrypted, decipher.final()])

    return decrypted.toString('utf8')
  } catch {
    console.error('Decryption failed')
    return ''
  }
}

/**
 * 判断字符串是否已加密
 * 加密后的字符串长度至少为 salt + iv + authTag = 64 字节的 Base64
 */
export function isEncrypted(value: string): boolean {
  if (!value) return false
  try {
    const buffer = Buffer.from(value, 'base64')
    return buffer.length >= SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH + 1
  } catch {
    return false
  }
}

/**
 * 安全比较两个字符串（防止时序攻击）
 */
export function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b))
}

/**
 * 生成安全的随机令牌
 */
export function generateSecureToken(length = 32): string {
  return crypto.randomBytes(length).toString('hex')
}

/**
 * 哈希字符串（用于不可逆存储）
 */
export function hash(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex')
}
