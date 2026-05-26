import { describe, it, expect } from 'vitest'
import { deal, handScore } from './baccarat.js'
import type { Card } from './baccarat.js'

describe('handScore', () => {
  const c = (rank: Card['rank']): Card => ({ rank, suit: '♠' })
  it('sums card values mod 10', () => {
    expect(handScore([c('5'), c('6')])).toBe(1)
    expect(handScore([c('9'), c('9')])).toBe(8)
  })
  it('treats face cards as 0', () => {
    expect(handScore([c('K'), c('Q')])).toBe(0)
    expect(handScore([c('J'), c('3')])).toBe(3)
  })
  it('treats Ace as 1', () => {
    expect(handScore([c('A'), c('A')])).toBe(2)
  })
})

describe('deal', () => {
  it('returns playerCards and bankerCards', () => {
    const r = deal(0, 'player')
    expect(r.playerCards.length).toBeGreaterThanOrEqual(2)
    expect(r.bankerCards.length).toBeGreaterThanOrEqual(2)
  })
  it('score matches cards', () => {
    const r = deal(0, 'player')
    expect(r.playerScore).toBe(handScore(r.playerCards))
    expect(r.bankerScore).toBe(handScore(r.bankerCards))
  })
  it('winner is correct', () => {
    const r = deal(0, 'player')
    if      (r.playerScore > r.bankerScore) expect(r.winner).toBe('player')
    else if (r.bankerScore > r.playerScore) expect(r.winner).toBe('banker')
    else                                    expect(r.winner).toBe('tie')
  })
  it('returns bet on tie when player/banker chosen', () => {
    for (let i = 0; i < 200; i++) {
      const r = deal(100, 'player')
      if (r.winner === 'tie') {
        expect(r.prize).toBe(100)
        expect(r.win).toBe(true)
      }
    }
  })
  it('player wins give 2× payout', () => {
    for (let i = 0; i < 500; i++) {
      const r = deal(100, 'player')
      if (r.winner === 'player') {
        expect(r.prize).toBe(200)
      }
    }
  })
})
