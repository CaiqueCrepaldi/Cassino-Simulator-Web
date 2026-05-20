export type GameKey =
  | 'slot'
  | 'aviator'
  | 'double'
  | 'crash_dice'
  | 'blackjack'
  | 'roulette'
  | 'coin_flip'
  | 'baccarat'

export interface GameProps {
  balance: number
  onBalanceChange: (newBalance: number) => void
  onBack: () => void
}
