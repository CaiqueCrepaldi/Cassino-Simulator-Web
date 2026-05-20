import { useState, useRef, useEffect, useCallback } from 'react'
import type { GameProps } from '../types'
import GameShell from './GameShell'
import { api } from '../api/client'

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

const SIDE_INFO: Record<BetSide, { label: string; accent: string; mult: number }> = {
  black: { label: '⚫ Preto',    accent: '#555', mult: 2  },
  red:   { label: '🔴 Vermelho', accent: '#CC0000', mult: 2  },
  white: { label: '⬜ Branco',  accent: '#aaa', mult: 14 },
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

  const animRef  = useRef<ReturnType<typeof requestAnimationFrame> | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const stopAnim = useCallback(() => {
    if (animRef.current) { cancelAnimationFrame(animRef.current); animRef.current = null }
  }, [])
  useEffect(() => () => stopAnim(), [stopAnim])

  useEffect(() => { drawWheel(angle, result) })

  function drawWheel(deg: number, highlighted: number | null) {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const W = canvas.width
    const cx = W / 2, cy = W / 2, r = W / 2 - 4
    ctx.clearRect(0, 0, W, W)

    const slice  = (2 * Math.PI) / N
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
      ctx.strokeStyle = '#333'
      ctx.lineWidth = 1
      ctx.stroke()
    }

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

    ctx.beginPath()
    ctx.arc(cx, cy, 16, 0, 2 * Math.PI)
    ctx.fillStyle = '#07070f'
    ctx.fill()
    ctx.strokeStyle = 'rgba(255,215,0,0.3)'
    ctx.lineWidth = 2
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(cx - 10, 2)
    ctx.lineTo(cx + 10, 2)
    ctx.lineTo(cx, 20)
    ctx.closePath()
    ctx.fillStyle = '#FFD700'
    ctx.fill()
  }

  async function handleSpin() {
    const betVal = parseFloat(bet) || 0
    if (betVal <= 0 || betVal > balance) { setMessage('Aposta inválida!'); setMsgColor('#ff5252'); return }
    if (spinning) return

    setSpinning(true)
    setResult(null)
    setMessage('')

    let apiResult: { segmentIndex: number; type: string; win: boolean; prize: number; multiplier: number; balance: number }
    try {
      apiResult = await api.double.spin(betVal, chosen)
    } catch (err: unknown) {
      setSpinning(false)
      setMessage(err instanceof Error ? err.message : 'Erro na conexão')
      setMsgColor('#ff5252')
      return
    }

    const targetSeg  = apiResult.segmentIndex
    const segAngle   = 360 / N
    const baseAngle  = ((-targetSeg * segAngle) % 360 + 360) % 360
    const finalAngle = baseAngle + 360 * (5 + Math.floor(Math.random() * 5))
    const startAngle = angle
    const startTime  = performance.now()
    const duration   = 3500

    function animate(now: number) {
      const t    = Math.min((now - startTime) / duration, 1)
      const ease = 1 - Math.pow(1 - t, 4)
      setAngle(startAngle + (finalAngle - startAngle) * ease)
      if (t < 1) {
        animRef.current = requestAnimationFrame(animate)
      } else {
        setAngle(finalAngle % 360)
        setResult(targetSeg)
        setSpinning(false)
        setRounds(r => r + 1)
        onBalanceChange(apiResult.balance)
        setHistory(h => [segType(targetSeg), ...h].slice(0, MAX_HISTORY))

        if (apiResult.win) {
          setWins(w => w + 1)
          setMessage(`🎉 ${SEGMENTS[targetSeg].label} — Ganhou R$ ${apiResult.prize.toFixed(2)}! (${apiResult.multiplier}×)`)
          setMsgColor('#00e676')
        } else {
          setMessage(`❌ ${SEGMENTS[targetSeg].label} — Perdeu!`)
          setMsgColor('#ff5252')
        }
      }
    }
    animRef.current = requestAnimationFrame(animate)
  }

  const winRate = rounds > 0 ? ((wins / rounds) * 100).toFixed(1) : '0.0'
  const isWin = msgColor === '#00e676'

  return (
    <GameShell title="🎡 DOUBLE" onBack={onBack} balance={balance}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, maxWidth: 440, margin: '0 auto' }}>

        {/* Wheel */}
        <div style={{
          padding: 10,
          background: 'rgba(153,0,238,0.06)',
          border: '1px solid rgba(153,0,238,0.2)',
          borderRadius: '50%',
          boxShadow: spinning ? '0 0 40px rgba(153,0,238,0.2)' : '0 0 10px rgba(0,0,0,0.5)',
          transition: 'box-shadow 0.3s',
        }}>
          <canvas ref={canvasRef} width={240} height={240} style={{ borderRadius: '50%', display: 'block' }} />
        </div>

        {/* Side buttons */}
        <div style={{ display: 'flex', gap: 10, width: '100%' }}>
          {(Object.keys(SIDE_INFO) as BetSide[]).map(side => (
            <button
              key={side}
              onClick={() => setChosen(side)}
              disabled={spinning}
              style={{
                flex: 1,
                padding: '12px 0',
                fontWeight: 700,
                fontSize: 13,
                borderRadius: 10,
                background: chosen === side ? `${SIDE_INFO[side].accent}22` : 'rgba(255,255,255,0.03)',
                color: chosen === side ? '#fff' : '#555',
                border: chosen === side ? `1px solid ${SIDE_INFO[side].accent}66` : '1px solid rgba(255,255,255,0.07)',
                boxShadow: chosen === side ? `0 0 14px ${SIDE_INFO[side].accent}33` : 'none',
                transition: 'all 0.2s',
              }}
            >
              {SIDE_INFO[side].label}<br />
              <span style={{ fontSize: 11, color: chosen === side ? SIDE_INFO[side].accent : '#444' }}>
                {SIDE_INFO[side].mult}×
              </span>
            </button>
          ))}
        </div>

        {/* Bet + spin */}
        <div style={{ display: 'flex', gap: 10, width: '100%', alignItems: 'center' }}>
          <label style={{ color: '#555', fontSize: 10, letterSpacing: 1.5, whiteSpace: 'nowrap' }}>APOSTA R$</label>
          <input type="number" min="1" value={bet} onChange={e => setBet(e.target.value)}
            disabled={spinning} className="input-field" />
          <button
            onClick={handleSpin}
            disabled={spinning}
            style={{
              background: spinning ? 'rgba(255,255,255,0.04)' : '#6600CC',
              color: '#fff',
              fontFamily: 'Orbitron, sans-serif',
              fontWeight: 700,
              fontSize: 13,
              padding: '10px 20px',
              borderRadius: 9,
              border: spinning ? '1px solid rgba(255,255,255,0.08)' : '1px solid transparent',
              whiteSpace: 'nowrap',
              letterSpacing: 1,
            }}
            onMouseEnter={e => { if (!spinning) e.currentTarget.style.boxShadow = '0 4px 20px rgba(102,0,204,0.5)' }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none' }}
          >
            {spinning ? '⏳' : '🎡 GIRAR'}
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

        {history.length > 0 && (
          <div style={{ width: '100%' }}>
            <p style={{ color: '#444', fontSize: 10, letterSpacing: 1.5, marginBottom: 8 }}>ÚLTIMOS RESULTADOS</p>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {history.map((s, i) => (
                <span key={i} style={{ fontSize: 20 }}>
                  {s === 'white' ? '⬜' : s === 'red' ? '🔴' : '⚫'}
                </span>
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
