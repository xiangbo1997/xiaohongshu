import { ContentType, Category, Style, CONTENT_TYPES, CATEGORIES, STYLES } from '@/types'

// 小红书爆款文案 Prompt 模板
export function buildPrompt(params: {
  contentType: ContentType
  category?: Category
  topic: string
  keywords?: string
  style?: Style
}): string {
  const { contentType, category, topic, keywords, style } = params

  const contentTypeInfo = CONTENT_TYPES[contentType]
  const categoryInfo = category ? CATEGORIES[category] : null
  const styleInfo = style ? STYLES[style] : STYLES.lively

  return `你是一位小红书爆款文案专家，精通小红书平台的内容创作规则和爆款密码。

## 任务
为以下主题创作一篇小红书${contentTypeInfo.name}：
- 主题：${topic}
${keywords ? `- 关键词：${keywords}` : ''}
${categoryInfo ? `- 领域：${categoryInfo.name}` : ''}
- 风格：${styleInfo.name}（${styleInfo.desc}）

## 小红书爆款文案规则

### 标题规则（必须遵守）
1. 字数控制在18-25字
2. 使用数字开头或包含数字（如"5个"、"3天"、"99%"）
3. 包含痛点词或利益点（如"绝了"、"后悔"、"必看"、"神器"）
4. 适当使用emoji点缀（1-3个）
5. 制造好奇心或紧迫感

### 正文规则
1. 开头：用1-2句话抓住注意力，可以是痛点共鸣或惊喜发现
2. 结构：分段清晰，每段2-4行，用emoji作为段落分隔
3. 语言：口语化、亲切感、像朋友聊天
4. 内容：${contentType === 'zhongcao' ? '突出产品亮点和使用体验' : contentType === 'tutorial' ? '步骤清晰，干货满满' : '真实感受，引发共鸣'}
5. 结尾：引导互动（点赞、收藏、关注、评论）

### 话题标签规则
1. 提供5-8个相关话题标签
2. 包含热门大标签和精准小标签
3. 格式：#话题名称

## 输出格式（严格按此JSON格式输出）
{
  "title": "标题内容",
  "content": "正文内容（使用\\n换行）",
  "tags": ["话题1", "话题2", "话题3", "话题4", "话题5"],
  "coverText": "封面文案（简短有力，适合做图片封面的文字）"
}

请直接输出JSON，不要有其他内容。`
}

// 多版本生成 Prompt
export function buildMultiVersionPrompt(params: {
  contentType: ContentType
  category?: Category
  topic: string
  keywords?: string
  style?: Style
  count: number
}): string {
  const basePrompt = buildPrompt(params)

  return `${basePrompt}

## 特别要求
请生成${params.count}个不同版本的文案，每个版本风格略有差异。

输出格式：
{
  "versions": [
    { "title": "...", "content": "...", "tags": [...], "coverText": "..." },
    { "title": "...", "content": "...", "tags": [...], "coverText": "..." }
  ]
}

请直接输出JSON，不要有其他内容。`
}
