import { request as httpRequest, createServer } from 'node:http'
import { afterEach, describe, expect, it } from 'vitest'
import { localAI, type AICommand } from './ai'
const servers: ReturnType<typeof createServer>[] = []
afterEach(async () => {
  await Promise.all(
    servers
      .splice(0)
      .map((s) => new Promise<void>((resolve) => s.close(() => resolve()))),
  )
})
async function start(key: string | undefined, fetcher: typeof fetch = fetch) {
  const handler = localAI(key, fetcher)
  const server = createServer((req, res) => {
    void handler(req, res, () => {
      res.writeHead(404)
      res.end()
    })
  })
  servers.push(server)
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  return `http://127.0.0.1:${typeof address === 'object' && address ? address.port : 0}`
}
const command: AICommand = {
  mode: 'roleplay',
  sessionId: 's1',
  requestId: 'r1',
  payload: { playerQuestion: '你好' },
}
describe('local AI proxy', () => {
  it('reports missing configuration as an operation error without dialogue', async () => {
    const url = await start(undefined)
    expect(await (await fetch(url + '/api/health')).json()).toEqual({
      configured: false,
      provider: 'DeepSeek',
    })
    const r = await fetch(url + '/api/ai', {
      method: 'POST',
      body: JSON.stringify(command),
    })
    expect(r.status).toBe(503)
    expect(await r.text()).not.toContain('content')
  })
  it('uses the shared model, returns IDs, and keeps credentials out of responses', async () => {
    let body: Record<string, unknown> = {}
    const url = await start('private-key', async (_url, options) => {
      body = JSON.parse(String(options?.body))
      return new Response(
        JSON.stringify({ choices: [{ message: { content: '回答' } }] }),
      )
    })
    const r = await fetch(url + '/api/ai', {
      method: 'POST',
      body: JSON.stringify(command),
    })
    const value = await r.json()
    expect(value).toMatchObject({
      content: '回答',
      sessionId: 's1',
      requestId: 'r1',
    })
    expect(JSON.stringify(value)).not.toContain('private-key')
    expect(body.model).toBe('deepseek-v4-flash')
  })
  it('rejects invalid modes and cross-origin requests', async () => {
    const url = await start('key')
    expect(
      (
        await fetch(url + '/api/ai', {
          method: 'POST',
          body: JSON.stringify({ ...command, mode: 'unknown' }),
        })
      ).status,
    ).toBe(400)
    expect(
      (
        await fetch(url + '/api/ai', {
          method: 'POST',
          headers: { Origin: 'https://example.com' },
          body: JSON.stringify(command),
        })
      ).status,
    ).toBe(403)
  })
  it('sanitizes upstream errors', async () => {
    const url = await start(
      'private-key',
      async () => new Response('private-key upstream detail', { status: 401 }),
    )
    const r = await fetch(url + '/api/ai', {
      method: 'POST',
      body: JSON.stringify(command),
    })
    expect(await r.text()).not.toContain('private-key')
  })
})

it('decodes Chinese across HTTP chunk boundaries', async () => {
  let received = ''
  const url = await start('key', async (_url, options) => {
    received = String(options?.body)
    return new Response(
      JSON.stringify({ choices: [{ message: { content: '完成' } }] }),
    )
  })
  const body = Buffer.from(
    JSON.stringify({ ...command, payload: { playerQuestion: '包装纸' } }),
  )
  const split = body.indexOf(Buffer.from('包')) + 1
  await new Promise<void>((resolve, reject) => {
    const request = httpRequest(
      url + '/api/ai',
      { method: 'POST' },
      (response) => {
        response.resume()
        response.on('end', resolve)
      },
    )
    request.on('error', reject)
    request.write(body.subarray(0, split))
    setTimeout(() => request.end(body.subarray(split)), 5)
  })
  expect(received).toContain('包装纸')
  expect(received).not.toContain('�')
})
