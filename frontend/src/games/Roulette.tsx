import { useState, useRef, useEffect, useCallback } from 'react'
import type { GameProps } from '../types'
import GameShell from './GameShell'
import { api } from '../api/client'

// European roulette pockets 0-36
const RED_NUMBERS = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36])
const WHEEL_ORDER = [0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,5,24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26]

function pocketColor(n: number): string {
  if (n === 0) return '#006600'
  return RED_NUMBERS.has(n) ? '#CC0000' : '#111111'
}

type BetType = 'number' | 'red' | 'black' | 'even' | 'odd' | 'low' | 'high' | 'dozen1' | 'dozen2' | 'dozen3' | 'col1' | 'col2' | 'col3'
interface Bet { type: BetType; value?: number; amount: number }

const BET_BUTTONS: { label: string; type: BetType; color?: string }[] = [
  { label: '🔴 Vermelho', type: 'red',    color: '#880000' },
  { label: '⚫ Preto',    type: 'black',  color: '#1a1a1a' },
  { label: '2× Par',      type: 'even',   color: '#1a3a1a' },
  { label: '2× Ímpar',    type: 'odd',    color: '#1a1a3a' },
  { label: '2× 1-18',     type: 'low',    color: '#2a2a00' },
  { label: '2× 19-36',    type: 'high',   color: '#002a2a' },
  { label: '3× 1ª Dúzia', type: 'dozen1', color: '#2a1a00' },
  { label: '3× 2ª Dúzia', type: 'dozen2', color: '#1a2a00' },
  { label: '3× 3ª Dúzia', type: 'dozen3', color: '#001a2a' },
  { label: '3× Col 1',    type: 'col1',   color: '#220022' },
  { label: '3× Col 2',    type: 'col2',   color: '#002222' },
  { label: '3× Col 3',    type: 'col3',   color: '#222200' },
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
    if (bets.length === 0) { setMessage('Adicione apostas primeiro!'); setMsgColor('#FF4444'); return }
    if (totalBet > balance) { setMessage('Saldo insuficiente!'); setMsgColor('#FF4444'); return }
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
      setMsgColor('#FF4444')
      return
    }

    const targetNum = apiRes.number
    const targetIdx = WHEEL_ORDER.indexOf(targetNum)

    const centerOffset = targetIdx * POCKET_W
    const extraRevs    = STRIP_W * (4 + Math.floor(Math.random() * 3))
    const finalOffset  = centerOffset + extraRevs

    const start = performance.now()
    const duration = 4000
    const startOff = stripOffset

    function animate(now: number) {
      const t = Math.min((now - start) / duration, 1)
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
          setMsgColor('#00FF00')
        } else {
          setMessage(`❌ Número ${targetNum} — Perdeu R$ ${totalBet.toFixed(2)}!`)
          setMsgColor('#FF4444')
        }
        setBets([])
      }
    }
    animRef.current = requestAnimationFrame(animate)
  }

  const winRate = rounds > 0 ? ((wins / rounds) * 100).toFixed(1) : '0.0'

  return (
    <GameShell title="🎡 ROLETA" onBack={onBack} balance={balance}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, maxWidth: 580, margin: '0 auto' }}>

        {/* Strip wheel */}
        <div style={{ width: '100%', overflow: 'hidden', position: 'relative', height: 64, background: '#111', borderRadius: 10, border: '2px solid #333' }}>
          <div style={{ display: 'flex', position: 'absolute', left: -((stripOffset % STRIP_W) - (580 / 2 - POCKET_W / 2)), transition: 'none', top: 0 }}>
            {[...WHEEL_ORDER, ...WHEEL_ORDER, ...WHEEL_ORDER].map((n, i) => (
              <div key={i} style={{ width: POCKET_W, height: 60, flexShrink: 0, background: pocketColor(n), display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold', fontSize: 14, borderRight: '1px solid #333' }}>
                {n}
              </div>
            ))}
          </div>
          {/* pointer */}
          <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 2, height: '100%', background: '#FFD700', zIndex: 2, pointerEvents: 'none' }} />
        </div>

        {/* Result badge */}
        {result !== null && !spinning && (
          <div style={{ background: pocketColor(result), color: '#fff', fontWeight: 'bold', fontSize: 20, padding: '6px 24px', borderRadius: 30, border: '2px solid #FFD700' }}>
            {result}
          </div>
        )}

        {/* Bet amount + number */}
        <div style={{ display: 'flex', gap: 10, width: '100%', alignItems: 'center' }}>
          <label style={{ color: '#aaa', fontSize: 12, whiteSpace: 'nowrap' }}>Valor R$</label>
          <input type="number" min="1" value={betAmount} onChange={e => setBetAmount(e.target.value)}
            style={{ width: 90, padding: '6px 8px', background: '#222', color: '#fff', border: '1px solid #444', borderRadius: 6, fontSize: 13 }} />
          <input type="number" min="0" max="36" placeholder="Número (0-36)" value={numberBet} onChange={e => setNumberBet(e.target.value)}
            style={{ flex: 1, padding: '6px 8px', background: '#222', color: '#fff', border: '1px solid #444', borderRadius: 6, fontSize: 13 }} />
          <button onClick={() => { const n = parseInt(numberBet); if (!isNaN(n) && n >= 0 && n <= 36) { addBet('number', n); setNumberBet('') } }}
            style={{ background: '#880044', color: '#fff', fontWeight: 'bold', fontSize: 12, padding: '6px 12px', borderRadius: 6 }}>
            + Nº
          </button>
        </div>

        {/* Outside bet buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, width: '100%' }}>
          {BET_BUTTONS.map(b => (
            <button key={b.type} onClick={() => addBet(b.type)} disabled={spinning}
              style={{ background: b.color ?? '#222', color: '#fff', fontSize: 12, fontWeight: 'bold', padding: '8px 4px', borderRadius: 6, border: '1px solid #444' }}
              onMouseEnter={e => (e.currentTarget.style.filter = 'brightness(1.4)')}
              onMouseLeave={e => (e.currentTarget.style.filter = 'brightness(1)')}>
              {b.label}
            </button>
          ))}
        </div>

        {/* Active bets */}
        {bets.length > 0 && (
          <div style={{ background: '#111', borderRadius: 8, padding: '10px 14px', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ color: '#FFD700', fontWeight: 'bold', fontSize: 13 }}>Apostas ativas — Total: R$ {totalBet.toFixed(2)}</span>
              <button onClick={clearBets} disabled={spinning} style={{ background: '#330000', color: '#FF8888', fontSize: 11, padding: '2px 10px', borderRadius: 4 }}>Limpar</button>
            </div>
            {bets.map((b, i) => (
              <div key={i} style={{ color: '#aaa', fontSize: 12, display: 'flex', justifyContent: 'space-between' }}>
                <span>{b.type === 'number' ? `Nº ${b.value}` : b.type}</span>
                <span>R$ {b.amount.toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}

        <button onClick={handleSpin} disabled={spinning || bets.length === 0}
          style={{ background: spinning ? '#333' : '#880044', color: '#fff', fontWeight: 'bold', fontSize: 16, padding: '12px 40px', borderRadius: 10, width: '100%' }}
          onMouseEnter={e => { if (!spinning) e.currentTarget.style.background = '#660033' }}
          onMouseLeave={e => { if (!spinning) e.currentTarget.style.background = '#880044' }}>
          {spinning ? '⏳ Rolando...' : '🎡 GIRAR ROLETA'}
        </button>

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
