import { describe, it, expect } from 'vitest'
import { spinWheel } from '../../src/services/roulette.js'

describe('Roulette Service', () => {
  it('result number is in range 0-36', () => {
    for (let i = 0; i < 100; i++) {
      const { number } = spinWheel([])
      expect(number).toBeGreaterThanOrEqual(0)
      expect(number).toBeLessThanOrEqual(36)
    }
  })

  it('color is green for 0, red or black for others', () => {
    for (let i = 0; i < 100; i++) {
      const { number, color } = spinWheel([])
      if (number === 0) expect(color).toBe('green')
      else expect(['red', 'black']).toContain(color)
    }
  })

  it('single number bet pays 36x on hit', () => {
    for (let i = 0; i < 1000; i++) {
      const res = spinWheel([{ type: 'number', value: 7, amount: 10 }])
      if (res.number === 7) {
        expect(res.totalWin).toBe(360)
        break
      }
    }
  })

  it('red bet pays 2x when red number hits', () => {
    for (let i = 0; i < 200; i++) {
      const res = spinWheel([{ type: 'red', amount: 20 }])
      if (res.color === 'red') {
        expect(res.totalWin).toBe(40)
        break
      }
    }
  })

  it('totalBet sums all bet amounts', () => {
    const res = spinWheel([
      { type: 'red', amount: 10 },
      { type: 'black', amount: 20 },
    ])
    expect(res.totalBet).toBe(30)
  })
})
