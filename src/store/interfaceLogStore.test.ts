import { describe, expect, it } from 'vitest'
import { createInterfaceLogEntry, sanitizeForLog } from './interfaceLogStore'

describe('interface log store helpers', () => {
  it('redacts secret-looking fields before storing interface payloads', () => {
    const sanitized = sanitizeForLog({
      Authorization: 'Bearer secret',
      DEEPSEEK_API_KEY: 'sk-secret',
      nested: {
        token: 'hidden',
        content: 'visible',
      },
    })

    expect(JSON.stringify(sanitized)).not.toContain('secret')
    expect(JSON.stringify(sanitized)).not.toContain('hidden')
    expect(sanitized).toMatchObject({
      Authorization: '[redacted]',
      DEEPSEEK_API_KEY: '[redacted]',
      nested: {
        token: '[redacted]',
        content: 'visible',
      },
    })
  })

  it('creates compact interface log entries with duration and status', () => {
    const entry = createInterfaceLogEntry({
      interfaceName: 'tauri.ask_deepseek',
      mode: 'roleplay',
      provider: 'deepseek',
      status: 'success',
      startedAt: 100,
      endedAt: 145,
      request: { playerQuestion: '你在哪里？' },
      response: { model: 'deepseek-v4-flash', content: '我在巷口。' },
    })

    expect(entry.interfaceName).toBe('tauri.ask_deepseek')
    expect(entry.durationMs).toBe(45)
    expect(entry.status).toBe('success')
    expect(entry.request).toMatchObject({ playerQuestion: '你在哪里？' })
  })
})
