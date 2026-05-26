import { describe, it, expect, beforeEach } from 'vitest'
import { getBalance, resetBalance, deduct, credit } from './balance.js'

beforeEach(() => { resetBalance() })

describe('balance', () => {
  it('starts at 1000 after reset', () => {
    expect(getBalance()).toBe(1000)
  })
  it('deduct reduces balance', () => {
    deduct(200)
    expect(getBalance()).toBe(800)
  })
  it('deduct throws on negative amount', () => {
    expect(() => deduct(-10)).toThrow()
  })
  it('deduct throws when amount exceeds balance', () => {
    expect(() => deduct(9999)).toThrow()
  })
  it('credit increases balance', () => {
    credit(500)
    expect(getBalance()).toBe(1500)
  })
  it('deduct then credit is consistent', () => {
    deduct(100)
    credit(100)
    expect(getBalance()).toBe(1000)
  })
})
