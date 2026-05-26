export type SegmentType = 'black' | 'red' | 'white'

export interface Segment {
  type: SegmentType
  mult: number
}

export const SEGMENTS: Segment[] = [
  { type: 'black', mult: 2  },
  { type: 'red',   mult: 2  },
  { type: 'black', mult: 2  },
  { type: 'red',   mult: 2  },
  { type: 'black', mult: 2  },
  { type: 'red',   mult: 2  },
  { type: 'black', mult: 2  },
  { type: 'white', mult: 14 },
  { type: 'black', mult: 2  },
  { type: 'red',   mult: 2  },
  { type: 'black', mult: 2  },
  { type: 'red',   mult: 2  },
  { type: 'black', mult: 2  },
  { type: 'red',   mult: 2  },
]

export interface SpinResult {
  segmentIndex: number
  type: SegmentType
  multiplier: number
  win: boolean
  prize: number
}

export function rollSegment(): { segmentIndex: number; type: SegmentType; mult: number } {
  const segmentIndex = Math.floor(Math.random() * SEGMENTS.length)
  const seg = SEGMENTS[segmentIndex]
  return { segmentIndex, type: seg.type, mult: seg.mult }
}

export function spinWheel(bet: number, chosen: SegmentType): SpinResult {
  const { segmentIndex, type, mult } = rollSegment()
  const win   = type === chosen
  const prize = win ? bet * mult : 0
  return { segmentIndex, type, multiplier: mult, win, prize }
}
