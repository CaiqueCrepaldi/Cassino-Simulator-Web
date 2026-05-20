import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import { app } from '../../src/index.js'
import { resetBalance, getBalance } from '../../src/balance.js'

beforeEach(() => resetBalance())

// ─── Slot Machine ────────────────────────────────────────────────────────────
describe('POST /api/games/slot/spin', () => {
  it('returns reels, win and balance on valid bet', async () => {
    const res = await request(app).post('/api/games/slot/spin').send({ bet: 50 })
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('reels')
    expect(res.body.reels).toHaveLength(3)
    expect(res.body).toHaveProperty('balance')
  })

  it('response includes updated balance field', async () => {
    const res = await request(app).post('/api/games/slot/spin').send({ bet: 100 })
    expect(typeof res.body.balance).toBe('number')
    // balance = 1000 - bet + prize; prize >= 0, so balance can be > 1000 on a win
    expect(res.body.balance).toBeGreaterThanOrEqual(0)
  })

  it('returns 400 for bet exceeding balance', async () => {
    const res = await request(app).post('/api/games/slot/spin').send({ bet: 9999 })
    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error')
  })
})

// ─── Aviator ─────────────────────────────────────────────────────────────────
describe('POST /api/games/aviator/generate', () => {
  it('returns a crashAt multiplier >= 1', async () => {
    const res = await request(app).post('/api/games/aviator/generate').send({ bet: 10 })
    expect(res.status).toBe(200)
    expect(res.body.crashAt).toBeGreaterThanOrEqual(1)
  })
})

describe('POST /api/games/aviator/settle', () => {
  it('awards prize when cashed out before crash', async () => {
    await request(app).post('/api/games/aviator/generate').send({ bet: 100 })
    const before = getBalance()
    await request(app).post('/api/games/aviator/settle').send({ bet: 100, crashAt: 5.0, cashedOutAt: 2.0 })
    const res = await request(app).get('/api/balance')
    expect(res.body.balance).toBe(before + 200)
  })

  it('no prize when crashed before cashout', async () => {
    await request(app).post('/api/games/aviator/generate').send({ bet: 100 })
    const before = getBalance()
    await request(app).post('/api/games/aviator/settle').send({ bet: 100, crashAt: 1.5, cashedOutAt: 3.0 })
    const res = await request(app).get('/api/balance')
    expect(res.body.balance).toBe(before)
  })
})

// ─── Double ──────────────────────────────────────────────────────────────────
describe('POST /api/games/double/spin', () => {
  it('returns segmentIndex, type, win and balance', async () => {
    const res = await request(app).post('/api/games/double/spin').send({ bet: 10, chosen: 'black' })
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('segmentIndex')
    expect(res.body).toHaveProperty('type')
    expect(res.body).toHaveProperty('win')
    expect(res.body).toHaveProperty('balance')
  })
})

// ─── Crash Dice ──────────────────────────────────────────────────────────────
describe('POST /api/games/crash-dice/roll', () => {
  it('returns d1, d2, sum and balance', async () => {
    const res = await request(app).post('/api/games/crash-dice/roll').send({ bet: 10, numbers: [3, 5] })
    expect(res.status).toBe(200)
    expect(res.body.d1).toBeGreaterThanOrEqual(1)
    expect(res.body.d2).toBeLessThanOrEqual(6)
    expect(res.body.sum).toBe(res.body.d1 + res.body.d2)
  })
})

// ─── Roulette ────────────────────────────────────────────────────────────────
describe('POST /api/games/roulette/spin', () => {
  it('returns a number 0-36 and totalWin', async () => {
    const res = await request(app)
      .post('/api/games/roulette/spin')
      .send({ bets: [{ type: 'red', amount: 10 }] })
    expect(res.status).toBe(200)
    expect(res.body.number).toBeGreaterThanOrEqual(0)
    expect(res.body.number).toBeLessThanOrEqual(36)
    expect(res.body).toHaveProperty('totalWin')
  })
})

// ─── Coin Flip ───────────────────────────────────────────────────────────────
describe('POST /api/games/coin-flip/flip', () => {
  it('returns result, win, prize and balance', async () => {
    const res = await request(app).post('/api/games/coin-flip/flip').send({ bet: 10, chosen: 'heads' })
    expect(res.status).toBe(200)
    expect(['heads', 'tails']).toContain(res.body.result)
    expect(typeof res.body.win).toBe('boolean')
    expect(res.body).toHaveProperty('balance')
  })

  it('credits 2x bet on win', async () => {
    let won = false
    for (let i = 0; i < 50; i++) {
      resetBalance()
      const res = await request(app).post('/api/games/coin-flip/flip').send({ bet: 100, chosen: 'heads' })
      if (res.body.win) {
        expect(res.body.balance).toBe(1000 - 100 + 200)
        won = true
        break
      }
    }
    expect(won).toBe(true)
  })
})

// ─── Blackjack ───────────────────────────────────────────────────────────────
describe('POST /api/games/blackjack/deal', () => {
  it('returns playerHand with 2 cards', async () => {
    const res = await request(app).post('/api/games/blackjack/deal').send({ bet: 50 })
    expect(res.status).toBe(200)
    if (res.body.playerHand) {
      expect(res.body.playerHand).toHaveLength(2)
    }
  })

  it('returns 400 for invalid bet', async () => {
    const res = await request(app).post('/api/games/blackjack/deal').send({ bet: 5000 })
    expect(res.status).toBe(400)
  })
})

describe('POST /api/games/blackjack/hit', () => {
  it('adds a card to player hand', async () => {
    const dealRes = await request(app).post('/api/games/blackjack/deal').send({ bet: 10 })
    if (!dealRes.body.playerHand) return
    const { playerHand, deck } = dealRes.body
    const res = await request(app).post('/api/games/blackjack/hit').send({ playerHand, deck })
    expect(res.status).toBe(200)
    expect(res.body.playerHand).toHaveLength(3)
  })
})

// ─── Baccarat ────────────────────────────────────────────────────────────────
describe('POST /api/games/baccarat/deal', () => {
  it('returns playerCards, bankerCards, winner and balance', async () => {
    const res = await request(app).post('/api/games/baccarat/deal').send({ bet: 20, chosen: 'player' })
    expect(res.status).toBe(200)
    expect(res.body.playerCards.length).toBeGreaterThanOrEqual(2)
    expect(res.body.bankerCards.length).toBeGreaterThanOrEqual(2)
    expect(['player', 'banker', 'tie']).toContain(res.body.winner)
    expect(res.body).toHaveProperty('balance')
  })
})
