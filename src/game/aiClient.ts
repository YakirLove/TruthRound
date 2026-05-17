import { invoke } from '@tauri-apps/api/core'
import { recordInterfaceLog } from '../store/interfaceLogStore'
import { demoCase } from './cases'
import { buildAI1Payload, buildAI2Payload, buildEvidenceCheckPayload, redactSpoilers } from './logic'
import type { AIRequest, AIResponse } from './types'

function isTauriRuntime() {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

export async function requestAI(request: AIRequest, useMock: boolean): Promise<AIResponse> {
  if (useMock || !isTauriRuntime()) {
    const startedAt = performance.now()
    const response = {
      content: '',
      model: useMock ? 'mock-disabled' : 'tauri-required',
      error: useMock
        ? 'Mock AI 已禁用。请使用 DeepSeek 真实请求。'
        : '真实 AI 请求需要在 Tauri 桌面端运行，浏览器预览不能直接访问后端命令。',
    }
    recordInterfaceLog({
      interfaceName: useMock ? 'ai.mock.disabled' : 'tauri.runtime.missing',
      mode: request.mode,
      provider: useMock ? 'mock' : 'tauri',
      status: 'error',
      startedAt,
      endedAt: performance.now(),
      request,
      response,
      error: response.error,
    })
    return response
  }

  const payload =
    request.mode === 'roleplay'
      ? buildAI1Payload({
          caseDefinition: demoCase,
          characterId: request.characterId || '',
          playerQuestion: request.playerQuestion || '',
          quotedTurn: request.quotedTurn,
          conversationHistory: request.conversationHistory,
        })
      : request.mode === 'assistant_summary'
        ? buildAI2Payload({
            caseDefinition: demoCase,
            conversationHistory: request.conversationHistory,
            revealedEvidenceIds: request.revealedEvidenceIds,
            discoveredEvidenceIds: request.discoveredEvidenceIds,
          })
        : buildEvidenceCheckPayload({
            caseDefinition: demoCase,
            conversationHistory: request.conversationHistory,
            revealedEvidenceIds: request.revealedEvidenceIds,
            discoveredEvidenceIds: request.discoveredEvidenceIds,
          })

  const startedAt = performance.now()

  try {
    const response = await invoke<AIResponse>('ask_deepseek', {
      request: {
        mode: request.mode,
        payload,
      },
    })
    const safeResponse = request.mode === 'assistant_summary' ? { ...response, content: redactSpoilers(response.content) } : response

    recordInterfaceLog({
      interfaceName: 'tauri.ask_deepseek',
      mode: request.mode,
      provider: 'deepseek',
      status: 'success',
      startedAt,
      endedAt: performance.now(),
      request: {
        mode: request.mode,
        payload,
      },
      response: safeResponse,
    })

    return safeResponse
  } catch (error) {
    const errorResponse = {
      content: '',
      model: 'deepseek',
      error: error instanceof Error ? error.message : String(error),
    }

    recordInterfaceLog({
      interfaceName: 'tauri.ask_deepseek',
      mode: request.mode,
      provider: 'deepseek',
      status: 'error',
      startedAt,
      endedAt: performance.now(),
      request: {
        mode: request.mode,
        payload,
      },
      response: errorResponse,
      error: errorResponse.error,
    })

    return errorResponse
  }
}
