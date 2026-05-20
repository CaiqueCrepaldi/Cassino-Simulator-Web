import { useState, useRef, useEffect, useCallback } from 'react'
import type { GameProps } from '../types'
import GameShell from './GameShell'
import { api } from '../api/client'

const RED_NUMBERS = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36])
const WHEEL_ORDER = [0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,5,24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26]

function pocketColor(n: number): string {
  if (n === 0) return '#006600'
  return RED_NUMBERS.has(n) ? '#CC0000' : '#1a1a1a'
}

type BetType = 'number' | 'red' | 'black' | 'even' | 'odd' | 'low' | 'high' | 'dozen1' | 'dozen2' | 'dozen3' | 'col1' | 'col2' | 'col3'
interface Bet { type: BetType; value?: number; amount: number }

const BET_BUTTONS: { label: string; type: BetType; accent: string }[] = [
  { label: '🔴 Vermelho', type: 'red',    accent: '#CC0000' },
  { label: '⚫ Preto',    type: 'black',  accent: '#444' },
  { label: '2× Par',      type: 'even',   accent: '#226622' },
  { label: '2× Ímpar',    type: 'odd',    accent: '#224466' },
  { label: '2× 1-18',     type: 'low',    accent: '#555500' },
  { label: '2× 19-36',    type: 'high',   accent: '#005555' },
  { label: '3× 1ª Dúzia', type: 'dozen1', accent: '#664400' },
  { label: '3× 2ª Dúzia', type: 'dozen2', accent: '#446600' },
  { label: '3× 3ª Dúzia', type: 'dozen3', accent: '#004466' },
  { label: '3× Col 1',    type: 'col1',   accent: '#660044' },
  { label: '3× Col 2',    type: 'col2',   accent: '#006644' },
  { label: '3× Col 3',    type: 'col3',   accent: '#664400' },
]

export default function Roulette({ balance, onBalanceChange, onBack }: GameProps) {
  const [betAmount, setBetAmount] = useState('10')
  const [numberBet, setNumberBet] = useState('')
  const [bets, setBets] = useState<Bet[]>([])
  const [spinning, setSpinning] = useState(false)
  const [result, setResult] = useState<number | null>(null)
  const [stripOffset, setStripOffset] = useState(0)
  const [message, setMessage] = useState('')
  const [msgColor, setMsgColor] = useState('#fff')
  const [rounds, setRounds] = useState(0)
  const [wins, setWins] = useState(0)

  const animRef = useRef<ReturnType<typeof requestAnimationFrame> | null>(null)
  const stop = useCallback(() => { if (animRef.current) { cancelAnimationFrame(animRef.current); animRef.current = null } }, [])
  useEffect(() => () => stop(), [stop])

  const POCKET_W = 48
  const STRIP_W  = POCKET_W * WHEEL_ORDER.length

  function addBet(type: BetType, value?: number) {
    const amt = parseFloat(betAmount) || 0
    if (amt <= 0) return
    setBets(prev => {
      const exists = prev.find(b => b.type === type && b.value === value)
      if (exists) return prev.map(b => b.type === type && b.value === value ? { ...b, amount: b.amount + amt } : b)
      return [...prev, { type, value, amount: amt }]
    })
  }

  function clearBets() { setBets([]) }

  const totalBet = bets.reduce((s, b) => s + b.amount, 0)

  async function handleSpin() {
    if (bets.length === 0) { setMessage('Adicione apostas primeiro!'); setMsgColor('#ff5252'); return }
    if (totalBet > balance) { setMessage('Saldo insuficiente!'); setMsgColor('#ff5252'); return }
    if (spinning) return

    setSpinning(true)
    setResult(null)
    setMessage('')

    let apiRes: { number: number; totalWin: number; balance: number }
    try {
      apiRes = await api.roulette.spin(bets)
    } catch (err: unknown) {
      setSpinning(false)
      setMessage(err instanceof Error ? err.message : 'Erro na conexão')
      setMsgColor('#ff5252')
      return
    }

    const targetNum = apiRes.number
    const targetIdx = WHEEL_ORDER.indexOf(targetNum)
    const centerOffset = targetIdx * POCKET_W
    const extraRevs    = STRIP_W * (4 + Math.floor(Math.random() * 3))
    const finalOffset  = centerOffset + extraRevs

    const start    = performance.now()
    const duration = 4000
    const startOff = stripOffset

    function animate(now: number) {
      const t    = Math.min((now - start) / duration, 1)
      const ease = 1 - Math.pow(1 - t, 4)
      setStripOffset(startOff + (finalOffset - startOff) * ease)
      if (t < 1) {
        animRef.current = requestAnimationFrame(animate)
      } else {
        setStripOffset(finalOffset % STRIP_W)
        setResult(targetNum)
        setSpinning(false)
        setRounds(r => r + 1)
        onBalanceChange(apiRes.balance)

        if (apiRes.totalWin > 0) {
          setWins(w => w + 1)
          setMessage(`🎉 Número ${targetNum}! — Ganhou R$ ${apiRes.totalWin.toFixed(2)}!`)
          setMsgColor('#00e676')
        } else {
          setMessage(`❌ Número ${targetNum} — Perdeu R$ ${totalBet.toFixed(2)}!`)
          setMsgColor('#ff5252')
        }
        setBets([])
      }
    }
    animRef.current = requestAnimationFrame(animate)
  }

  const winRate = rounds > 0 ? ((wins / rounds) * 100).toFixed(1) : '0.0'
  const isWin = msgColor === '#00e676'

  return (
    <GameShell title="🎡 ROLETA" onBack={onBack} balance={balance}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, maxWidth: 580, margin: '0 auto' }}>

        {/* Strip wheel */}
        <div style={{
          width: '100%', overflow: 'hidden', position: 'relative', height: 68,
          background: 'rgba(238,0,85,0.06)',
          borderRadius: 12,
          border: `1px solid ${spinning ? 'rgba(238,0,85,0.4)' : 'rgba(238,0,85,0.18)'}`,
          boxShadow: spinning ? '0 0 30px rgba(238,0,85,0.15)' : 'none',
          transition: 'all 0.3s',
        }}>
          <div style={{
            display: 'flex', position: 'absolute',
            left: -((stripOffset % STRIP_W) - (580 / 2 - POCKET_W / 2)),
            top: 4,
          }}>
            {[...WHEEL_ORDER, ...WHEEL_ORDER, ...WHEEL_ORDER].map((n, i) => (
              <div key={i} style={{
                width: POCKET_W, height: 60, flexShrink: 0,
                background: pocketColor(n),
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontFamily: 'Orbitron, sans-serif', fontWeight: 700, fontSize: 13,
                borderRight: '1px solid rgba(255,255,255,0.1)',
              }}>
                {n}
              </div>
            ))}
          </div>
          <div style={{
            position: 'absolute', top: 0, left: '50%',
            transform: 'translateX(-50%)',
            width: 2, height: '100%',
            background: '#FFD700',
            zIndex: 2, pointerEvents: 'none',
            boxShadow: '0 0 6px rgba(255,215,0,0.8)',
          }} />
        </div>

        {/* Result badge */}
        {result !== null && !spinning && (
          <div style={{
            background: pocketColor(result),
            color: '#fff',
            fontFamily: 'Orbitron, sans-serif',
            fontWeight: 900,
            fontSize: 22,
            padding: '8px 28px',
            borderRadius: 30,
            border: '2px solid #FFD700',
            boxShadow: '0 0 20px rgba(255,215,0,0.3)',
          }}>
            {result}
          </div>
        )}

        {/* Bet amount + number */}
        <div style={{ display: 'flex', gap: 10, width: '100%', alignItems: 'center' }}>
          <label style={{ color: '#555', fontSize: 10, letterSpacing: 1.5, whiteSpace: 'nowrap' }}>VALOR R$</label>
          <input type="number" min="1" value={betAmount} onChange={e => setBetAmount(e.target.value)}
            style={{ width: 90, background: 'rgba(255,255,255,0.06)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '9px 10px', fontSize: 13 }} />
          <input type="number" min="0" max="36" placeholder="Número 0–36" value={numberBet}
            onChange={e => setNumberBet(e.target.value)}
            style={{ flex: 1, background: 'rgba(255,255,255,0.06)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '9px 10px', fontSize: 13 }} />
          <button
            onClick={() => {
              const n = parseInt(numberBet)
              if (!isNaN(n) && n >= 0 && n <= 36) { addBet('number', n); setNumberBet('') }
            }}
            style={{
              background: 'rgba(238,0,85,0.18)',
              color: '#EE0055',
              border: '1px solid rgba(238,0,85,0.35)',
              fontFamily: 'Orbitron, sans-serif',
              fontWeight: 700, fontSize: 11,
              padding: '9px 14px', borderRadius: 8,
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(238,0,85,0.3)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(238,0,85,0.18)' }}
          >
            + Nº
          </button>
        </div>

        {/* Outside bet buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 7, width: '100%' }}>
          {BET_BUTTONS.map(b => (
            <button
              key={b.type}
              onClick={() => addBet(b.type)}
              disabled={spinning}
              style={{
                background: `${b.accent}18`,
                color: '#bbb',
                fontSize: 12,
                fontWeight: 600,
                padding: '9px 4px',
                borderRadius: 8,
                border: `1px solid ${b.accent}33`,
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = `${b.accent}30`; e.currentTarget.style.color = '#fff' }}
              onMouseLeave={e => { e.currentTarget.style.background = `${b.accent}18`; e.currentTarget.style.color = '#bbb' }}
            >
              {b.label}
            </button>
          ))}
        </div>

        {/* Active bets */}
        {bets.length > 0 && (
          <div className="glass" style={{ padding: '12px 16px', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ color: '#FFD700', fontFamily: 'Orbitron, sans-serif', fontWeight: 700, fontSize: 11, letterSpacing: 1 }}>
                APOSTAS — R$ {totalBet.toFixed(2)}
              </span>
              <button
                onClick={clearBets}
                disabled={spinning}
                style={{ background: 'rgba(255,82,82,0.1)', color: '#ff5252', border: '1px solid rgba(255,82,82,0.25)', fontSize: 11, padding: '3px 12px', borderRadius: 6 }}
              >
                Limpar
              </button>
            </div>
            {bets.map((b, i) => (
              <div key={i} style={{ color: '#555', fontSize: 12, display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <span>{b.type === 'number' ? `Nº ${b.value}` : b.type}</span>
                <span style={{ color: '#888' }}>R$ {b.amount.toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={handleSpin}
          disabled={spinning || bets.length === 0}
          style={{
            background: spinning || bets.length === 0 ? 'rgba(255,255,255,0.04)' : '#AA0044',
            color: '#fff',
            fontFamily: 'Orbitron, sans-serif',
            fontWeight: 700,
            fontSize: 15,
            padding: '14px 0',
            borderRadius: 11,
            width: '100%',
            border: spinning || bets.length === 0 ? '1px solid rgba(255,255,255,0.08)' : '1px solid transparent',
            letterSpacing: 2,
          }}
          onMouseEnter={e => { if (!spinning && bets.length > 0) e.currentTarget.style.boxShadow = '0 4px 24px rgba(170,0,68,0.5)' }}
          onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none' }}
        >
          {spinning ? '⏳ ROLANDO...' : '🎡 GIRAR ROLETA'}
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

        <div className="stats-bar">
          <div className="stat-item"><span className="stat-label">RODADAS</span><span className="stat-value">{rounds}</span></div>
          <div className="stat-item"><span className="stat-label">VITÓRIAS</span><span className="stat-value">{wins}</span></div>
          <div className="stat-item"><span className="stat-label">TAXA</span><span className="stat-value">{winRate}%</span></div>
        </div>
      </div>
    </GameShell>
  )
}
