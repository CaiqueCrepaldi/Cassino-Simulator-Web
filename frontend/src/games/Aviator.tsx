import { useState, useRef, useEffect, useCallback } from 'react'
import type { GameProps } from '../types'
import GameShell from './GameShell'

function generateCrash(): number {
  const u = Math.random()
  return Math.max(1.0, 0.99 / (1 - u * 0.99))
}

const MAX_HISTORY = 8

export default function Aviator({ balance, onBalanceChange, onBack }: GameProps) {
  const [bet, setBet] = useState('10')
  const [autoCashout, setAutoCashout] = useState('2.00')
  const [phase, setPhase] = useState<'idle' | 'flying' | 'crashed'>('idle')
  const [multiplier, setMultiplier] = useState(1.0)
  const [cashedOut, setCashedOut] = useState(false)
  const [message, setMessage] = useState('')
  const [msgColor, setMsgColor] = useState('#ffffff')
  const [history, setHistory] = useState<number[]>([])
  const [rounds, setRounds] = useState(0)
  const [wins, setWins] = useState(0)
  const [bestMult, setBestMult] = useState(0)

  const crashRef    = useRef(1.0)
  const multRef     = useRef(1.0)
  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null)
  const phasedBet   = useRef(0)

  const stop = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
  }, [])

  useEffect(() => () => stop(), [stop])

  function handleStart() {
    const betVal = parseFloat(bet) || 0
    if (betVal <= 0 || betVal > balance) { setMessage('Aposta inválida!'); setMsgColor('#FF4444'); return }

    onBalanceChange(balance - betVal)
    phasedBet.current = betVal
    setCashedOut(false)
    setMessage('')
    setPhase('flying')

    const crashAt = generateCrash()
    crashRef.current = crashAt
    multRef.current  = 1.0
    setMultiplier(1.0)

    const autoVal = parseFloat(autoCashout)

    timerRef.current = setInterval(() => {
      multRef.current = parseFloat((multRef.current * 1.015).toFixed(2))
      setMultiplier(multRef.current)

      // auto cash-out
      if (!isNaN(autoVal) && autoVal > 1 && multRef.current >= autoVal) {
        doWin(phasedBet.current, multRef.current)
        return
      }

      if (multRef.current >= crashRef.current) {
        stop()
        setPhase('crashed')
        setRounds(r => r + 1)
        setHistory(h => [crashRef.current, ...h].slice(0, MAX_HISTORY))
        setMessage(`💥 Avião caiu em ${crashRef.current.toFixed(2)}×`)
        setMsgColor('#FF4444')
      }
    }, 100)
  }

  function doWin(betVal: number, mult: number) {
    stop()
    const prize = betVal * mult
    onBalanceChange(balance - betVal + prize)
    setCashedOut(true)
    setPhase('crashed')
    setRounds(r => r + 1)
    setWins(w => w + 1)
    if (mult > bestMult) setBestMult(mult)
    setHistory(h => [crashRef.current, ...h].slice(0, MAX_HISTORY))
    setMessage(`✅ Retirou em ${mult.toFixed(2)}× — Ganhou R$ ${prize.toFixed(2)}!`)
    setMsgColor('#00FF00')
  }

  function handleCashout() {
    if (phase !== 'flying' || cashedOut) return
    doWin(phasedBet.current, multRef.current)
  }

  const winRate = rounds > 0 ? ((wins / rounds) * 100).toFixed(1) : '0.0'
  const multColor = multiplier >= 3 ? '#00FF00' : multiplier >= 2 ? '#FFD700' : '#FFFFFF'

  return (
    <GameShell title="✈️ AVIATOR" onBack={onBack} balance={balance}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, maxWidth: 480, margin: '0 auto' }}>

        {/* Multiplier display */}
        <div style={{ width: '100%', background: '#0a0a2a', borderRadius: 12, border: '2px solid #0055CC', padding: '30px 0', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
          {phase === 'flying' && (
            <div style={{ position: 'absolute', top: 10, left: 0, right: 0, fontSize: 36, animation: 'none' }}>
              ✈️
            </div>
          )}
          <div style={{ color: phase === 'crashed' && !cashedOut ? '#FF4444' : multColor, fontSize: 56, fontWeight: 'bold', fontFamily: 'monospace', marginTop: phase === 'flying' ? 36 : 0 }}>
            {multiplier.toFixed(2)}×
          </div>
          <div style={{ color: '#555', fontSize: 13, marginTop: 4 }}>
            {phase === 'idle' ? 'Aguardando...' : phase === 'flying' ? '🛫 Voando!' : cashedOut ? '✅ Retirado' : '💥 Caiu!'}
          </div>
        </div>

        {/* Controls */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, width: '100%' }}>
          <div>
            <label style={{ color: '#aaa', fontSize: 12, display: 'block', marginBottom: 4 }}>Aposta (R$)</label>
            <input type="number" min="1" value={bet} onChange={e => setBet(e.target.value)} disabled={phase === 'flying'}
              style={{ width: '100%', padding: '8px 10px', background: '#222', color: '#fff', border: '1px solid #444', borderRadius: 6, fontSize: 14 }} />
          </div>
          <div>
            <label style={{ color: '#aaa', fontSize: 12, display: 'block', marginBottom: 4 }}>Auto Retirar em ×</label>
            <input type="number" min="1.01" step="0.01" value={autoCashout} onChange={e => setAutoCashout(e.target.value)} disabled={phase === 'flying'}
              style={{ width: '100%', padding: '8px 10px', background: '#222', color: '#fff', border: '1px solid #444', borderRadius: 6, fontSize: 14 }} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, width: '100%' }}>
          <button onClick={handleStart} disabled={phase === 'flying'}
            style={{ flex: 1, background: phase === 'flying' ? '#333' : '#0055CC', color: '#fff', fontWeight: 'bold', fontSize: 15, padding: '12px 0', borderRadius: 10 }}
            onMouseEnter={e => { if (phase !== 'flying') e.currentTarget.style.background = '#003D99' }}
            onMouseLeave={e => { if (phase !== 'flying') e.currentTarget.style.background = '#0055CC' }}>
            {phase === 'flying' ? '⏳ Voando...' : '🚀 APOSTAR'}
          </button>
          <button onClick={handleCashout} disabled={phase !== 'flying' || cashedOut}
            style={{ flex: 1, background: phase === 'flying' && !cashedOut ? '#007700' : '#333', color: '#fff', fontWeight: 'bold', fontSize: 15, padding: '12px 0', borderRadius: 10 }}
            onMouseEnter={e => { if (phase === 'flying' && !cashedOut) e.currentTarget.style.background = '#005500' }}
            onMouseLeave={e => { if (phase === 'flying' && !cashedOut) e.currentTarget.style.background = '#007700' }}>
            💰 RETIRAR
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
            <p style={{ color: '#888', fontSize: 12, marginBottom: 6 }}>Últimas quedas:</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {history.map((h, i) => (
                <span key={i} style={{ background: h < 1.5 ? '#3a0000' : h < 2 ? '#3a2200' : '#003a00', color: h < 1.5 ? '#FF6666' : h < 2 ? '#FFD700' : '#00FF00', padding: '3px 10px', borderRadius: 20, fontSize: 13, fontWeight: 'bold' }}>
                  {h.toFixed(2)}×
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Stats */}
        <div style={{ display: 'flex', gap: 20, color: '#888', fontSize: 13, flexWrap: 'wrap', justifyContent: 'center' }}>
          <span>Rodadas: {rounds}</span>
          <span>Vitórias: {wins}</span>
          <span>Taxa: {winRate}%</span>
          <span>Melhor: {bestMult > 0 ? `${bestMult.toFixed(2)}×` : '—'}</span>
        </div>
      </div>
    </GameShell>
  )
}
