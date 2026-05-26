import { describe, it, expect } from 'vitest'
import { rollSegment, spinWheel, SEGMENTS } from './double.js'

describe('rollSegment', () => {
  it('returns a valid segment index', () => {
    for (let i = 0; i < 100; i++) {
      const { segmentIndex } = rollSegment()
      expect(segmentIndex).toBeGreaterThanOrEqual(0)
      expect(segmentIndex).toBeLessThan(SEGMENTS.length)
    }
  })
  it('type matches SEGMENTS at that index', () => {
    for (let i = 0; i < 50; i++) {
      const { segmentIndex, type, mult } = rollSegment()
      expect(type).toBe(SEGMENTS[segmentIndex].type)
      expect(mult).toBe(SEGMENTS[segmentIndex].mult)
    }
  })
})

describe('spinWheel', () => {
  it('wins when chosen matches result', () => {
    // Force by mocking rollSegment — instead check that win logic is consistent
    for (let i = 0; i < 50; i++) {
      const seg = SEGMENTS[i % SEGMENTS.length]
      const r   = spinWheel(100, seg.type)
      if (r.type === seg.type) {
        expect(r.win).toBe(true)
        expect(r.prize).toBe(100 * r.multiplier)
      }
    }
  })
  it('prize is 0 on a loss', () => {
    for (let i = 0; i < 200; i++) {
      const r = spinWheel(50, 'white')
      if (!r.win) expect(r.prize).toBe(0)
    }
  })
  it('white multiplier is 14', () => {
    // White appears at index 7 in SEGMENTS
    expect(SEGMENTS.find(s => s.type === 'white')?.mult).toBe(14)
  })
})
