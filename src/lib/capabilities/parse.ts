/**
 * AI 返回内容的 JSON 解析工具
 *
 * 复用现有 /api/generate 中经过实战验证的容错策略：
 * 1. 直接 JSON.parse
 * 2. 失败则用正则从文本中提取第一段 {...} 再 parse
 * 3. 仍失败则抛出错误，由调用方统一处理
 */

/**
 * 从 AI 原始响应中稳健地解析出 JSON 对象。
 * @param raw AI 返回的原始字符串
 * @returns 解析后的对象
 * @throws 当无法解析出合法 JSON 时抛出 Error
 */
export function parseJsonFromAiResponse(raw: string): unknown {
  // 优先直接解析
  try {
    return JSON.parse(raw)
  } catch {
    // 回退：提取第一段花括号包裹的 JSON（兼容 AI 附带说明文字的情况）
    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) {
      throw new Error('AI 响应中未找到 JSON')
    }
    try {
      return JSON.parse(match[0])
    } catch (err) {
      throw new Error(`AI 响应 JSON 提取失败: ${err instanceof Error ? err.message : String(err)}`)
    }
  }
}
