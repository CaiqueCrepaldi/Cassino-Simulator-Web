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
    if (betVal <= 0 || betVal > balance) { setMessage('Aposta inválida!'); setMsgColor('#ff5252'); return }
    if (selected.length === 0) { setMessage('Escolha pelo menos 1 número!'); setMsgColor('#ff5252'); return }
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
        setMsgColor('#00e676')
      } else {
        setMessage(`❌ Dados: ${result.d1} e ${result.d2} — Perdeu!`)
        setMsgColor('#ff5252')
      }
    } catch (err: unknown) {
      stop()
      setRolling(false)
      setMessage(err instanceof Error ? err.message : 'Erro na conexão')
      setMsgColor('#ff5252')
    }
  }

  const winRate = rounds > 0 ? ((wins / rounds) * 100).toFixed(1) : '0.0'
  const isWin = msgColor === '#00e676'

  return (
    <GameShell title="🎲 CRASH DICE" onBack={onBack} balance={balance}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, maxWidth: 420, margin: '0 auto' }}>

        {/* Dice display */}
        <div
          className={rolling ? 'dice-rolling' : undefined}
          style={{
            display: 'flex', gap: 20,
            background: 'rgba(255,136,0,0.06)',
            border: `1px solid ${rolling ? 'rgba(255,136,0,0.4)' : 'rgba(255,136,0,0.18)'}`,
            padding: '28px 40px',
            borderRadius: 16,
            boxShadow: rolling ? '0 0 40px rgba(255,136,0,0.15)' : '0 4px 20px rgba(0,0,0,0.4)',
            transition: 'border-color 0.3s, box-shadow 0.3s',
          }}
        >
          {[dice.d1, dice.d2].map((d, i) => (
            <div key={i} style={{
              fontSize: 72,
              lineHeight: 1,
              textShadow: rolling ? 'none' : '0 0 16px rgba(255,136,0,0.3)',
              transition: 'text-shadow 0.2s',
            }}>
              {FACES[d - 1]}
            </div>
          ))}
        </div>

        {finalDice && (
          <div style={{ color: '#888', fontSize: 14 }}>
            Dados: <strong style={{ color: '#FFD700', fontFamily: 'Orbitron, sans-serif' }}>{finalDice.d1}</strong>
            {' + '}
            <strong style={{ color: '#FFD700', fontFamily: 'Orbitron, sans-serif' }}>{finalDice.d2}</strong>
            {' = '}
            <strong style={{ color: '#fff', fontFamily: 'Orbitron, sans-serif', fontSize: 16 }}>
              {finalDice.d1 + finalDice.d2}
            </strong>
          </div>
        )}

        {/* Number picker */}
        <div style={{ width: '100%' }}>
          <p style={{ color: '#444', fontSize: 10, letterSpacing: 1.5, marginBottom: 10 }}>ESCOLHA ATÉ 3 NÚMEROS (1-6)</p>
          <div style={{ display: 'flex', gap: 8 }}>
            {[1, 2, 3, 4, 5, 6].map(n => (
              <button
                key={n}
                onClick={() => toggleNumber(n)}
                disabled={rolling}
                style={{
                  flex: 1,
                  height: 48,
                  fontWeight: 700,
                  fontSize: 18,
                  borderRadius: 9,
                  background: selected.includes(n) ? 'rgba(255,136,0,0.18)' : 'rgba(255,255,255,0.04)',
                  color: selected.includes(n) ? '#FF8800' : '#444',
                  border: selected.includes(n) ? '1px solid rgba(255,136,0,0.5)' : '1px solid rgba(255,255,255,0.07)',
                  boxShadow: selected.includes(n) ? '0 0 12px rgba(255,136,0,0.25)' : 'none',
                  transition: 'all 0.15s',
                }}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* Payout table */}
        <div className="glass" style={{ padding: '12px 18px', width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ color: '#555', fontSize: 12 }}>Duplo exato no número escolhido</span>
            <span style={{ color: '#FFD700', fontFamily: 'Orbitron, sans-serif', fontWeight: 700, fontSize: 12 }}>5×</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ color: '#555', fontSize: 12 }}>Soma dos dados = número escolhido</span>
            <span style={{ color: '#FFD700', fontFamily: 'Orbitron, sans-serif', fontWeight: 700, fontSize: 12 }}>3×</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#555', fontSize: 12 }}>Um dado = número escolhido</span>
            <span style={{ color: '#FFD700', fontFamily: 'Orbitron, sans-serif', fontWeight: 700, fontSize: 12 }}>2×</span>
          </div>
        </div>

        {/* Bet + roll */}
        <div style={{ display: 'flex', gap: 10, width: '100%', alignItems: 'center' }}>
          <label style={{ color: '#555', fontSize: 10, letterSpacing: 1.5, whiteSpace: 'nowrap' }}>APOSTA R$</label>
          <input type="number" min="1" value={bet} onChange={e => setBet(e.target.value)}
            disabled={rolling} className="input-field" />
          <button
            onClick={handleRoll}
            disabled={rolling}
            style={{
              background: rolling ? 'rgba(255,255,255,0.04)' : '#CC6600',
              color: '#fff',
              fontFamily: 'Orbitron, sans-serif',
              fontWeight: 700,
              fontSize: 13,
              padding: '10px 18px',
              borderRadius: 9,
              border: rolling ? '1px solid rgba(255,255,255,0.08)' : '1px solid transparent',
              whiteSpace: 'nowrap',
              letterSpacing: 1,
            }}
            onMouseEnter={e => { if (!rolling) e.currentTarget.style.boxShadow = '0 4px 20px rgba(204,102,0,0.5)' }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none' }}
          >
            {rolling ? '⏳' : '🎲 ROLAR'}
          </button>
        </div>

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

        <div className="stats-bar">
          <div className="stat-item"><span className="stat-label">RODADAS</span><span className="stat-value">{rounds}</span></div>
          <div className="stat-item"><span className="stat-label">VITÓRIAS</span><span className="stat-value">{wins}</span></div>
          <div className="stat-item"><span className="stat-label">TAXA</span><span className="stat-value">{winRate}%</span></div>
        </div>
      </div>
    </GameShell>
  )
}
