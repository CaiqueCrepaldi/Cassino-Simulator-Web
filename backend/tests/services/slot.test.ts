import { describe, it, expect } from 'vitest'
import { spin, SYMBOLS } from '../../src/services/slot.js'

describe('Slot Machine Service', () => {
  it('returns three reel indices in range [0, 2]', () => {
    for (let i = 0; i < 50; i++) {
      const { reels } = spin(10)
      expect(reels).toHaveLength(3)
      reels.forEach(r => expect(r).toBeGreaterThanOrEqual(0))
      reels.forEach(r => expect(r).toBeLessThanOrEqual(SYMBOLS.length - 1))
    }
  })

  it('marks win=true only when all three reels match', () => {
    for (let i = 0; i < 200; i++) {
      const res = spin(10)
      const allMatch = res.reels[0] === res.reels[1] && res.reels[1] === res.reels[2]
      expect(res.win).toBe(allMatch)
    }
  })

  it('prize is bet × multiplier on a win', () => {
    for (let i = 0; i < 200; i++) {
      const bet = 20
      const res = spin(bet)
      if (res.win) {
        expect(res.prize).toBe(bet * SYMBOLS[res.reels[0]].mult)
      } else {
        expect(res.prize).toBe(0)
      }
    }
  })

  it('prize is 0 on a loss', () => {
    for (let i = 0; i < 200; i++) {
      const res = spin(10)
      if (!res.win) expect(res.prize).toBe(0)
    }
  })
})
