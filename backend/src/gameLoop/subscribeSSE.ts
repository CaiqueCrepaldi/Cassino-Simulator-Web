import type { Response } from 'express'

export function subscribeSSE<T>(res: Response, clients: Set<Response>, state: T) {
  res.setHeader('Content-Type',  'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection',    'keep-alive')
  res.flushHeaders()
  clients.add(res)
  res.write(`data: ${JSON.stringify(state)}\n\n`)
  const hb = setInterval(() => {
    try { res.write(': p\n\n') } catch { clearInterval(hb); clients.delete(res) }
  }, 20000)
  res.on('close', () => { clearInterval(hb); clients.delete(res) })
}
