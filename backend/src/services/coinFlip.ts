export type CoinSide = 'heads' | 'tails'

export interface FlipResult {
  result: CoinSide
  win: boolean
  prize: number
}

export function flip(bet: number, chosen: CoinSide): FlipResult {
  const result: CoinSide = Math.random() < 0.5 ? 'heads' : 'tails'
  const win = result === chosen
  return { result, win, prize: win ? bet * 2 : 0 }
}
