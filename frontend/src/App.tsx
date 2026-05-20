import { useState, useEffect, lazy, Suspense } from 'react'
import type { GameKey } from './types'
import Menu from './components/Menu'
import { api } from './api/client'

const SlotMachine = lazy(() => import('./games/SlotMachine'))
const Aviator     = lazy(() => import('./games/Aviator'))
const Double      = lazy(() => import('./games/Double'))
const CrashDice   = lazy(() => import('./games/CrashDice'))
const Blackjack   = lazy(() => import('./games/Blackjack'))
const Roulette    = lazy(() => import('./games/Roulette'))
const CoinFlip    = lazy(() => import('./games/CoinFlip'))
const Baccarat    = lazy(() => import('./games/Baccarat'))

export default function App() {
  const [balance, setBalance] = useState(1000)
  const [currentGame, setCurrentGame] = useState<GameKey | null>(null)

  useEffect(() => {
    api.balance.get().then(r => setBalance(r.balance)).catch(() => {})
  }, [])

  const syncBalance = () => api.balance.get().then(r => setBalance(r.balance)).catch(() => {})

  const gameProps = {
    balance,
    onBalanceChange: setBalance,
    onBack: () => { syncBalance(); setCurrentGame(null) },
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
      onReset={() => api.balance.reset().then(r => setBalance(r.balance)).catch(() => {})}
    />
  )
}
