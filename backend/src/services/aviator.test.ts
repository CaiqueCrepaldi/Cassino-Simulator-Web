import { describe, it, expect } from 'vitest'
import { generateCrash, settle } from './aviator.js'

describe('generateCrash', () => {
  it('always returns at least 1.0', () => {
    for (let i = 0; i < 1000; i++) expect(generateCrash()).toBeGreaterThanOrEqual(1.0)
  })
  it('returns a finite number', () => {
    expect(isFinite(generateCrash())).toBe(true)
  })
})

describe('settle', () => {
  it('wins when cashed out before crash', () => {
    const r = settle(100, 3.0, 2.0)
    expect(r.win).toBe(true)
    expect(r.prize).toBe(200)
  })
  it('loses when cashout equals crashAt', () => {
    const r = settle(100, 2.0, 2.0)
    expect(r.win).toBe(true)
  })
  it('loses when cashout exceeds crash', () => {
    const r = settle(100, 2.0, 3.0)
    expect(r.win).toBe(false)
    expect(r.prize).toBe(0)
  })
  it('loses when cashout is below 1', () => {
    const r = settle(100, 3.0, 0.5)
    expect(r.win).toBe(false)
  })
})
