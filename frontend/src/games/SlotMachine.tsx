import { useState, useRef } from 'react'
import type { GameProps } from '../types'
import GameShell from './GameShell'
import { api } from '../api/client'

const SYMBOLS = [
  { icon: '🔥', mult: 2 },
  { icon: '⭐', mult: 2 },
  { icon: '🤑', mult: 3 },
]

const POOL = [
  ...Array<number>(40).fill(0),
  ...Array<number>(35).fill(1),
  ...Array<number>(25).fill(2),
]

function randomReels() {
  return [0, 1, 2].map(() => POOL[Math.floor(Math.random() * POOL.length)])
}

export default function SlotMachine({ balance, onBalanceChange, onBack }: GameProps) {
  const [bet, setBet] = useState('10')
  const [reels, setReels] = useState([0, 1, 2])
  const [spinning, setSpinning] = useState(false)
  const [message, setMessage] = useState('')
  const [msgColor, setMsgColor] = useState('#ffffff')
  const [rounds, setRounds] = useState(0)
  const [wins, setWins] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const betVal = parseFloat(bet) || 0
  const winRate = rounds > 0 ? ((wins / rounds) * 100).toFixed(1) : '0.0'

  async function handleSpin() {
    if (spinning) return
    if (betVal <= 0 || betVal > balance) { setMessage('Aposta inválida!'); setMsgColor('#ff5252'); return }

    setSpinning(true)
    setMessage('')
    intervalRef.current = setInterval(() => setReels(randomReels()), 60)

    try {
      const result = await api.slot.spin(betVal)
      clearInterval(intervalRef.current!)
      setReels(result.reels)
      setSpinning(false)
      setRounds(r => r + 1)
      onBalanceChange(result.balance)

      if (result.win) {
        const sym = SYMBOLS[result.reels[0]]
        setWins(w => w + 1)
        setMessage(`🎉 ${sym.icon}${sym.icon}${sym.icon} — Ganhou R$ ${result.prize.toFixed(2)}! (${result.multiplier}×)`)
        setMsgColor('#00e676')
      } else {
        setMessage('Sem sorte desta vez...')
        setMsgColor('#ff5252')
      }
    } catch (err: unknown) {
      clearInterval(intervalRef.current!)
      setSpinning(false)
      setMessage(err instanceof Error ? err.message : 'Erro na conexão')
      setMsgColor('#ff5252')
    }
  }

  const isWin = msgColor === '#00e676'

  return (
    <GameShell title="🎰 SLOT MACHINE" onBack={onBack} balance={balance}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22, maxWidth: 380, margin: '0 auto' }}>

        {/* Reels */}
        <div style={{
          display: 'flex', gap: 10,
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,51,0,0.25)',
          padding: '24px 28px',
          borderRadius: 16,
          boxShadow: spinning ? '0 0 30px rgba(255,51,0,0.2)' : '0 0 10px rgba(0,0,0,0.5)',
          transition: 'box-shadow 0.3s',
        }}>
          {reels.map((idx, i) => (
            <div
              key={i}
              style={{
                width: 86,
                height: 86,
                background: spinning
                  ? 'rgba(255,51,0,0.1)'
                  : reels[0] === reels[1] && reels[1] === reels[2]
                    ? 'rgba(0,230,118,0.1)'
                    : 'rgba(255,255,255,0.05)',
                borderRadius: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 44,
                border: spinning
                  ? '1px solid rgba(255,51,0,0.5)'
                  : reels[0] === reels[1] && reels[1] === reels[2]
                    ? '1px solid rgba(0,230,118,0.5)'
                    : '1px solid rgba(255,255,255,0.08)',
                transition: 'all 0.15s',
                boxShadow: spinning ? '0 0 12px rgba(255,51,0,0.25)' : 'none',
              }}
            >
              {SYMBOLS[idx].icon}
            </div>
          ))}
        </div>

        {/* Bet */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%' }}>
          <label style={{ color: '#666', fontSize: 12, letterSpacing: 1, whiteSpace: 'nowrap' }}>APOSTA R$</label>
          <input
            type="number" min="1" max={balance} value={bet}
            onChange={e => setBet(e.target.value)}
            disabled={spinning}
            className="input-field"
          />
        </div>

        {/* Spin button */}
        <button
          onClick={handleSpin}
          disabled={spinning}
          style={{
            background: spinning ? 'rgba(255,255,255,0.04)' : '#CC2200',
            color: '#fff',
            fontFamily: 'Orbitron, sans-serif',
            fontWeight: 700,
            fontSize: 15,
            padding: '14px 0',
            borderRadius: 11,
            width: '100%',
            border: spinning ? '1px solid rgba(255,255,255,0.08)' : '1px solid transparent',
            letterSpacing: 2,
          }}
          onMouseEnter={e => { if (!spinning) e.currentTarget.style.boxShadow = '0 4px 24px rgba(204,34,0,0.5)' }}
          onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none' }}
        >
          {spinning ? '⏳ GIRANDO...' : '🎰 GIRAR'}
        </button>

        {message && (
          <div style={{
            color: msgColor,
            background: isWin ? 'rgba(0,230,118,0.08)' : 'rgba(255,82,82,0.08)',
            border: `1px solid ${isWin ? 'rgba(0,230,118,0.25)' : 'rgba(255,82,82,0.25)'}`,
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

        {/* Payout table */}
        <div className="glass" style={{ padding: '14px 20px', width: '100%' }}>
          <p style={{ color: '#FFD700', fontFamily: 'Orbitron, sans-serif', fontSize: 11, letterSpacing: 1.5, marginBottom: 10, textAlign: 'center' }}>
            PAGAMENTOS
          </p>
          {SYMBOLS.map(s => (
            <div key={s.icon} style={{ display: 'flex', justifyContent: 'space-between', color: '#666', fontSize: 13, marginBottom: 5 }}>
              <span style={{ fontSize: 18 }}>{s.icon} {s.icon} {s.icon}</span>
              <span style={{ color: '#FFD700', fontFamily: 'Orbitron, sans-serif', fontWeight: 700 }}>{s.mult}×</span>
            </div>
          ))}
        </div>

        <div className="stats-bar">
          <div className="stat-item"><span className="stat-label">RODADAS</span><span className="stat-value">{rounds}</span></div>
          <div className="stat-item"><span className="stat-label">VITÓRIAS</span><span className="stat-value">{wins}</span></div>
          <div className="stat-item"><span className="stat-label">TAXA</span><span className="stat-value">{winRate}%</span></div>
        </div>
      </div>
    </GameShell>
  )
}
