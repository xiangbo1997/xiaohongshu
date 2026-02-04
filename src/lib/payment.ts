import crypto from 'crypto'
import { VIP_PRODUCTS, POINTS_PRODUCTS, ProductType } from '@/types'

// VIP 价格配置（单位：分）
export const VIP_PRICES: Record<string, number> = {
  VIP_1: 199,    // 1天VIP 1.99 元
  VIP_3: 499,    // 3天VIP 4.99 元
  VIP_7: 999,    // 7天VIP 9.99 元
  VIP_30: 2999,  // 30天VIP 29.99 元
}

// VIP 时长配置（天数）
export const VIP_DURATION: Record<string, number> = {
  VIP_1: 1,
  VIP_3: 3,
  VIP_7: 7,
  VIP_30: 30,
}

// 点数卡价格配置（单位：分）
export const POINTS_PRICES: Record<string, number> = {
  POINTS_10: 99,     // 10点数 0.99 元
  POINTS_50: 399,    // 50点数 3.99 元
  POINTS_100: 699,   // 100点数 6.99 元
  POINTS_500: 2999,  // 500点数 29.99 元
}

// 点数卡数量配置
export const POINTS_AMOUNT: Record<string, number> = {
  POINTS_10: 10,
  POINTS_50: 50,
  POINTS_100: 100,
  POINTS_500: 500,
}

// 产品显示名称
export const PRODUCT_NAMES: Record<string, string> = {
  VIP_1: '1天VIP会员',
  VIP_3: '3天VIP会员',
  VIP_7: '7天VIP会员',
  VIP_30: '30天VIP会员',
  POINTS_10: '10点数',
  POINTS_50: '50点数',
  POINTS_100: '100点数',
  POINTS_500: '500点数',
}

// 获取产品价格
export function getProductPrice(productType: string): number {
  return VIP_PRICES[productType] || POINTS_PRICES[productType] || 0
}

// 获取产品名称
export function getProductName(productType: string): string {
  return PRODUCT_NAMES[productType] || '未知产品'
}

// 判断是否是 VIP 产品
export function isVipProduct(productType: string): boolean {
  return productType.startsWith('VIP_')
}

// 判断是否是点数产品
export function isPointsProduct(productType: string): boolean {
  return productType.startsWith('POINTS_')
}

// 兼容旧的会员配置（已废弃）
export const MEMBER_PRICES = {
  DAY: 199,
  MONTH: 999,
  YEAR: 4999,
} as const

export const MEMBER_DURATION = {
  DAY: 1,
  MONTH: 30,
  YEAR: 365,
} as const

export const MEMBER_NAMES = {
  DAY: '日卡会员',
  MONTH: '月卡会员',
  YEAR: '年卡会员',
} as const

// 生成订单号
export function generateOrderNo(): string {
  const now = new Date()
  const timestamp = now.getFullYear().toString() +
    (now.getMonth() + 1).toString().padStart(2, '0') +
    now.getDate().toString().padStart(2, '0') +
    now.getHours().toString().padStart(2, '0') +
    now.getMinutes().toString().padStart(2, '0') +
    now.getSeconds().toString().padStart(2, '0')
  const random = Math.random().toString(36).substring(2, 8).toUpperCase()
  return `XHS${timestamp}${random}`
}

// 计算 VIP 到期时间
export function calculateVipExpireDate(
  days: number,
  currentExpire?: Date | null
): Date {
  const now = new Date()
  // 如果当前 VIP 未过期，从当前到期时间延长
  const baseDate = currentExpire && currentExpire > now ? currentExpire : now
  const expire = new Date(baseDate)
  expire.setDate(expire.getDate() + days)
  return expire
}

// 兼容旧接口
export function calculateExpireDate(
  memberType: 'DAY' | 'MONTH' | 'YEAR',
  currentExpire?: Date | null
): Date {
  const days = MEMBER_DURATION[memberType]
  return calculateVipExpireDate(days, currentExpire)
}

// ========== 支付宝相关 ==========

// 支付宝配置
export const ALIPAY_CONFIG = {
  appId: process.env.ALIPAY_APP_ID || '',
  privateKey: process.env.ALIPAY_PRIVATE_KEY || '',
  alipayPublicKey: process.env.ALIPAY_PUBLIC_KEY || '',
  gateway: 'https://openapi.alipay.com/gateway.do',
  notifyUrl: process.env.ALIPAY_NOTIFY_URL || '',
  returnUrl: process.env.ALIPAY_RETURN_URL || '',
}

// 支付宝签名
function alipaySign(params: Record<string, string>, privateKey: string): string {
  const sortedParams = Object.keys(params)
    .filter(key => params[key] !== '' && params[key] !== undefined)
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join('&')

  const sign = crypto.createSign('RSA-SHA256')
  sign.update(sortedParams)
  return sign.sign(privateKey, 'base64')
}

// 支付宝验签
export function alipayVerify(params: Record<string, string>, publicKey: string): boolean {
  const sign = params.sign
  const signType = params.sign_type
  if (!sign) return false

  const sortedParams = Object.keys(params)
    .filter(key => key !== 'sign' && key !== 'sign_type' && params[key] !== '')
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join('&')

  const verify = crypto.createVerify(signType === 'RSA2' ? 'RSA-SHA256' : 'RSA-SHA1')
  verify.update(sortedParams)

  // 格式化公钥
  const formattedKey = publicKey.includes('-----BEGIN')
    ? publicKey
    : `-----BEGIN PUBLIC KEY-----\n${publicKey}\n-----END PUBLIC KEY-----`

  return verify.verify(formattedKey, sign, 'base64')
}

// 创建支付宝支付链接
export function createAlipayUrl(
  orderNo: string,
  amount: number,
  subject: string
): string {
  const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19)

  const bizContent = JSON.stringify({
    out_trade_no: orderNo,
    total_amount: (amount / 100).toFixed(2),
    subject: subject,
    product_code: 'FAST_INSTANT_TRADE_PAY',
  })

  const params: Record<string, string> = {
    app_id: ALIPAY_CONFIG.appId,
    method: 'alipay.trade.page.pay',
    format: 'JSON',
    return_url: ALIPAY_CONFIG.returnUrl,
    charset: 'utf-8',
    sign_type: 'RSA2',
    timestamp: timestamp,
    version: '1.0',
    notify_url: ALIPAY_CONFIG.notifyUrl,
    biz_content: bizContent,
  }

  // 格式化私钥
  const privateKey = ALIPAY_CONFIG.privateKey.includes('-----BEGIN')
    ? ALIPAY_CONFIG.privateKey
    : `-----BEGIN PRIVATE KEY-----\n${ALIPAY_CONFIG.privateKey}\n-----END PRIVATE KEY-----`

  params.sign = alipaySign(params, privateKey)

  const queryString = Object.keys(params)
    .map(key => `${key}=${encodeURIComponent(params[key])}`)
    .join('&')

  return `${ALIPAY_CONFIG.gateway}?${queryString}`
}

// ========== 微信支付相关 ==========

// 微信支付配置
export const WECHAT_CONFIG = {
  appId: process.env.WECHAT_APP_ID || '',
  mchId: process.env.WECHAT_MCH_ID || '',
  apiKey: process.env.WECHAT_API_KEY || '',
  apiV3Key: process.env.WECHAT_API_V3_KEY || '',
  serialNo: process.env.WECHAT_SERIAL_NO || '',
  privateKey: process.env.WECHAT_PRIVATE_KEY || '',
  platformPublicKey: process.env.WECHAT_PLATFORM_PUBLIC_KEY || '',
  notifyUrl: process.env.WECHAT_NOTIFY_URL || '',
}

// 微信支付签名 (V3)
function wechatSign(message: string, privateKey: string): string {
  const sign = crypto.createSign('RSA-SHA256')
  sign.update(message)
  const formattedKey = privateKey.includes('-----BEGIN')
    ? privateKey
    : `-----BEGIN PRIVATE KEY-----\n${privateKey}\n-----END PRIVATE KEY-----`
  return sign.sign(formattedKey, 'base64')
}

// 生成随机字符串
function generateNonceStr(length = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

// 创建微信支付订单 (Native 扫码支付)
export async function createWechatNativeOrder(
  orderNo: string,
  amount: number,
  description: string
): Promise<{ codeUrl: string } | { error: string }> {
  const timestamp = Math.floor(Date.now() / 1000).toString()
  const nonceStr = generateNonceStr()

  const body = {
    appid: WECHAT_CONFIG.appId,
    mchid: WECHAT_CONFIG.mchId,
    description: description,
    out_trade_no: orderNo,
    notify_url: WECHAT_CONFIG.notifyUrl,
    amount: {
      total: amount,
      currency: 'CNY',
    },
  }

  const url = '/v3/pay/transactions/native'
  const method = 'POST'
  const bodyStr = JSON.stringify(body)

  // 构建签名串
  const signMessage = `${method}\n${url}\n${timestamp}\n${nonceStr}\n${bodyStr}\n`
  const signature = wechatSign(signMessage, WECHAT_CONFIG.privateKey)

  // 构建 Authorization
  const authorization = `WECHATPAY2-SHA256-RSA2048 mchid="${WECHAT_CONFIG.mchId}",nonce_str="${nonceStr}",timestamp="${timestamp}",serial_no="${WECHAT_CONFIG.serialNo}",signature="${signature}"`

  try {
    const response = await fetch('https://api.mch.weixin.qq.com/v3/pay/transactions/native', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': authorization,
      },
      body: bodyStr,
    })

    const data = await response.json()

    if (response.ok && data.code_url) {
      return { codeUrl: data.code_url }
    } else {
      return { error: data.message || '创建支付订单失败' }
    }
  } catch (error) {
    console.error('Wechat pay error:', error)
    return { error: '微信支付请求失败' }
  }
}

// 微信支付回调验签
export function wechatVerifySign(
  timestamp: string,
  nonce: string,
  body: string,
  signature: string,
  publicKey: string
): boolean {
  const message = `${timestamp}\n${nonce}\n${body}\n`
  const verify = crypto.createVerify('RSA-SHA256')
  verify.update(message)

  const formattedKey = publicKey.includes('-----BEGIN')
    ? publicKey
    : `-----BEGIN PUBLIC KEY-----\n${publicKey}\n-----END PUBLIC KEY-----`

  return verify.verify(formattedKey, signature, 'base64')
}

// 微信支付回调解密
export function wechatDecryptResource(
  ciphertext: string,
  associatedData: string,
  nonce: string,
  apiV3Key: string
): string {
  const key = Buffer.from(apiV3Key, 'utf8')
  const iv = Buffer.from(nonce, 'utf8')
  const authTag = Buffer.from(ciphertext.slice(-16), 'base64')
  const data = Buffer.from(ciphertext.slice(0, -16), 'base64')

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(authTag)
  decipher.setAAD(Buffer.from(associatedData, 'utf8'))

  let decrypted = decipher.update(data, undefined, 'utf8')
  decrypted += decipher.final('utf8')

  return decrypted
}
