import { useState, useRef, useEffect, useCallback } from 'react'
import type { GameProps } from '../types'
import GameShell from './GameShell'
import { api } from '../api/client'

const FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅']

function rollDie() { return Math.floor(Math.random() * 6) + 1 }

type Result = { d1: number; d2: number }

export default function CrashDice({ balance, onBalanceChange, onBack }: GameProps) {
  const [bet, setBet] = useState('10')
  const [selected, setSelected] = useState<number[]>([])
  const [rolling, setRolling] = useState(false)
  const [dice, setDice] = useState<Result>({ d1: 1, d2: 1 })
  const [finalDice, setFinalDice] = useState<Result | null>(null)
  const [message, setMessage] = useState('')
  const [msgColor, setMsgColor] = useState('#fff')
  const [rounds, setRounds] = useState(0)
  const [wins, setWins] = useState(0)

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const stop = useCallback(() => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null } }, [])
  useEffect(() => () => stop(), [stop])

  function toggleNumber(n: number) {
    setSelected(prev =>
      prev.includes(n) ? prev.filter(x => x !== n) : prev.length < 3 ? [...prev, n] : prev
    )
  }

  async function handleRoll() {
    const betVal = parseFloat(bet) || 0
    if (betVal <= 0 || betVal > balance) { setMessage('Aposta inválida!'); setMsgColor('#FF4444'); return }
    if (selected.length === 0) { setMessage('Escolha pelo menos 1 número!'); setMsgColor('#FF4444'); return }
    if (rolling) return

    setRolling(true)
    setFinalDice(null)
    setMessage('')

    timerRef.current = setInterval(() => setDice({ d1: rollDie(), d2: rollDie() }), 80)

    try {
      const result = await api.crashDice.roll(betVal, selected)
      stop()
      setDice({ d1: result.d1, d2: result.d2 })
      setFinalDice({ d1: result.d1, d2: result.d2 })
      setRolling(false)
      setRounds(r => r + 1)
      onBalanceChange(result.balance)

      if (result.win) {
        setWins(w => w + 1)
        setMessage(`🎉 ${result.reason} — Ganhou R$ ${result.prize.toFixed(2)}!`)
        setMsgColor('#00FF00')
      } else {
        setMessage(`❌ Dados: ${result.d1} e ${result.d2} — Perdeu!`)
        setMsgColor('#FF4444')
      }
    } catch (err: unknown) {
      stop()
      setRolling(false)
      setMessage(err instanceof Error ? err.message : 'Erro na conexão')
      setMsgColor('#FF4444')
    }
  }

  const winRate = rounds > 0 ? ((wins / rounds) * 100).toFixed(1) : '0.0'

  return (
    <GameShell title="🎲 CRASH DICE" onBack={onBack} balance={balance}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, maxWidth: 420, margin: '0 auto' }}>

        {/* Dice display */}
        <div style={{ display: 'flex', gap: 24, background: '#111', padding: '24px 40px', borderRadius: 14, border: '2px solid #333' }}>
          {[dice.d1, dice.d2].map((d, i) => (
            <div key={i} style={{ fontSize: 72, lineHeight: 1, filter: rolling ? 'brightness(0.7)' : 'brightness(1)', transition: 'filter 0.1s' }}>
              {FACES[d - 1]}
            </div>
          ))}
        </div>

        {finalDice && (
          <div style={{ color: '#aaa', fontSize: 14 }}>
            Dados: <strong style={{ color: '#fff' }}>{finalDice.d1}</strong> + <strong style={{ color: '#fff' }}>{finalDice.d2}</strong> = <strong style={{ color: '#FFD700' }}>{finalDice.d1 + finalDice.d2}</strong>
          </div>
        )}

        {/* Number picker */}
        <div style={{ width: '100%' }}>
          <p style={{ color: '#aaa', fontSize: 13, marginBottom: 8 }}>Escolha até 3 números (1-6):</p>
          <div style={{ display: 'flex', gap: 8 }}>
            {[1, 2, 3, 4, 5, 6].map(n => (
              <button key={n} onClick={() => toggleNumber(n)} disabled={rolling}
                style={{ flex: 1, height: 44, fontWeight: 'bold', fontSize: 18, borderRadius: 8,
                  background: selected.includes(n) ? '#FF8800' : '#222',
                  color: selected.includes(n) ? '#fff' : '#888',
                  border: selected.includes(n) ? '2px solid #FFD700' : '2px solid #333',
                  transition: 'all 0.15s' }}>
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* Payout table */}
        <div style={{ background: '#111', borderRadius: 8, padding: '10px 16px', width: '100%', fontSize: 12, color: '#888' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}><span>Duplo exato no número escolhido</span><span style={{ color: '#FFD700' }}>5×</span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}><span>Soma dos dados = número escolhido</span><span style={{ color: '#FFD700' }}>3×</span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Um dado = número escolhido</span><span style={{ color: '#FFD700' }}>2×</span></div>
        </div>

        {/* Bet + roll */}
        <div style={{ display: 'flex', gap: 10, width: '100%', alignItems: 'center' }}>
          <label style={{ color: '#aaa', fontSize: 13, whiteSpace: 'nowrap' }}>Aposta R$</label>
          <input type="number" min="1" value={bet} onChange={e => setBet(e.target.value)} disabled={rolling}
            style={{ flex: 1, padding: '8px 10px', background: '#222', color: '#fff', border: '1px solid #444', borderRadius: 6, fontSize: 14 }} />
          <button onClick={handleRoll} disabled={rolling}
            style={{ background: rolling ? '#333' : '#FF8800', color: '#fff', fontWeight: 'bold', fontSize: 14, padding: '10px 20px', borderRadius: 8 }}
            onMouseEnter={e => { if (!rolling) e.currentTarget.style.background = '#CC6600' }}
            onMouseLeave={e => { if (!rolling) e.currentTarget.style.background = '#FF8800' }}>
            {rolling ? '⏳' : '🎲 ROLAR'}
          </button>
        </div>

        {message && (
          <div style={{ color: msgColor, fontWeight: 'bold', fontSize: 15, textAlign: 'center', background: '#111', padding: '10px 20px', borderRadius: 8, width: '100%' }}>
            {message}
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
