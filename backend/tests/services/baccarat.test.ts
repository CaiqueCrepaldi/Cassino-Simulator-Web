import { describe, it, expect } from 'vitest'
import { deal, handScore } from '../../src/services/baccarat.js'
import type { Card } from '../../src/services/baccarat.js'

describe('Baccarat — handScore', () => {
  it('score is last digit of sum (mod 10)', () => {
    const hand: Card[] = [{ rank: '9', suit: '♠' }, { rank: '7', suit: '♥' }]
    expect(handScore(hand)).toBe(6) // 9+7=16 → 6
  })

  it('A counts as 1', () => {
    const hand: Card[] = [{ rank: 'A', suit: '♠' }, { rank: '8', suit: '♥' }]
    expect(handScore(hand)).toBe(9)
  })

  it('10/J/Q/K count as 0', () => {
    const hand: Card[] = [{ rank: 'K', suit: '♠' }, { rank: '5', suit: '♥' }]
    expect(handScore(hand)).toBe(5)
  })
})

describe('Baccarat — deal', () => {
  it('both player and banker get at least 2 cards', () => {
    for (let i = 0; i < 20; i++) {
      const res = deal(10, 'player')
      expect(res.playerCards.length).toBeGreaterThanOrEqual(2)
      expect(res.bankerCards.length).toBeGreaterThanOrEqual(2)
    }
  })

  it('winner is player, banker or tie', () => {
    for (let i = 0; i < 50; i++) {
      const res = deal(10, 'player')
      expect(['player', 'banker', 'tie']).toContain(res.winner)
    }
  })

  it('player bet returns 2x prize on win', () => {
    for (let i = 0; i < 200; i++) {
      const res = deal(50, 'player')
      if (res.winner === 'player') {
        expect(res.prize).toBe(100)
        break
      }
    }
  })

  it('banker bet pays 0.95x on win', () => {
    for (let i = 0; i < 200; i++) {
      const res = deal(100, 'banker')
      if (res.winner === 'banker') {
        expect(res.prize).toBeCloseTo(195)
        break
      }
    }
  })

  it('tie bet returns 9x', () => {
    for (let i = 0; i < 500; i++) {
      const res = deal(10, 'tie')
      if (res.winner === 'tie') {
        expect(res.prize).toBe(90)
        break
      }
    }
  })

  it('score is in range 0-9', () => {
    for (let i = 0; i < 50; i++) {
      const res = deal(10, 'player')
      expect(res.playerScore).toBeGreaterThanOrEqual(0)
      expect(res.playerScore).toBeLessThanOrEqual(9)
      expect(res.bankerScore).toBeGreaterThanOrEqual(0)
      expect(res.bankerScore).toBeLessThanOrEqual(9)
    }
  })
})
