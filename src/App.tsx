import { useState, lazy, Suspense } from 'react'
import type { GameKey } from './types'
import Menu from './components/Menu'

const SlotMachine = lazy(() => import('./games/SlotMachine'))
const Aviator = lazy(() => import('./games/Aviator'))
const Double = lazy(() => import('./games/Double'))
const CrashDice = lazy(() => import('./games/CrashDice'))
const Blackjack = lazy(() => import('./games/Blackjack'))
const Roulette = lazy(() => import('./games/Roulette'))
const CoinFlip = lazy(() => import('./games/CoinFlip'))
const Baccarat = lazy(() => import('./games/Baccarat'))

const INITIAL_BALANCE = 1000

export default function App() {
  const [balance, setBalance] = useState(INITIAL_BALANCE)
  const [currentGame, setCurrentGame] = useState<GameKey | null>(null)

  const gameProps = {
    balance,
    onBalanceChange: setBalance,
    onBack: () => setCurrentGame(null),
  }

  if (currentGame) {
    return (
      <Suspense fallback={<div style={{ color: '#fff', textAlign: 'center', marginTop: 40 }}>Carregando...</div>}>
        {currentGame === 'slot'       && <SlotMachine {...gameProps} />}
        {currentGame === 'aviator'    && <Aviator     {...gameProps} />}
        {currentGame === 'double'     && <Double      {...gameProps} />}
        {currentGame === 'crash_dice' && <CrashDice   {...gameProps} />}
        {currentGame === 'blackjack'  && <Blackjack   {...gameProps} />}
        {currentGame === 'roulette'   && <Roulette    {...gameProps} />}
        {currentGame === 'coin_flip'  && <CoinFlip    {...gameProps} />}
        {currentGame === 'baccarat'   && <Baccarat    {...gameProps} />}
      </Suspense>
    )
  }

  return (
    <Menu
      balance={balance}
      onSelectGame={setCurrentGame}
      onReset={() => setBalance(INITIAL_BALANCE)}
    />
  )
}
