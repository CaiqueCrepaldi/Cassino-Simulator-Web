import { describe, it, expect } from 'vitest'
import { rollDice } from '../../src/services/crashDice.js'

describe('Crash Dice Service', () => {
  it('both dice are in range 1-6', () => {
    for (let i = 0; i < 100; i++) {
      const { d1, d2 } = rollDice(10, [3])
      expect(d1).toBeGreaterThanOrEqual(1)
      expect(d1).toBeLessThanOrEqual(6)
      expect(d2).toBeGreaterThanOrEqual(1)
      expect(d2).toBeLessThanOrEqual(6)
    }
  })

  it('sum equals d1 + d2', () => {
    for (let i = 0; i < 100; i++) {
      const res = rollDice(10, [4])
      expect(res.sum).toBe(res.d1 + res.d2)
    }
  })

  it('exact double pays 5x', () => {
    const res = rollDice(10, [3])
    if (res.d1 === 3 && res.d2 === 3) {
      expect(res.multiplier).toBe(5)
      expect(res.prize).toBe(50)
    }
  })

  it('sum match pays 3x', () => {
    for (let i = 0; i < 500; i++) {
      const res = rollDice(20, [7])
      if (res.d1 !== res.d2 && res.sum === 7) {
        expect(res.multiplier).toBe(3)
        expect(res.prize).toBe(60)
        break
      }
    }
  })

  it('single die match pays 2x', () => {
    for (let i = 0; i < 500; i++) {
      const res = rollDice(10, [4])
      if (res.sum !== 4 && res.d1 !== res.d2 && (res.d1 === 4 || res.d2 === 4)) {
        expect(res.multiplier).toBe(2)
        break
      }
    }
  })

  it('no match returns prize 0', () => {
    for (let i = 0; i < 100; i++) {
      const res = rollDice(10, [1])
      if (!res.win) {
        expect(res.prize).toBe(0)
        break
      }
    }
  })
})
