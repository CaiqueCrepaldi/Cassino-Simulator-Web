import { useState, useRef, useEffect, useCallback } from 'react'
import type { GameProps } from '../types'
import GameShell from './GameShell'
import { api } from '../api/client'

type Side = 'heads' | 'tails'
const LAST_N = 12

export default function CoinFlip({ balance, onBalanceChange, onBack }: GameProps) {
  const [bet, setBet] = useState('10')
  const [chosen, setChosen] = useState<Side>('heads')
  const [flipping, setFlipping] = useState(false)
  const [message, setMessage] = useState('')
  const [msgColor, setMsgColor] = useState('#fff')
  const [history, setHistory] = useState<Side[]>([])
  const [streak, setStreak] = useState(0)
  const [streakType, setStreakType] = useState<'win' | 'loss' | null>(null)
  const [rounds, setRounds] = useState(0)
  const [wins, setWins] = useState(0)
  const [autoMode, setAutoMode] = useState(false)
  const [coinAngle, setCoinAngle] = useState(0)

  const coinSpinRef   = useRef<number | null>(null)
  const coinAngleRef  = useRef(0)
  const flippingRef   = useRef(false)
  const streakTypeRef = useRef<'win' | 'loss' | null>(null)
  const autoTimerRef  = useRef<ReturnType<typeof setInterval> | null>(null)
  const balanceRef    = useRef(balance)
  balanceRef.current  = balance

  const stopAuto = useCallback(() => {
    if (autoTimerRef.current) { clearInterval(autoTimerRef.current); autoTimerRef.current = null }
  }, [])

  useEffect(() => () => {
    if (coinSpinRef.current) cancelAnimationFrame(coinSpinRef.current)
    stopAuto()
  }, [stopAuto])

  function startSpin() {
    function spin() {
      coinAngleRef.current += 12
      setCoinAngle(coinAngleRef.current)
      coinSpinRef.current = requestAnimationFrame(spin)
    }
    coinSpinRef.current = requestAnimationFrame(spin)
  }

  function decelToResult(result: Side, onDone: () => void) {
    if (coinSpinRef.current) cancelAnimationFrame(coinSpinRef.current)

    const current   = coinAngleRef.current
    const mod       = ((current % 360) + 360) % 360
    const faceTarget = result === 'heads' ? 0 : 180
    const diff      = ((faceTarget - mod) + 360) % 360
    const target    = current + diff + 360 * 4

    const startAngle = current
    const startTime  = performance.now()
    const duration   = 750

    function frame(now: number) {
      const t     = Math.min((now - startTime) / duration, 1)
      const ease  = 1 - Math.pow(1 - t, 3)
      const angle = startAngle + (target - startAngle) * ease
      coinAngleRef.current = angle
      setCoinAngle(angle)
      if (t < 1) {
        coinSpinRef.current = requestAnimationFrame(frame)
      } else {
        coinSpinRef.current = null
        onDone()
      }
    }
    coinSpinRef.current = requestAnimationFrame(frame)
  }

  async function doFlip(currentChosen: Side) {
    const betVal = parseFloat(bet) || 0
    if (betVal <= 0 || betVal > balanceRef.current) {
      setMessage('Aposta inválida ou saldo insuficiente!')
      setMsgColor('#ff5252')
      setAutoMode(false)
      stopAuto()
      return
    }

    flippingRef.current = true
    setFlipping(true)
    setMessage('')
    startSpin()

    try {
      const res        = await api.coinFlip.flip(betVal, currentChosen)
      const result     = res.result as Side
      const newBalance = res.balance
      const isWin      = res.win
      const prize      = res.prize
      const prevStreak = streakTypeRef.current

      decelToResult(result, () => {
        const newStreakType: 'win' | 'loss' = isWin ? 'win' : 'loss'
        streakTypeRef.current = newStreakType

        setFlipping(false)
        flippingRef.current = false
        setRounds(r => r + 1)
        setHistory(h => [result, ...h].slice(0, LAST_N))
        onBalanceChange(newBalance)
        setStreak(s => prevStreak === newStreakType ? s + 1 : 1)
        setStreakType(newStreakType)

        if (isWin) {
          setWins(w => w + 1)
          setMessage(`🎉 ${result === 'heads' ? '🪙 Cara' : '👑 Coroa'}! Ganhou R$ ${prize.toFixed(2)}!`)
          setMsgColor('#00e676')
        } else {
          setMessage(`❌ ${result === 'heads' ? '🪙 Cara' : '👑 Coroa'}! Perdeu!`)
          setMsgColor('#ff5252')
        }
      })
    } catch (err: unknown) {
      if (coinSpinRef.current) cancelAnimationFrame(coinSpinRef.current)
      coinSpinRef.current = null
      setFlipping(false)
      flippingRef.current = false
      setMessage(err instanceof Error ? err.message : 'Erro na conexão')
      setMsgColor('#ff5252')
    }
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
        if (!flippingRef.current) doFlip(chosen)
      }, 800)
    }
  }

  const winRate = rounds > 0 ? ((wins / rounds) * 100).toFixed(1) : '0.0'
  const isWin   = msgColor === '#00e676'

  return (
    <GameShell title="🪙 COIN FLIP" onBack={onBack} balance={balance}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, maxWidth: 380, margin: '0 auto' }}>

        {/* 3D Coin */}
        <div style={{ perspective: '300px', padding: '10px 0' }}>
          <div style={{
            width: 120, height: 120,
            position: 'relative',
            transformStyle: 'preserve-3d',
            transform: `rotateY(${coinAngle}deg)`,
          }}>
            <div style={{
              position: 'absolute', inset: 0,
              backfaceVisibility: 'hidden',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 90, lineHeight: 1,
              textShadow: flipping ? 'none' : '0 0 30px rgba(187,187,0,0.4)',
              userSelect: 'none',
            }}>🪙</div>
            <div style={{
              position: 'absolute', inset: 0,
              backfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 90, lineHeight: 1,
              textShadow: flipping ? 'none' : '0 0 30px rgba(0,170,170,0.4)',
              userSelect: 'none',
            }}>👑</div>
          </div>
        </div>

        {/* Streak */}
        {streak > 1 && streakType && (
          <div style={{
            fontWeight: 700, fontSize: 14,
            color: streakType === 'win' ? '#00e676' : '#ff5252',
            background: streakType === 'win' ? 'rgba(0,230,118,0.08)' : 'rgba(255,82,82,0.08)',
            border: `1px solid ${streakType === 'win' ? 'rgba(0,230,118,0.2)' : 'rgba(255,82,82,0.2)'}`,
            borderRadius: 8, padding: '6px 16px',
          }}>
            {streakType === 'win' ? '🔥' : '❄️'} Sequência de {streakType === 'win' ? 'vitórias' : 'derrotas'}: {streak}×
          </div>
        )}

        {/* Side selection */}
        <div style={{ display: 'flex', gap: 12, width: '100%' }}>
          {(['heads', 'tails'] as Side[]).map(s => (
            <button
              key={s}
              onClick={() => setChosen(s)}
              disabled={flipping || autoMode}
              style={{
                flex: 1, padding: '14px 0', fontWeight: 700, fontSize: 16, borderRadius: 11,
                background: chosen === s
                  ? s === 'heads' ? 'rgba(187,187,0,0.15)' : 'rgba(0,170,170,0.15)'
                  : 'rgba(255,255,255,0.03)',
                color: chosen === s ? '#fff' : '#555',
                border: chosen === s
                  ? `1px solid ${s === 'heads' ? 'rgba(187,187,0,0.45)' : 'rgba(0,170,170,0.45)'}`
                  : '1px solid rgba(255,255,255,0.07)',
                boxShadow: chosen === s
                  ? `0 0 16px ${s === 'heads' ? 'rgba(187,187,0,0.2)' : 'rgba(0,170,170,0.2)'}`
                  : 'none',
                transition: 'all 0.2s',
              }}
            >
              {s === 'heads' ? '🪙 Cara' : '👑 Coroa'}
            </button>
          ))}
        </div>

        {/* Bet */}
        <div style={{ display: 'flex', gap: 12, width: '100%', alignItems: 'center' }}>
          <label style={{ color: '#555', fontSize: 10, letterSpacing: 1.5, whiteSpace: 'nowrap' }}>APOSTA R$</label>
          <input type="number" min="1" value={bet} onChange={e => setBet(e.target.value)}
            disabled={flipping || autoMode} className="input-field" />
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 10, width: '100%' }}>
          <button
            onClick={handleFlip}
            disabled={flipping || autoMode}
            style={{
              flex: 2, background: flipping ? 'rgba(255,255,255,0.04)' : '#888800',
              color: '#fff', fontFamily: 'Orbitron, sans-serif', fontWeight: 700, fontSize: 14,
              padding: '13px 0', borderRadius: 10,
              border: flipping ? '1px solid rgba(255,255,255,0.08)' : '1px solid transparent',
              letterSpacing: 1,
            }}
            onMouseEnter={e => { if (!flipping && !autoMode) e.currentTarget.style.boxShadow = '0 4px 20px rgba(136,136,0,0.5)' }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none' }}
          >
            {flipping ? '⏳ GIRANDO...' : '🪙 JOGAR'}
          </button>
          <button
            onClick={toggleAuto}
            disabled={flipping && !autoMode}
            style={{
              flex: 1,
              background: autoMode ? 'rgba(255,82,82,0.1)' : 'rgba(255,255,255,0.04)',
              color: autoMode ? '#ff5252' : '#555',
              border: autoMode ? '1px solid rgba(255,82,82,0.3)' : '1px solid rgba(255,255,255,0.07)',
              fontWeight: 700, fontSize: 13, padding: '13px 0', borderRadius: 10,
            }}
          >
            {autoMode ? '⏹ Parar' : '▶▶ Auto'}
          </button>
        </div>

        {message && (
          <div style={{
            color: msgColor,
            background: isWin ? 'rgba(0,230,118,0.08)' : 'rgba(255,82,82,0.08)',
            border: `1px solid ${isWin ? 'rgba(0,230,118,0.25)' : 'rgba(255,82,82,0.25)'}`,
            borderRadius: 10, fontWeight: 700, fontSize: 15, textAlign: 'center',
            padding: '12px 20px', width: '100%',
          }}>
            {message}
          </div>
        )}

        {history.length > 0 && (
          <div style={{ width: '100%' }}>
            <p style={{ color: '#444', fontSize: 10, letterSpacing: 1.5, marginBottom: 8 }}>
              ÚLTIMOS {LAST_N} LANÇAMENTOS
            </p>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {history.map((s, i) => (
                <span key={i} style={{ fontSize: 22 }}>{s === 'heads' ? '🪙' : '👑'}</span>
              ))}
            </div>
          </div>
        )}

        <div className="stats-bar">
          <div className="stat-item"><span className="stat-label">RODADAS</span><span className="stat-value">{rounds}</span></div>
          <div className="stat-item"><span className="stat-label">VITÓRIAS</span><span className="stat-value">{wins}</span></div>
          <div className="stat-item"><span className="stat-label">TAXA</span><span className="stat-value">{winRate}%</span></div>
        </div>
      </div>
    </GameShell>
  )
}
