import { invoke } from '@tauri-apps/api/core'
import { getCaseDefinition } from './cases'
import {
  buildAI1Payload,
  buildAI2Payload,
  buildEvidenceCheckPayload,
} from './logic'
import type { AIRequest, AIResponse } from './types'
export const isTauriRuntime = () =>
  typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
export interface AITransport {
  request: (request: AIRequest, signal: AbortSignal) => Promise<AIResponse>
}
export function requestPayload(request: AIRequest) {
  const caseDefinition = getCaseDefinition(request.caseId)
  const input = { ...request, caseDefinition }
  return request.mode === 'roleplay'
    ? buildAI1Payload({
        ...input,
        characterId: request.characterId || '',
        playerQuestion: request.playerQuestion || '',
      })
    : request.mode === 'assistant_summary'
      ? buildAI2Payload(input)
      : buildEvidenceCheckPayload(input)
}
export const aiTransport: AITransport = {
  request: async (request, signal) => {
    const command = {
      mode: request.mode,
      sessionId: request.sessionId,
      requestId: request.requestId,
      payload: requestPayload(request),
    }
    const controller = new AbortController()
    const abort = () => {
      controller.abort()
      if (isTauriRuntime())
        void invoke('cancel_ai', { requestId: request.requestId }).catch(
          () => {},
        )
    }
    signal.addEventListener('abort', abort, { once: true })
    const timeout = setTimeout(abort, 65000)
    try {
      if (signal.aborted) throw new Error('请求已取消，可以重试。')
      const pending = isTauriRuntime()
        ? invoke<AIResponse>('ask_deepseek', { request: command })
        : fetch('/api/ai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(command),
            signal: controller.signal,
          }).then(async (r) => {
            const v = await r.json()
            if (!r.ok) throw new Error(v.error || 'AI 连接失败')
            return v as AIResponse
          })
      const response = await Promise.race([
        pending,
        new Promise<never>((_, reject) =>
          controller.signal.addEventListener(
            'abort',
            () => reject(new Error('请求已取消或超时，可以重试。')),
            { once: true },
          ),
        ),
      ])
      if (response.error || !response.content?.trim())
        throw new Error(response.error || 'AI 未返回有效内容')
      return response
    } catch (e) {
      throw new Error(
        controller.signal.aborted
          ? '请求已取消或超时，可以重试。'
          : e instanceof TypeError
            ? '连接中断，请检查网络和本地 AI 服务后重试。问题已保留。'
            : e instanceof Error
              ? e.message
              : String(e),
        { cause: e },
      )
    } finally {
      clearTimeout(timeout)
      signal.removeEventListener('abort', abort)
    }
  },
}
export async function connectionStatus(): Promise<{
  configured: boolean
  provider: string
}> {
  return isTauriRuntime()
    ? invoke('ai_status')
    : fetch('/api/health').then((r) => r.json())
}
export async function saveConnection(apiKey: string) {
  await invoke('save_ai_key', { apiKey })
}
