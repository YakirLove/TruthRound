import type { IncomingMessage, ServerResponse } from 'node:http'
import presets from '../shared/ai-presets.json'
export interface AICommand {
  mode: keyof typeof presets
  sessionId: string
  requestId: string
  payload: unknown
}
export function validCommand(value: unknown): value is AICommand {
  if (!value || typeof value !== 'object') return false
  const v = value as AICommand
  return (
    Object.hasOwn(presets, v.mode) &&
    typeof v.sessionId === 'string' &&
    typeof v.requestId === 'string' &&
    !!v.payload &&
    typeof v.payload === 'object'
  )
}
export function aiBody(request: AICommand) {
  const preset = presets[request.mode]
  return {
    model: preset.model,
    max_tokens: preset.max_tokens,
    temperature: preset.temperature,
    thinking: { type: 'disabled' },
    ...(request.mode !== 'roleplay'
      ? { response_format: { type: 'json_object' } }
      : {}),
    messages: [
      { role: 'system', content: preset.system },
      { role: 'user', content: JSON.stringify(request.payload) },
    ],
  }
}
export function localAI(
  apiKey: string | undefined,
  fetcher: typeof fetch = fetch,
) {
  return async (
    req: IncomingMessage,
    res: ServerResponse,
    next: () => void,
  ) => {
    if (!req.url?.startsWith('/api/')) {
      next()
      return
    }
    const send = (status: number, value: unknown) => {
      if (!res.destroyed) {
        res.writeHead(status, {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
        })
        res.end(JSON.stringify(value))
      }
    }
    const host = req.headers.host || ''
    if (
      !/^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(host) ||
      (req.headers.origin && req.headers.origin !== 'http://' + host)
    ) {
      send(403, { error: '仅允许本机访问' })
      return
    }
    if (req.url === '/api/health' && req.method === 'GET') {
      send(200, { configured: !!apiKey, provider: 'DeepSeek' })
      return
    }
    if (req.url !== '/api/ai' || req.method !== 'POST') {
      send(404, { error: '接口不存在' })
      return
    }
    if (!apiKey) {
      send(503, {
        error: '请在项目 .env 中配置 DEEPSEEK_API_KEY，然后重新启动网页服务。',
      })
      return
    }
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 60000)
    res.on('close', () => controller.abort())
    try {
      let body = ''
      req.setEncoding('utf8')
      for await (const chunk of req) {
        body += chunk.toString()
        if (Buffer.byteLength(body) > 512000) {
          send(413, { error: '请求过大' })
          return
        }
      }
      let request: unknown
      try {
        request = JSON.parse(body)
      } catch {
        send(400, { error: '请求格式错误' })
        return
      }
      if (!validCommand(request)) {
        send(400, { error: '请求参数错误' })
        return
      }
      const response = await fetcher(
        'https://api.deepseek.com/chat/completions',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + apiKey,
          },
          body: JSON.stringify(aiBody(request)),
          signal: controller.signal,
        },
      )
      if (!response.ok) {
        send(502, {
          error:
            response.status === 401
              ? 'AI 密钥无效，请检查连接设置。'
              : 'AI 服务暂时不可用（' + response.status + '），请稍后重试。',
        })
        return
      }
      const value = (await response.json()) as {
        choices?: { message?: { content?: string } }[]
      }
      const content = value?.choices?.[0]?.message?.content
      if (typeof content !== 'string' || !content.trim()) {
        send(502, { error: 'AI 未返回有效内容，请重试。' })
        return
      }
      send(200, {
        content,
        model: presets[request.mode].model,
        sessionId: request.sessionId,
        requestId: request.requestId,
      })
    } catch {
      send(502, {
        error: controller.signal.aborted
          ? '请求已取消或超时，可以重试。'
          : '无法连接 AI，请检查网络后重试。',
      })
    } finally {
      clearTimeout(timer)
    }
  }
}
