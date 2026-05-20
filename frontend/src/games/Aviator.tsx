import { useState, useRef, useEffect, useCallback } from 'react'
import type { GameProps } from '../types'
import GameShell from './GameShell'
import { api } from '../api/client'

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

  const crashRef  = useRef(1.0)
  const multRef   = useRef(1.0)
  const timerRef  = useRef<ReturnType<typeof setInterval> | null>(null)
  const phasedBet = useRef(0)

  const stop = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
  }, [])

  useEffect(() => () => stop(), [stop])

  async function handleStart() {
    const betVal = parseFloat(bet) || 0
    if (betVal <= 0 || betVal > balance) { setMessage('Aposta inválida!'); setMsgColor('#ff5252'); return }

    try {
      const { crashAt, balance: newBal } = await api.aviator.generate(betVal)
      onBalanceChange(newBal)
      phasedBet.current = betVal
      setCashedOut(false)
      setMessage('')
      setPhase('flying')
      crashRef.current = crashAt
      multRef.current  = 1.0
      setMultiplier(1.0)

      const autoVal = parseFloat(autoCashout)

      timerRef.current = setInterval(() => {
        multRef.current = parseFloat((multRef.current * 1.015).toFixed(2))
        setMultiplier(multRef.current)

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
          setMsgColor('#ff5252')
        }
      }, 100)
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : 'Erro na conexão')
      setMsgColor('#ff5252')
    }
  }

  function doWin(betVal: number, mult: number) {
    stop()
    setCashedOut(true)
    setPhase('crashed')
    setRounds(r => r + 1)
    setWins(w => w + 1)
    if (mult > bestMult) setBestMult(mult)
    setHistory(h => [crashRef.current, ...h].slice(0, MAX_HISTORY))

    api.aviator.settle(betVal, crashRef.current, mult).then(r => {
      onBalanceChange(r.balance)
      setMessage(`✅ Retirou em ${mult.toFixed(2)}× — Ganhou R$ ${r.prize.toFixed(2)}!`)
      setMsgColor('#00e676')
    }).catch(() => {})
  }

  function handleCashout() {
    if (phase !== 'flying' || cashedOut) return
    doWin(phasedBet.current, multRef.current)
  }

  const winRate = rounds > 0 ? ((wins / rounds) * 100).toFixed(1) : '0.0'
  const multColor = multiplier >= 3 ? '#00e676' : multiplier >= 2 ? '#FFD700' : '#fff'
  const isWin = msgColor === '#00e676'

  return (
    <GameShell title="✈️ AVIATOR" onBack={onBack} balance={balance}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, maxWidth: 480, margin: '0 auto' }}>

        {/* Multiplier display */}
        <div style={{
          width: '100%',
          background: 'rgba(0,136,255,0.06)',
          border: `1px solid ${phase === 'flying' ? 'rgba(0,136,255,0.4)' : 'rgba(0,136,255,0.15)'}`,
          borderRadius: 16,
          padding: '32px 0 24px',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: phase === 'flying' ? '0 0 40px rgba(0,136,255,0.15)' : 'none',
          transition: 'all 0.3s',
        }}>
          {phase === 'flying' && (
            <div style={{ position: 'absolute', top: 12, left: 0, right: 0, fontSize: 32, animation: 'none' }}>
              ✈️
            </div>
          )}
          <div style={{
            color: phase === 'crashed' && !cashedOut ? '#ff5252' : multColor,
            fontSize: 60,
            fontFamily: 'Orbitron, sans-serif',
            fontWeight: 900,
            marginTop: phase === 'flying' ? 36 : 0,
            textShadow: `0 0 20px ${phase === 'crashed' && !cashedOut ? 'rgba(255,82,82,0.5)' : multColor + '55'}`,
            transition: 'color 0.2s, text-shadow 0.2s',
          }}>
            {multiplier.toFixed(2)}×
          </div>
          <div style={{ color: '#444', fontSize: 12, marginTop: 6, letterSpacing: 1 }}>
            {phase === 'idle' ? 'AGUARDANDO' : phase === 'flying' ? '🛫 VOANDO!' : cashedOut ? '✅ RETIRADO' : '💥 CAIU!'}
          </div>
        </div>

        {/* Controls */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, width: '100%' }}>
          <div>
            <label style={{ color: '#555', fontSize: 10, letterSpacing: 1.5, display: 'block', marginBottom: 6 }}>APOSTA R$</label>
            <input type="number" min="1" value={bet} onChange={e => setBet(e.target.value)}
              disabled={phase === 'flying'} className="input-field" />
          </div>
          <div>
            <label style={{ color: '#555', fontSize: 10, letterSpacing: 1.5, display: 'block', marginBottom: 6 }}>AUTO RETIRAR ×</label>
            <input type="number" min="1.01" step="0.01" value={autoCashout}
              onChange={e => setAutoCashout(e.target.value)} disabled={phase === 'flying'}
              className="input-field" />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, width: '100%' }}>
          <button
            onClick={handleStart}
            disabled={phase === 'flying'}
            style={{
              flex: 1,
              background: phase === 'flying' ? 'rgba(255,255,255,0.04)' : '#0055CC',
              color: '#fff',
              fontFamily: 'Orbitron, sans-serif',
              fontWeight: 700,
              fontSize: 14,
              padding: '13px 0',
              borderRadius: 10,
              border: phase === 'flying' ? '1px solid rgba(255,255,255,0.08)' : '1px solid transparent',
              letterSpacing: 1,
            }}
            onMouseEnter={e => { if (phase !== 'flying') e.currentTarget.style.boxShadow = '0 4px 24px rgba(0,85,204,0.5)' }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none' }}
          >
            {phase === 'flying' ? '⏳ VOANDO...' : '🚀 APOSTAR'}
          </button>
          <button
            onClick={handleCashout}
            disabled={phase !== 'flying' || cashedOut}
            style={{
              flex: 1,
              background: phase === 'flying' && !cashedOut ? '#007700' : 'rgba(255,255,255,0.04)',
              color: '#fff',
              fontFamily: 'Orbitron, sans-serif',
              fontWeight: 700,
              fontSize: 14,
              padding: '13px 0',
              borderRadius: 10,
              border: phase === 'flying' && !cashedOut ? '1px solid transparent' : '1px solid rgba(255,255,255,0.08)',
              letterSpacing: 1,
            }}
            onMouseEnter={e => { if (phase === 'flying' && !cashedOut) e.currentTarget.style.boxShadow = '0 4px 24px rgba(0,119,0,0.5)' }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none' }}
          >
            💰 RETIRAR
          </button>
        </div>

        {message && (
          <div style={{
            color: msgColor,
            background: isWin ? 'rgba(0,230,118,0.08)' : msgColor === '#FFD700' ? 'rgba(255,215,0,0.08)' : 'rgba(255,82,82,0.08)',
            border: `1px solid ${isWin ? 'rgba(0,230,118,0.25)' : msgColor === '#FFD700' ? 'rgba(255,215,0,0.25)' : 'rgba(255,82,82,0.25)'}`,
            borderRadius: 10,
            fontWeight: 700,
            fontSize: 15,
            textAlign: 'center',
            padding: '12px 20px',
            width: '100%',
          }}>
            {message}
          </div>
        )}

        {history.length > 0 && (
          <div style={{ width: '100%' }}>
            <p style={{ color: '#444', fontSize: 10, letterSpacing: 1.5, marginBottom: 8 }}>ÚLTIMAS QUEDAS</p>
            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
              {history.map((h, i) => (
                <span key={i} style={{
                  background: h < 1.5 ? 'rgba(255,82,82,0.1)' : h < 2 ? 'rgba(255,215,0,0.1)' : 'rgba(0,230,118,0.1)',
                  color: h < 1.5 ? '#ff5252' : h < 2 ? '#FFD700' : '#00e676',
                  border: `1px solid ${h < 1.5 ? 'rgba(255,82,82,0.25)' : h < 2 ? 'rgba(255,215,0,0.25)' : 'rgba(0,230,118,0.25)'}`,
                  padding: '3px 11px',
                  borderRadius: 20,
                  fontSize: 12,
                  fontFamily: 'Orbitron, sans-serif',
                  fontWeight: 700,
                }}>
                  {h.toFixed(2)}×
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="stats-bar">
          <div className="stat-item"><span className="stat-label">RODADAS</span><span className="stat-value">{rounds}</span></div>
          <div className="stat-item"><span className="stat-label">VITÓRIAS</span><span className="stat-value">{wins}</span></div>
          <div className="stat-item"><span className="stat-label">TAXA</span><span className="stat-value">{winRate}%</span></div>
          <div className="stat-item"><span className="stat-label">MELHOR</span><span className="stat-value">{bestMult > 0 ? `${bestMult.toFixed(2)}×` : '—'}</span></div>
        </div>
      </div>
    </GameShell>
  )
}
