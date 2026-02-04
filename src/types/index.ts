// 内容类型
export type ContentType = 'zhongcao' | 'tutorial' | 'life'

// 垂类
export type Category = 'beauty' | 'food' | 'fashion' | 'travel' | 'fitness' | 'tech' | 'home' | 'pet' | 'general'

// AI 提供商
export type AIProvider = 'openai' | 'claude' | 'deepseek' | 'zhipu'

// 文案风格
export type Style = 'lively' | 'professional' | 'warm' | 'humorous' | 'literary'

// 生成请求
export interface GenerateRequest {
  contentType: ContentType
  category?: Category
  topic: string
  keywords?: string
  style?: Style
  aiProvider: AIProvider
  count?: number // 生成数量
}

// 生成结果
export interface GenerateResult {
  title: string
  content: string
  tags: string[]
  coverText?: string
}

// 用户会话
export interface UserSession {
  id: string
  phone?: string
  email?: string
  nickname?: string
  memberType: 'FREE' | 'VIP'
  memberExpire?: Date
  points: number              // 购买/兑换的点数（永久有效）
  dailyFreeUsed: number       // 今日已使用的免费点数
  dailyFreeLimit: number      // 每日免费点数上限
  isVip: boolean              // 是否是有效 VIP
}

// VIP 套餐产品
export interface VipProduct {
  type: 'VIP_1' | 'VIP_3' | 'VIP_7' | 'VIP_30'
  name: string
  price: number // 分
  originalPrice?: number
  days: number
  dailyFreeLimit: number // 每日免费次数
}

// 点数卡产品
export interface PointsProduct {
  type: 'POINTS_10' | 'POINTS_50' | 'POINTS_100' | 'POINTS_500'
  name: string
  price: number // 分
  originalPrice?: number
  points: number
}

// 所有产品类型
export type ProductType = VipProduct['type'] | PointsProduct['type']

export const VIP_PRODUCTS: VipProduct[] = [
  { type: 'VIP_1', name: '1天VIP', price: 199, days: 1, dailyFreeLimit: 13 },
  { type: 'VIP_3', name: '3天VIP', price: 499, originalPrice: 597, days: 3, dailyFreeLimit: 13 },
  { type: 'VIP_7', name: '7天VIP', price: 999, originalPrice: 1393, days: 7, dailyFreeLimit: 13 },
  { type: 'VIP_30', name: '30天VIP', price: 2999, originalPrice: 5970, days: 30, dailyFreeLimit: 13 },
]

export const POINTS_PRODUCTS: PointsProduct[] = [
  { type: 'POINTS_10', name: '10点数', price: 99, points: 10 },
  { type: 'POINTS_50', name: '50点数', price: 399, originalPrice: 495, points: 50 },
  { type: 'POINTS_100', name: '100点数', price: 699, originalPrice: 990, points: 100 },
  { type: 'POINTS_500', name: '500点数', price: 2999, originalPrice: 4950, points: 500 },
]

// 兼容旧的 PayProduct 类型（已废弃）
export interface PayProduct {
  type: 'DAY' | 'MONTH' | 'YEAR'
  name: string
  price: number
  originalPrice?: number
  days: number
}

export const PAY_PRODUCTS: PayProduct[] = [
  { type: 'DAY', name: '日卡', price: 990, days: 1 },
  { type: 'MONTH', name: '月卡', price: 2990, originalPrice: 9900, days: 30 },
  { type: 'YEAR', name: '年卡', price: 9900, originalPrice: 35880, days: 365 },
]

// 内容类型配置
export const CONTENT_TYPES: Record<ContentType, { name: string; desc: string }> = {
  zhongcao: { name: '种草笔记', desc: '产品推荐、好物分享' },
  tutorial: { name: '教程攻略', desc: '干货教学、经验分享' },
  life: { name: '生活日常', desc: '日常记录、情感分享' },
}

// 垂类配置
export const CATEGORIES: Record<Category, { name: string; emoji: string }> = {
  beauty: { name: '美妆护肤', emoji: '💄' },
  food: { name: '美食探店', emoji: '🍜' },
  fashion: { name: '穿搭时尚', emoji: '👗' },
  travel: { name: '旅行出游', emoji: '✈️' },
  fitness: { name: '健身运动', emoji: '💪' },
  tech: { name: '数码科技', emoji: '📱' },
  home: { name: '家居生活', emoji: '🏠' },
  pet: { name: '萌宠日常', emoji: '🐱' },
  general: { name: '通用', emoji: '✨' },
}

// 风格配置
export const STYLES: Record<Style, { name: string; desc: string }> = {
  lively: { name: '活泼俏皮', desc: '年轻有活力，emoji多' },
  professional: { name: '专业干货', desc: '有深度，数据支撑' },
  warm: { name: '温馨治愈', desc: '温暖亲切，有共鸣' },
  humorous: { name: '幽默搞笑', desc: '轻松有趣，段子手' },
  literary: { name: '文艺清新', desc: '文字优美，有意境' },
}

// AI 提供商配置
export const AI_PROVIDERS: Record<AIProvider, { name: string; model: string }> = {
  openai: { name: 'OpenAI', model: 'gpt-4o-mini' },
  claude: { name: 'Claude', model: 'claude-opus-4-5-20251101' },
  deepseek: { name: 'DeepSeek', model: 'deepseek-chat' },
  zhipu: { name: '智谱AI', model: 'glm-4-flash' },
}
