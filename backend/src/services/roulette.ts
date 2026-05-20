const RED_NUMBERS = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36])

export type BetType = 'number' | 'red' | 'black' | 'even' | 'odd' | 'low' | 'high' | 'dozen1' | 'dozen2' | 'dozen3' | 'col1' | 'col2' | 'col3'

export interface RouletteBet {
  type: BetType
  value?: number
  amount: number
}

export interface RouletteResult {
  number: number
  color: 'red' | 'black' | 'green'
  totalBet: number
  totalWin: number
  prize: number
}

function betPayout(bet: RouletteBet, result: number): number {
  const { type, value, amount } = bet
  if (type === 'number' && value === result)                         return amount * 36
  if (type === 'red'    && RED_NUMBERS.has(result) && result !== 0) return amount * 2
  if (type === 'black'  && !RED_NUMBERS.has(result) && result !== 0)return amount * 2
  if (type === 'even'   && result !== 0 && result % 2 === 0)        return amount * 2
  if (type === 'odd'    && result % 2 === 1)                        return amount * 2
  if (type === 'low'    && result >= 1 && result <= 18)             return amount * 2
  if (type === 'high'   && result >= 19 && result <= 36)            return amount * 2
  if (type === 'dozen1' && result >= 1 && result <= 12)             return amount * 3
  if (type === 'dozen2' && result >= 13 && result <= 24)            return amount * 3
  if (type === 'dozen3' && result >= 25 && result <= 36)            return amount * 3
  if (type === 'col1'   && result !== 0 && result % 3 === 1)        return amount * 3
  if (type === 'col2'   && result !== 0 && result % 3 === 2)        return amount * 3
  if (type === 'col3'   && result !== 0 && result % 3 === 0)        return amount * 3
  return 0
}

export function spinWheel(bets: RouletteBet[]): RouletteResult {
  const number = Math.floor(Math.random() * 37)
  const color: RouletteResult['color'] = number === 0 ? 'green' : RED_NUMBERS.has(number) ? 'red' : 'black'
  const totalBet = bets.reduce((s, b) => s + b.amount, 0)
  const totalWin = bets.reduce((s, b) => s + betPayout(b, number), 0)
  return { number, color, totalBet, totalWin, prize: totalWin }
}
