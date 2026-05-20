import { useState, useRef, useEffect, useCallback } from 'react'
import type { GameProps } from '../types'
import GameShell from './GameShell'

type Side = 'heads' | 'tails'
const LAST_N = 12

export default function CoinFlip({ balance, onBalanceChange, onBack }: GameProps) {
  const [bet, setBet] = useState('10')
  const [chosen, setChosen] = useState<Side>('heads')
  const [flipping, setFlipping] = useState(false)
  const [face, setFace] = useState<Side>('heads')
  const [message, setMessage] = useState('')
  const [msgColor, setMsgColor] = useState('#fff')
  const [history, setHistory] = useState<Side[]>([])
  const [streak, setStreak] = useState(0)
  const [streakType, setStreakType] = useState<'win' | 'loss' | null>(null)
  const [rounds, setRounds] = useState(0)
  const [wins, setWins] = useState(0)
  const [autoMode, setAutoMode] = useState(false)

  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null)
  const autoTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const balanceRef  = useRef(balance)
  balanceRef.current = balance

  const stop = useCallback(() => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null } }, [])
  const stopAuto = useCallback(() => { if (autoTimerRef.current) { clearInterval(autoTimerRef.current); autoTimerRef.current = null } }, [])
  useEffect(() => () => { stop(); stopAuto() }, [stop, stopAuto])

  function doFlip(currentChosen: Side) {
    const betVal = parseFloat(bet) || 0
    if (betVal <= 0 || betVal > balanceRef.current) {
      setMessage('Aposta inválida ou saldo insuficiente!')
      setMsgColor('#FF4444')
      setAutoMode(false)
      stopAuto()
      return
    }

    onBalanceChange(balanceRef.current - betVal)
    setFlipping(true)
    setMessage('')

    let ticks = 0
    const total = 10
    timerRef.current = setInterval(() => {
      setFace(Math.random() < 0.5 ? 'heads' : 'tails')
      ticks++
      if (ticks >= total) {
        stop()
        const result: Side = Math.random() < 0.5 ? 'heads' : 'tails'
        setFace(result)
        setFlipping(false)
        setRounds(r => r + 1)
        setHistory(h => [result, ...h].slice(0, LAST_N))

        if (result === currentChosen) {
          const prize = betVal * 2
          onBalanceChange(balanceRef.current - betVal + prize)
          setWins(w => w + 1)
          setMessage(`🎉 ${result === 'heads' ? '🪙 Cara' : '👑 Coroa'}! Ganhou R$ ${prize.toFixed(2)}!`)
          setMsgColor('#00FF00')
          setStreak(s => streakType === 'win' ? s + 1 : 1)
          setStreakType('win')
        } else {
          setMessage(`❌ ${result === 'heads' ? '🪙 Cara' : '👑 Coroa'}! Perdeu!`)
          setMsgColor('#FF4444')
          setStreak(s => streakType === 'loss' ? s + 1 : 1)
          setStreakType('loss')
        }
      }
    }, 60)
  }

  function handleFlip() {
    if (flipping) return
    doFlip(chosen)
  }

  function toggleAuto() {
    if (autoMode) {
      setAutoMode(false)
      stopAuto()
    } else {
      setAutoMode(true)
      autoTimerRef.current = setInterval(() => {
        if (!timerRef.current) doFlip(chosen)
      }, 800)
    }
  }

  const winRate = rounds > 0 ? ((wins / rounds) * 100).toFixed(1) : '0.0'
  const coinDisplay = face === 'heads' ? '🪙' : '👑'

  return (
    <GameShell title="🪙 COIN FLIP" onBack={onBack} balance={balance}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, maxWidth: 380, margin: '0 auto' }}>

        {/* Coin */}
        <div style={{ fontSize: 100, lineHeight: 1, filter: flipping ? 'brightness(0.6)' : 'brightness(1)', transition: 'filter 0.06s', userSelect: 'none' }}>
          {coinDisplay}
        </div>

        {/* Streak */}
        {streak > 1 && streakType && (
          <div style={{ fontWeight: 'bold', fontSize: 14, color: streakType === 'win' ? '#00FF00' : '#FF6666' }}>
            {streakType === 'win' ? '🔥' : '❄️'} Sequência de {streakType === 'win' ? 'vitórias' : 'derrotas'}: {streak}×
          </div>
        )}

        {/* Side selection */}
        <div style={{ display: 'flex', gap: 12, width: '100%' }}>
          {(['heads', 'tails'] as Side[]).map(s => (
            <button key={s} onClick={() => setChosen(s)} disabled={flipping || autoMode}
              style={{ flex: 1, padding: '14px 0', fontWeight: 'bold', fontSize: 16, borderRadius: 10,
                background: chosen === s ? (s === 'heads' ? '#555500' : '#004444') : '#1a1a1a',
                color: '#fff', border: chosen === s ? '2px solid #FFD700' : '2px solid #333', transition: 'all 0.15s' }}>
              {s === 'heads' ? '🪙 Cara' : '👑 Coroa'}
            </button>
          ))}
        </div>

        {/* Bet */}
        <div style={{ display: 'flex', gap: 10, width: '100%', alignItems: 'center' }}>
          <label style={{ color: '#aaa', fontSize: 13, whiteSpace: 'nowrap' }}>Aposta R$</label>
          <input type="number" min="1" value={bet} onChange={e => setBet(e.target.value)} disabled={flipping || autoMode}
            style={{ flex: 1, padding: '8px 10px', background: '#222', color: '#fff', border: '1px solid #444', borderRadius: 6, fontSize: 14 }} />
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 10, width: '100%' }}>
          <button onClick={handleFlip} disabled={flipping || autoMode}
            style={{ flex: 2, background: flipping ? '#333' : '#555500', color: '#fff', fontWeight: 'bold', fontSize: 15, padding: '12px 0', borderRadius: 10 }}
            onMouseEnter={e => { if (!flipping && !autoMode) e.currentTarget.style.background = '#777700' }}
            onMouseLeave={e => { if (!flipping && !autoMode) e.currentTarget.style.background = '#555500' }}>
            {flipping ? '⏳ Girando...' : '🪙 JOGAR'}
          </button>
          <button onClick={toggleAuto} disabled={flipping && !autoMode}
            style={{ flex: 1, background: autoMode ? '#660000' : '#333', color: autoMode ? '#FF8888' : '#aaa', fontWeight: 'bold', fontSize: 13, padding: '12px 0', borderRadius: 10 }}>
            {autoMode ? '⏹ Parar Auto' : '▶▶ Auto'}
          </button>
        </div>

        {message && (
          <div style={{ color: msgColor, fontWeight: 'bold', fontSize: 15, textAlign: 'center', background: '#111', padding: '10px 20px', borderRadius: 8, width: '100%' }}>
            {message}
          </div>
        )}

        {/* History */}
        {history.length > 0 && (
          <div style={{ width: '100%' }}>
            <p style={{ color: '#888', fontSize: 12, marginBottom: 6 }}>Últimos {LAST_N} lançamentos:</p>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {history.map((s, i) => (
                <span key={i} style={{ fontSize: 22 }}>{s === 'heads' ? '🪙' : '👑'}</span>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 20, color: '#888', fontSize: 13 }}>
          <span>Rodadas: {rounds}</span>
          <span>Vitórias: {wins}</span>
          <span>Taxa: {winRate}%</span>
        </div>
      </div>
    </GameShell>
  )
}
