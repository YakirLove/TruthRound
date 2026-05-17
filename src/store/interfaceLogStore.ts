import { create } from 'zustand'

export type InterfaceLogStatus = 'success' | 'error'
export type InterfaceProvider = 'mock' | 'deepseek' | 'tauri'

export interface InterfaceLogEntry {
  id: string
  interfaceName: string
  mode: string
  provider: InterfaceProvider
  status: InterfaceLogStatus
  timestamp: string
  durationMs: number
  request: unknown
  response?: unknown
  error?: string
}

export interface CreateInterfaceLogEntryInput {
  interfaceName: string
  mode: string
  provider: InterfaceProvider
  status: InterfaceLogStatus
  startedAt: number
  endedAt: number
  request: unknown
  response?: unknown
  error?: string
}

interface InterfaceLogState {
  entries: InterfaceLogEntry[]
  addEntry: (entry: InterfaceLogEntry) => void
  clearEntries: () => void
}

const secretKeyPattern = /(api[-_]?key|token|authorization|secret|password)/i

export function sanitizeForLog<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeForLog(item)) as T
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        secretKeyPattern.test(key) ? '[redacted]' : sanitizeForLog(item),
      ]),
    ) as T
  }

  return value
}

export function createInterfaceLogEntry(input: CreateInterfaceLogEntryInput): InterfaceLogEntry {
  return {
    id: `${input.interfaceName}-${input.startedAt}-${Math.random().toString(36).slice(2)}`,
    interfaceName: input.interfaceName,
    mode: input.mode,
    provider: input.provider,
    status: input.status,
    timestamp: new Date(input.startedAt).toISOString(),
    durationMs: Math.max(0, Math.round(input.endedAt - input.startedAt)),
    request: sanitizeForLog(input.request),
    response: sanitizeForLog(input.response),
    error: input.error,
  }
}

export const useInterfaceLogStore = create<InterfaceLogState>((set) => ({
  entries: [],
  addEntry: (entry) =>
    set((state) => ({
      entries: [entry, ...state.entries].slice(0, 80),
    })),
  clearEntries: () => set({ entries: [] }),
}))

export function isInterfaceLoggingEnabled() {
  return import.meta.env.DEV || import.meta.env.MODE === 'test'
}

export function recordInterfaceLog(input: CreateInterfaceLogEntryInput) {
  if (!isInterfaceLoggingEnabled()) {
    return
  }

  useInterfaceLogStore.getState().addEntry(createInterfaceLogEntry(input))
}
