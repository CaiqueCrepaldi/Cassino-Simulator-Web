import { describe, it, expect } from 'vitest'
import { flip } from '../../src/services/coinFlip.js'

describe('Coin Flip Service', () => {
  it('result is always heads or tails', () => {
    for (let i = 0; i < 100; i++) {
      const { result } = flip(10, 'heads')
      expect(['heads', 'tails']).toContain(result)
    }
  })

  it('win is true when result matches chosen', () => {
    for (let i = 0; i < 100; i++) {
      const chosen = Math.random() < 0.5 ? 'heads' : 'tails'
      const res = flip(10, chosen)
      expect(res.win).toBe(res.result === chosen)
    }
  })

  it('prize is 2x bet on win', () => {
    for (let i = 0; i < 100; i++) {
      const res = flip(25, 'tails')
      if (res.win) expect(res.prize).toBe(50)
    }
  })

  it('prize is 0 on loss', () => {
    for (let i = 0; i < 100; i++) {
      const res = flip(10, 'heads')
      if (!res.win) expect(res.prize).toBe(0)
    }
  })
})
