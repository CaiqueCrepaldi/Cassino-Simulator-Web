export const SYMBOLS = [
  { icon: '🔥', mult: 2 },
  { icon: '⭐', mult: 2 },
  { icon: '🤑', mult: 3 },
]

const POOL: number[] = [
  ...Array<number>(40).fill(0),
  ...Array<number>(35).fill(1),
  ...Array<number>(25).fill(2),
]

export interface SpinResult {
  reels: [number, number, number]
  win: boolean
  multiplier: number
  prize: number
}

export function spin(bet: number): SpinResult {
  const reels: [number, number, number] = [
    POOL[Math.floor(Math.random() * POOL.length)],
    POOL[Math.floor(Math.random() * POOL.length)],
    POOL[Math.floor(Math.random() * POOL.length)],
  ]
  const win = reels[0] === reels[1] && reels[1] === reels[2]
  const multiplier = win ? SYMBOLS[reels[0]].mult : 0
  const prize = win ? bet * multiplier : 0
  return { reels, win, multiplier, prize }
}
