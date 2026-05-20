import { describe, it, expect } from 'vitest'
import { generateCrash, settle } from '../../src/services/aviator.js'

describe('Aviator Service', () => {
  it('crash multiplier is always >= 1.0', () => {
    for (let i = 0; i < 100; i++) {
      expect(generateCrash()).toBeGreaterThanOrEqual(1.0)
    }
  })

  it('returns win=true when cashedOutAt <= crashAt', () => {
    const res = settle(100, 3.0, 2.0)
    expect(res.win).toBe(true)
    expect(res.prize).toBe(200)
  })

  it('returns win=false when cashedOutAt > crashAt (missed)', () => {
    const res = settle(100, 1.5, 2.0)
    expect(res.win).toBe(false)
    expect(res.prize).toBe(0)
  })

  it('returns win=false when cashedOutAt < 1', () => {
    const res = settle(100, 3.0, 0.5)
    expect(res.win).toBe(false)
  })

  it('prize equals bet × cashedOutAt', () => {
    const res = settle(50, 5.0, 3.0)
    expect(res.prize).toBe(150)
  })
})
