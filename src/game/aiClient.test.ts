import { afterEach, expect, it, vi } from 'vitest'
import { aiTransport } from './aiClient'
import { demoCase } from './cases'
import type { AIRequest } from './types'

const request: AIRequest = {
  mode: 'roleplay',
  caseId: demoCase.id,
  characterId: 'lin',
  playerQuestion: '你在哪里？',
  conversationHistory: [],
  sessionId: 'session',
  requestId: 'request',
}
afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})
it('aborts a stalled transport at the timeout and provides a retry instruction', async () => {
  vi.useFakeTimers()
  let signal: AbortSignal | undefined
  vi.stubGlobal(
    'fetch',
    vi.fn((_url, options) => {
      signal = options.signal
      return new Promise(() => {})
    }),
  )
  const result = aiTransport.request(request, new AbortController().signal)
  const assertion = expect(result).rejects.toThrow('超时，可以重试')
  await vi.advanceTimersByTimeAsync(65000)
  await assertion
  expect(signal?.aborted).toBe(true)
})
it('turns browser network failures into an actionable connection message', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockRejectedValue(new TypeError('Failed to fetch')),
  )
  await expect(
    aiTransport.request(request, new AbortController().signal),
  ).rejects.toThrow('检查网络和本地 AI 服务')
})
