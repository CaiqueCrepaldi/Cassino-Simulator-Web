import { useState, useRef, useEffect, useCallback } from 'react'
import type { GameProps } from '../types'
import GameShell from './GameShell'
import { BASE } from '../api/client'
import { LiveIndicator } from './LiveIndicator'

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
type DoublePhase = 'betting' | 'spinning' | 'result'

interface LiveState {
  phase: DoublePhase
  countdown: number
  segmentIndex: number | null
  type: BetSide | null
  mult: number | null
  history: BetSide[]
  roundId: string
  win: boolean
  prize: number
  totalBet: number
  newBalance: number | null
}

const SIDE_INFO: Record<BetSide, { label: string; accent: string; mult: number }> = {
  black: { label: '⚫ Preto',    accent: '#555',    mult: 2  },
  red:   { label: '🔴 Vermelho', accent: '#CC0000', mult: 2  },
  white: { label: '⬜ Branco',   accent: '#aaa',    mult: 14 },
}

const MAX_HISTORY = 10


export default function Double({ balance, onBalanceChange, onBack }: GameProps) {
  const [bet,     setBet]    = useState('10')
  const [chosen,  setChosen] = useState<BetSide>('black')
  const [phase,   setPhase]  = useState<DoublePhase>('betting')
  const [countdown, setCountdown] = useState(7)
  const [angle,   setAngle]  = useState(0)
  const [result,  setResult] = useState<number | null>(null)
  const [betSent, setBetSent]= useState(false)
  const [message, setMessage]= useState('')
  const [msgColor,setMsgColor]=useState('#fff')
  const [history, setHistory]= useState<BetSide[]>([])
  const [rounds,    setRounds]   = useState(0)
  const [wins,      setWins]     = useState(0)
  const [connected, setConnected]= useState(false)

  const animRef      = useRef<ReturnType<typeof requestAnimationFrame> | null>(null)
  const canvasRef    = useRef<HTMLCanvasElement>(null)
  const angleRef     = useRef(0)
  const phaseRef     = useRef<DoublePhase>('betting')
  const roundIdRef   = useRef('')
  const connectedRef = useRef(false)
  const balanceRef   = useRef(balance)
  balanceRef.current = balance

  const stopAnim = useCallback(() => {
    if (animRef.current) { cancelAnimationFrame(animRef.current); animRef.current = null }
  }, [])
  useEffect(() => () => stopAnim(), [stopAnim])

  // Keep angleRef in sync for animation closures
  useEffect(() => { angleRef.current = angle }, [angle])

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
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, r, start, end); ctx.closePath()
      ctx.fillStyle = SEGMENTS[i].color; ctx.fill()
      ctx.strokeStyle = '#333'; ctx.lineWidth = 1; ctx.stroke()
    }

    if (highlighted !== null) {
      const start = offset + highlighted * slice
      const end   = start + slice
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, r, start, end); ctx.closePath()
      ctx.strokeStyle = '#FFD700'; ctx.lineWidth = 4; ctx.stroke()
    }

    ctx.beginPath(); ctx.arc(cx, cy, 16, 0, 2 * Math.PI)
    ctx.fillStyle = '#07070f'; ctx.fill()
    ctx.strokeStyle = 'rgba(255,215,0,0.3)'; ctx.lineWidth = 2; ctx.stroke()

    ctx.beginPath(); ctx.moveTo(cx - 10, 2); ctx.lineTo(cx + 10, 2); ctx.lineTo(cx, 20); ctx.closePath()
    ctx.fillStyle = '#FFD700'; ctx.fill()
  }

  // ── SSE ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const es = new EventSource(`${BASE}/api/stream/double`)
    es.onopen  = () => { connectedRef.current = true;  setConnected(true) }
    es.onerror = () => { connectedRef.current = false; setConnected(false) }

    es.onmessage = (e) => {
      if (!connectedRef.current) { connectedRef.current = true; setConnected(true) }
      const s    = JSON.parse(e.data) as LiveState
      const prev = phaseRef.current

      if (s.phase === 'betting' && prev !== 'betting') {
        setBetSent(false)
        setMessage('')
        setResult(null)
      }

      if (s.phase === 'spinning' && prev !== 'spinning' && s.segmentIndex !== null) {
        stopAnim()
        const targetSeg  = s.segmentIndex
        const segAngle   = 360 / N
        const baseAngle  = ((-targetSeg * segAngle) % 360 + 360) % 360
        const finalAngle = baseAngle + 360 * (5 + Math.floor(Math.random() * 5))
        const startAngle = angleRef.current
        const startTime  = performance.now()
        const duration   = 3500

        function animate(now: number) {
          const t    = Math.min((now - startTime) / duration, 1)
          const ease = 1 - Math.pow(1 - t, 4)
          const cur  = startAngle + (finalAngle - startAngle) * ease
          angleRef.current = cur
          setAngle(cur)
          if (t < 1) {
            animRef.current = requestAnimationFrame(animate)
          } else {
            const final = finalAngle % 360
            angleRef.current = final
            setAngle(final)
            setResult(targetSeg)
          }
        }
        animRef.current = requestAnimationFrame(animate)
      }

      if (s.phase === 'result' && prev !== 'result') {
        setRounds(r => r + 1)
        setResult(s.segmentIndex)
        setHistory(s.history.slice(0, MAX_HISTORY))
        if (s.newBalance !== null) onBalanceChange(s.newBalance)

        if (s.totalBet > 0) {
          const label = s.type ? SIDE_INFO[s.type].label : ''
          if (s.win) {
            setWins(w => w + 1)
            setMessage(`🎉 ${label} — Ganhou R$ ${s.prize.toFixed(2)}! (${s.mult}×)`)
            setMsgColor('#00e676')
          } else {
            setMessage(`❌ ${label} — Perdeu!`)
            setMsgColor('#ff5252')
          }
        }
      }

      phaseRef.current = s.phase
      roundIdRef.current = s.roundId
      setPhase(s.phase)
      setCountdown(s.countdown)
    }

    return () => { es.close(); stopAnim() }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Bet placement ──────────────────────────────────────────────────────────
  async function handleBet() {
    if (phaseRef.current !== 'betting' || betSent) return
    const betVal = parseFloat(bet) || 0
    if (betVal <= 0 || betVal > balanceRef.current) {
      setMessage('Aposta inválida!'); setMsgColor('#ff5252'); return
    }
    try {
      const res  = await fetch(`${BASE}/api/live/double/bet`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bet: betVal, chosen, roundId: roundIdRef.current }),
      })
      const data = await res.json() as { balance?: number; error?: string }
      if (res.ok) {
        setBetSent(true)
        onBalanceChange(data.balance!)
        setMessage('✅ Aposta confirmada! Aguardando resultado...')
        setMsgColor('#FFD700')
      } else {
        setMessage(data.error ?? 'Erro ao apostar')
        setMsgColor('#ff5252')
      }
    } catch {
      setMessage('Erro na conexão'); setMsgColor('#ff5252')
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  const winRate   = rounds > 0 ? ((wins / rounds) * 100).toFixed(1) : '0.0'
  const isWin     = msgColor === '#00e676'
  const isSpinning = phase === 'spinning'

  return (
    <GameShell title="🎡 DOUBLE" onBack={onBack} balance={balance}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, maxWidth: 440, margin: '0 auto' }}>

        <LiveIndicator connected={connected} />

        {/* Phase countdown banner */}
        <div style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
          background: phase === 'result' ? 'rgba(255,215,0,0.06)' : 'rgba(102,0,204,0.06)',
          border: phase === 'result' ? '1px solid rgba(255,215,0,0.2)' : '1px solid rgba(102,0,204,0.2)',
          borderRadius: 10, padding: '10px 16px',
        }}>
          <span style={{ color: '#555', fontSize: 11, letterSpacing: 1.5 }}>
            {phase === 'betting' ? 'APOSTAS ENCERRAM EM' : phase === 'spinning' ? '🎡 GIRANDO...' : 'PRÓXIMA RODADA EM'}
          </span>
          {phase !== 'spinning' && (
            <span style={{
              fontFamily: 'Orbitron, sans-serif', fontWeight: 900, fontSize: 28,
              color: phase === 'betting' && countdown <= 2 ? '#ff4444' : '#FFD700',
              textShadow: `0 0 14px ${phase === 'betting' && countdown <= 2 ? 'rgba(255,68,68,0.8)' : 'rgba(255,215,0,0.8)'}`,
            }}>
              {countdown}s
            </span>
          )}
          {phase === 'betting' && betSent && (
            <span style={{
              fontSize: 11, color: '#00e676',
              background: 'rgba(0,230,118,0.08)', border: '1px solid rgba(0,230,118,0.2)',
              padding: '2px 12px', borderRadius: 20,
            }}>
              ✅ Aposta registrada
            </span>
          )}
        </div>

        {/* Wheel */}
        <div style={{
          padding: 10,
          background: 'rgba(153,0,238,0.06)',
          border: '1px solid rgba(153,0,238,0.2)',
          borderRadius: '50%',
          boxShadow: isSpinning ? '0 0 40px rgba(153,0,238,0.2)' : '0 0 10px rgba(0,0,0,0.5)',
          transition: 'box-shadow 0.3s',
        }}>
          <canvas ref={canvasRef} width={240} height={240} style={{ borderRadius: '50%', display: 'block' }} />
        </div>

        {/* Side buttons */}
        <div style={{ display: 'flex', gap: 10, width: '100%' }}>
          {(Object.keys(SIDE_INFO) as BetSide[]).map(side => (
            <button
              key={side}
              onClick={() => { if (!betSent && phase === 'betting') setChosen(side) }}
              disabled={betSent || phase !== 'betting'}
              style={{
                flex: 1, padding: '12px 0', fontWeight: 700, fontSize: 13, borderRadius: 10,
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

        {/* Bet + confirm */}
        <div style={{ display: 'flex', gap: 10, width: '100%', alignItems: 'center' }}>
          <label style={{ color: '#555', fontSize: 10, letterSpacing: 1.5, whiteSpace: 'nowrap' }}>APOSTA R$</label>
          <input type="number" min="1" value={bet}
            onChange={e => setBet(e.target.value)}
            disabled={betSent || phase !== 'betting'}
            className="input-field" />
          <button
            onClick={handleBet}
            disabled={betSent || phase !== 'betting'}
            style={{
              background: betSent ? 'rgba(0,230,118,0.1)' : isSpinning ? 'rgba(255,255,255,0.04)' : '#6600CC',
              color: betSent ? '#00e676' : '#fff',
              fontFamily: 'Orbitron, sans-serif', fontWeight: 700, fontSize: 13,
              padding: '10px 20px', borderRadius: 9,
              border: betSent ? '1px solid rgba(0,230,118,0.25)' : isSpinning ? '1px solid rgba(255,255,255,0.08)' : '1px solid transparent',
              whiteSpace: 'nowrap', letterSpacing: 1,
            }}
            onMouseEnter={e => { if (!betSent && phase === 'betting') e.currentTarget.style.boxShadow = '0 4px 20px rgba(102,0,204,0.5)' }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none' }}
          >
            {isSpinning ? '⏳' : betSent ? '✅' : '🎡 APOSTAR'}
          </button>
        </div>

        {message && (
          <div style={{
            color: msgColor,
            background: isWin ? 'rgba(0,230,118,0.08)' : msgColor === '#FFD700' ? 'rgba(255,215,0,0.08)' : 'rgba(255,82,82,0.08)',
            border: `1px solid ${isWin ? 'rgba(0,230,118,0.25)' : msgColor === '#FFD700' ? 'rgba(255,215,0,0.25)' : 'rgba(255,82,82,0.25)'}`,
            borderRadius: 10, fontWeight: 700, fontSize: 15,
            textAlign: 'center', padding: '12px 20px', width: '100%',
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
