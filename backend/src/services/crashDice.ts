export interface DiceResult {
  d1: number
  d2: number
  sum: number
  win: boolean
  multiplier: number
  prize: number
  reason: string
}

export function rollDice(bet: number, numbers: number[]): DiceResult {
  const d1 = Math.floor(Math.random() * 6) + 1
  const d2 = Math.floor(Math.random() * 6) + 1
  const sum = d1 + d2

  for (const n of numbers) {
    if (d1 === d2 && d1 === n) {
      return { d1, d2, sum, win: true, multiplier: 5, prize: bet * 5, reason: `Duplo ${n}` }
    }
  }
  for (const n of numbers) {
    if (sum === n) {
      return { d1, d2, sum, win: true, multiplier: 3, prize: bet * 3, reason: `Soma ${sum}` }
    }
  }
  for (const n of numbers) {
    if (d1 === n || d2 === n) {
      return { d1, d2, sum, win: true, multiplier: 2, prize: bet * 2, reason: `Um dado = ${n}` }
    }
  }

  return { d1, d2, sum, win: false, multiplier: 0, prize: 0, reason: 'Sem combinação' }
}
