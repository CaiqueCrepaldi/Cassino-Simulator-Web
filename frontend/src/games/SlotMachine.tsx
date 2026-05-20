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

  async function handleSpin() {
    if (spinning) return
    if (betVal <= 0 || betVal > balance) { setMessage('Aposta inválida!'); setMsgColor('#FF4444'); return }

    setSpinning(true)
    setMessage('')

    // Animate while waiting for API
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
        setMsgColor('#00FF00')
      } else {
        setMessage('Sem sorte desta vez...')
        setMsgColor('#FF4444')
      }
    } catch (err: unknown) {
      clearInterval(intervalRef.current!)
      setSpinning(false)
      setMessage(err instanceof Error ? err.message : 'Erro na conexão')
      setMsgColor('#FF4444')
    }
  }

  const winRate = rounds > 0 ? ((wins / rounds) * 100).toFixed(1) : '0.0'

  return (
    <GameShell title="🎰 SLOT MACHINE" onBack={onBack} balance={balance}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
        <div style={{ display: 'flex', gap: 12, background: '#111', padding: 20, borderRadius: 12, border: '2px solid #333' }}>
          {reels.map((idx, i) => (
            <div key={i} style={{ width: 80, height: 80, background: '#222', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, border: spinning ? '2px solid #FFD700' : '2px solid #444', transition: 'border-color 0.1s' }}>
              {SYMBOLS[idx].icon}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <label style={{ color: '#ccc', fontSize: 14 }}>Aposta: R$</label>
          <input type="number" min="1" max={balance} value={bet} onChange={e => setBet(e.target.value)} disabled={spinning}
            style={{ width: 90, padding: '6px 10px', background: '#222', color: '#fff', border: '1px solid #444', borderRadius: 6, fontSize: 14 }} />
        </div>

        <button onClick={handleSpin} disabled={spinning}
          style={{ background: spinning ? '#444' : '#CC0000', color: '#fff', fontWeight: 'bold', fontSize: 16, padding: '12px 40px', borderRadius: 10, minWidth: 180 }}
          onMouseEnter={e => { if (!spinning) e.currentTarget.style.background = '#990000' }}
          onMouseLeave={e => { if (!spinning) e.currentTarget.style.background = '#CC0000' }}>
          {spinning ? '⏳ Girando...' : '🎰 GIRAR'}
        </button>

        {message && (
          <div style={{ color: msgColor, fontWeight: 'bold', fontSize: 16, textAlign: 'center', background: '#111', padding: '10px 20px', borderRadius: 8 }}>
            {message}
          </div>
        )}

        <div style={{ display: 'flex', gap: 20, color: '#888', fontSize: 13 }}>
          <span>Rodadas: {rounds}</span><span>Vitórias: {wins}</span><span>Taxa: {winRate}%</span>
        </div>

        <div style={{ background: '#111', borderRadius: 8, padding: '12px 20px', width: '100%', maxWidth: 320 }}>
          <p style={{ color: '#FFD700', fontWeight: 'bold', marginBottom: 8, textAlign: 'center' }}>Tabela de Pagamentos</p>
          {SYMBOLS.map(s => (
            <div key={s.icon} style={{ display: 'flex', justifyContent: 'space-between', color: '#ccc', fontSize: 13, marginBottom: 4 }}>
              <span>{s.icon} {s.icon} {s.icon}</span><span style={{ color: '#00FF00' }}>{s.mult}×</span>
            </div>
          ))}
        </div>
      </div>
    </GameShell>
  )
}
