import { useState, useRef, useEffect, useCallback } from 'react'
import type { GameProps } from '../types'
import GameShell from './GameShell'

// 14 segments: 7 black, 6 red, 1 white
const SEGMENTS: { label: string; color: string; mult: number }[] = [
  { label: '⚫', color: '#111111', mult: 2  },
  { label: '🔴', color: '#CC0000', mult: 2  },
  { label: '⚫', color: '#111111', mult: 2  },
  { label: '🔴', color: '#CC0000', mult: 2  },
  { label: '⚫', color: '#111111', mult: 2  },
  { label: '🔴', color: '#CC0000', mult: 2  },
  { label: '⚫', color: '#111111', mult: 2  },
  { label: '⬜', color: '#CCCCCC', mult: 14 },
  { label: '⚫', color: '#111111', mult: 2  },
  { label: '🔴', color: '#CC0000', mult: 2  },
  { label: '⚫', color: '#111111', mult: 2  },
  { label: '🔴', color: '#CC0000', mult: 2  },
  { label: '⚫', color: '#111111', mult: 2  },
  { label: '🔴', color: '#CC0000', mult: 2  },
]
const N = SEGMENTS.length

type BetSide = 'black' | 'red' | 'white'

const SIDE_INFO: Record<BetSide, { label: string; fg: string; hover: string; mult: number }> = {
  black: { label: '⚫ Preto',  fg: '#222222', hover: '#333333', mult: 2  },
  red:   { label: '🔴 Vermelho', fg: '#CC0000', hover: '#990000', mult: 2  },
  white: { label: '⬜ Branco', fg: '#555555', hover: '#666666', mult: 14 },
}

const MAX_HISTORY = 10

function segType(i: number): BetSide {
  return SEGMENTS[i].label === '⬜' ? 'white' : SEGMENTS[i].label === '🔴' ? 'red' : 'black'
}

export default function Double({ balance, onBalanceChange, onBack }: GameProps) {
  const [bet, setBet] = useState('10')
  const [chosen, setChosen] = useState<BetSide>('black')
  const [spinning, setSpinning] = useState(false)
  const [angle, setAngle] = useState(0)
  const [result, setResult] = useState<number | null>(null)
  const [message, setMessage] = useState('')
  const [msgColor, setMsgColor] = useState('#fff')
  const [history, setHistory] = useState<BetSide[]>([])
  const [rounds, setRounds] = useState(0)
  const [wins, setWins] = useState(0)

  const animRef = useRef<ReturnType<typeof requestAnimationFrame> | null>(null)
  const stopAnim = useCallback(() => { if (animRef.current) { cancelAnimationFrame(animRef.current); animRef.current = null } }, [])
  useEffect(() => () => stopAnim(), [stopAnim])

  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    drawWheel(angle, result)
  })

  function drawWheel(deg: number, highlighted: number | null) {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const W = canvas.width
    const cx = W / 2, cy = W / 2, r = W / 2 - 4
    ctx.clearRect(0, 0, W, W)

    const slice = (2 * Math.PI) / N
    const offset = (deg * Math.PI) / 180 - Math.PI / 2

    for (let i = 0; i < N; i++) {
      const start = offset + i * slice
      const end   = start + slice
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.arc(cx, cy, r, start, end)
      ctx.closePath()
      ctx.fillStyle = SEGMENTS[i].color
      ctx.fill()
      ctx.strokeStyle = '#444'
      ctx.lineWidth = 1
      ctx.stroke()
    }

    // highlight winner
    if (highlighted !== null) {
      const start = offset + highlighted * slice
      const end   = start + slice
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.arc(cx, cy, r, start, end)
      ctx.closePath()
      ctx.strokeStyle = '#FFD700'
      ctx.lineWidth = 4
      ctx.stroke()
    }

    // center circle
    ctx.beginPath()
    ctx.arc(cx, cy, 16, 0, 2 * Math.PI)
    ctx.fillStyle = '#0d0d0d'
    ctx.fill()

    // pointer at top
    ctx.beginPath()
    ctx.moveTo(cx - 10, 2)
    ctx.lineTo(cx + 10, 2)
    ctx.lineTo(cx, 20)
    ctx.closePath()
    ctx.fillStyle = '#FFD700'
    ctx.fill()
  }

  function handleSpin() {
    const betVal = parseFloat(bet) || 0
    if (betVal <= 0 || betVal > balance) { setMessage('Aposta inválida!'); setMsgColor('#FF4444'); return }
    if (spinning) return

    onBalanceChange(balance - betVal)
    setSpinning(true)
    setResult(null)
    setMessage('')

    const targetSeg = Math.floor(Math.random() * N)
    const segAngle  = 360 / N
    // we want targetSeg pointing to top (pointer). Wheel angle needs: (0 - targetSeg * segAngle) mod 360
    const baseAngle = ((-targetSeg * segAngle) % 360 + 360) % 360
    const finalAngle = baseAngle + 360 * (5 + Math.floor(Math.random() * 5))

    const startAngle = angle
    const startTime  = performance.now()
    const duration   = 3500

    function animate(now: number) {
      const t = Math.min((now - startTime) / duration, 1)
      const ease = 1 - Math.pow(1 - t, 4)
      const cur = startAngle + (finalAngle - startAngle) * ease
      setAngle(cur)
      if (t < 1) {
        animRef.current = requestAnimationFrame(animate)
      } else {
        setAngle(finalAngle % 360)
        setResult(targetSeg)
        setSpinning(false)
        setRounds(r => r + 1)

        const type = segType(targetSeg)
        setHistory(h => [type, ...h].slice(0, MAX_HISTORY))

        if (type === chosen) {
          const mult = SEGMENTS[targetSeg].mult
          const prize = betVal * mult
          onBalanceChange(balance - betVal + prize)
          setWins(w => w + 1)
          setMessage(`🎉 ${SEGMENTS[targetSeg].label} — Ganhou R$ ${prize.toFixed(2)}! (${mult}×)`)
          setMsgColor('#00FF00')
        } else {
          setMessage(`❌ ${SEGMENTS[targetSeg].label} — Perdeu!`)
          setMsgColor('#FF4444')
        }
      }
    }
    animRef.current = requestAnimationFrame(animate)
  }

  const winRate = rounds > 0 ? ((wins / rounds) * 100).toFixed(1) : '0.0'

  return (
    <GameShell title="🎡 DOUBLE" onBack={onBack} balance={balance}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, maxWidth: 440, margin: '0 auto' }}>

        {/* Wheel */}
        <canvas ref={canvasRef} width={240} height={240} style={{ borderRadius: '50%', border: '3px solid #333' }} />

        {/* Side buttons */}
        <div style={{ display: 'flex', gap: 10, width: '100%' }}>
          {(Object.keys(SIDE_INFO) as BetSide[]).map(side => (
            <button key={side} onClick={() => setChosen(side)} disabled={spinning}
              style={{ flex: 1, background: chosen === side ? SIDE_INFO[side].fg : '#1a1a1a', color: '#fff', fontWeight: 'bold', fontSize: 13, padding: '10px 0', borderRadius: 8, border: chosen === side ? '2px solid #FFD700' : '2px solid #333', transition: 'all 0.15s' }}>
              {SIDE_INFO[side].label}<br />
              <span style={{ fontSize: 11, color: '#aaa' }}>{SIDE_INFO[side].mult}×</span>
            </button>
          ))}
        </div>

        {/* Bet + spin */}
        <div style={{ display: 'flex', gap: 10, width: '100%', alignItems: 'center' }}>
          <label style={{ color: '#aaa', fontSize: 13, whiteSpace: 'nowrap' }}>Aposta R$</label>
          <input type="number" min="1" value={bet} onChange={e => setBet(e.target.value)} disabled={spinning}
            style={{ flex: 1, padding: '8px 10px', background: '#222', color: '#fff', border: '1px solid #444', borderRadius: 6, fontSize: 14 }} />
          <button onClick={handleSpin} disabled={spinning}
            style={{ background: spinning ? '#333' : '#6600CC', color: '#fff', fontWeight: 'bold', fontSize: 14, padding: '10px 20px', borderRadius: 8 }}
            onMouseEnter={e => { if (!spinning) e.currentTarget.style.background = '#4a0099' }}
            onMouseLeave={e => { if (!spinning) e.currentTarget.style.background = '#6600CC' }}>
            {spinning ? '⏳' : '🎡 GIRAR'}
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
            <p style={{ color: '#888', fontSize: 12, marginBottom: 6 }}>Últimos resultados:</p>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {history.map((s, i) => (
                <span key={i} style={{ fontSize: 20 }}>
                  {s === 'white' ? '⬜' : s === 'red' ? '🔴' : '⚫'}
                </span>
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
