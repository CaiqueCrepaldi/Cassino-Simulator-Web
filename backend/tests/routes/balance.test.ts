import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import { app } from '../../src/index.js'
import { resetBalance } from '../../src/balance.js'

beforeEach(() => resetBalance())

describe('GET /api/balance', () => {
  it('returns initial balance of 1000', async () => {
    const res = await request(app).get('/api/balance')
    expect(res.status).toBe(200)
    expect(res.body.balance).toBe(1000)
  })
})

describe('POST /api/balance/reset', () => {
  it('resets balance to 1000', async () => {
    await request(app).post('/api/games/coin-flip/flip').send({ bet: 200, chosen: 'heads' })
    const res = await request(app).post('/api/balance/reset')
    expect(res.status).toBe(200)
    expect(res.body.balance).toBe(1000)
  })
})
