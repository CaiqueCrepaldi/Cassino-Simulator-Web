import { useState, useRef, useEffect } from 'react'
import type { GameProps } from '../types'
import GameShell from './GameShell'
import { BASE } from '../api/client'
import { LiveIndicator } from './LiveIndicator'

type Phase = 'betting' | 'flying' | 'crashed'

interface LiveState {
  phase: Phase
  countdown: number
  multiplier: number
  history: number[]
  roundId: string
}

export default function Aviator({ balance, onBalanceChange, onBack }: GameProps) {
  const [bet,         setBet]        = useState('10')
  const [autoCashout, setAutoCashout]= useState('')
  const [autoEnabled, setAutoEnabled]= useState(false)
  const [phase,       setPhase]      = useState<Phase>('betting')
  const [countdown,   setCountdown]  = useState(5)
  const [multiplier,  setMultiplier] = useState(1.0)
  const [cashedOut,   setCashedOut]  = useState(false)
  const [betPlaced,   setBetPlaced]  = useState(false)
  const [message,     setMessage]    = useState('')
  const [msgColor,    setMsgColor]   = useState('#fff')
  const [connected,   setConnected]  = useState(false)
  const [history,     setHistory]    = useState<number[]>([])
  const [rounds,      setRounds]     = useState(0)
  const [wins,        setWins]       = useState(0)
  const [bestMult,    setBestMult]   = useState(0)

  const betRef         = useRef('10')
  const autoEnabledRef = useRef(false)
  const autoCashoutRef = useRef('')
  const betPlacedRef   = useRef(false)
  const cashedOutRef   = useRef(false)
  const connectedRef   = useRef(false)
  const roundIdRef     = useRef('')
  const phasedBet      = useRef(0)
  const balanceRef     = useRef(balance)
  balanceRef.current   = balance
  const prevPhaseRef   = useRef<Phase>('betting')
  const phaseRef       = useRef<Phase>('betting')

  const canvasRef  = useRef<HTMLCanvasElement>(null)
  const rafRef     = useRef<number | null>(null)
  const pointsRef  = useRef<{ x: number; y: number }[]>([])
  const tickRef    = useRef(0)

  useEffect(() => { betRef.current         = bet         }, [bet])
  useEffect(() => { autoEnabledRef.current = autoEnabled }, [autoEnabled])
  useEffect(() => { autoCashoutRef.current = autoCashout }, [autoCashout])

  // ── Canvas ─────────────────────────────────────────────────────────────────
  function drawCanvas() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const W = canvas.width, H = canvas.height
    const crashed   = phaseRef.current === 'crashed'
    const cashedNow = cashedOutRef.current
    const lineColor = crashed && !cashedNow ? '#ff4444' : '#0099FF'

    ctx.clearRect(0, 0, W, H)
    ctx.strokeStyle = 'rgba(255,255,255,0.03)'
    ctx.lineWidth = 1
    for (let x = 0; x <= W; x += 64) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke() }
    for (let y = 0; y <= H; y += 44) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke() }

    const pts = pointsRef.current
    if (pts.length < 2) return

    const grad = ctx.createLinearGradient(0, H, 0, 0)
    if (crashed && !cashedNow) {
      grad.addColorStop(0, 'rgba(255,68,68,0)')
      grad.addColorStop(1, 'rgba(255,68,68,0.1)')
    } else {
      grad.addColorStop(0, 'rgba(0,153,255,0)')
      grad.addColorStop(1, 'rgba(0,153,255,0.13)')
    }
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.moveTo(pts[0].x, H)
    for (const p of pts) ctx.lineTo(p.x, p.y)
    ctx.lineTo(pts[pts.length - 1].x, H)
    ctx.closePath()
    ctx.fill()

    ctx.strokeStyle = lineColor
    ctx.lineWidth = 2.5
    ctx.shadowBlur = 8
    ctx.shadowColor = lineColor
    ctx.beginPath()
    ctx.moveTo(pts[0].x, pts[0].y)
    for (const p of pts) ctx.lineTo(p.x, p.y)
    ctx.stroke()
    ctx.shadowBlur = 0

    const last = pts[pts.length - 1]
    const prev = pts[Math.max(pts.length - 5, 0)]
    const angle = Math.atan2(prev.y - last.y, last.x - prev.x)
    ctx.save()
    ctx.translate(last.x, last.y - 4)
    ctx.rotate(-angle)
    ctx.font = '22px serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(crashed && !cashedNow ? '💥' : '✈️', 0, 0)
    ctx.restore()
  }

  function startRaf() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    const loop = () => { drawCanvas(); rafRef.current = requestAnimationFrame(loop) }
    rafRef.current = requestAnimationFrame(loop)
  }
  function stopRaf() {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null }
  }

  useEffect(() => {
    const es = new EventSource(`${BASE}/api/stream/aviator`)
    es.onopen  = () => { connectedRef.current = true;  setConnected(true) }
    es.onerror = () => { connectedRef.current = false; setConnected(false) }

    es.onmessage = (e) => {
      if (!connectedRef.current) { connectedRef.current = true; setConnected(true) }
      const s    = JSON.parse(e.data) as LiveState
      const prev = prevPhaseRef.current

      if (s.phase === 'betting' && prev !== 'betting') {
        betPlacedRef.current = false
        cashedOutRef.current = false
        phasedBet.current    = 0
        setBetPlaced(false)
        setCashedOut(false)
        setMessage('')
        pointsRef.current = []
        tickRef.current   = 0
        stopRaf()
        const canvas = canvasRef.current
        if (canvas) canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height)
      }

      if (s.phase === 'flying' && prev !== 'flying') {
        pointsRef.current = [{ x: 20, y: (canvasRef.current?.height ?? 200) - 15 }]
        tickRef.current   = 0
        startRaf()
      }

      if (s.phase === 'flying') {
        const W = canvasRef.current?.width  ?? 520
        const H = canvasRef.current?.height ?? 200
        tickRef.current++
        const t     = tickRef.current
        const xProg = Math.min(t / 90, 1)
        const x     = 20 + (W - 50) * xProg
        const rise  = Math.pow(Math.max(s.multiplier - 1, 0) / 9, 0.65)
        const y     = Math.max(H - 15 - rise * (H - 30), 8)
        pointsRef.current.push({ x, y })

        if (autoEnabledRef.current && betPlacedRef.current && !cashedOutRef.current) {
          const av = parseFloat(autoCashoutRef.current)
          if (!isNaN(av) && av > 1 && s.multiplier >= av) performCashout(s.roundId)
        }
      }

      if (s.phase === 'crashed' && prev === 'flying') {
        stopRaf()
        setRounds(r => r + 1)
        setHistory(s.history)
        if (betPlacedRef.current && !cashedOutRef.current) {
          setMessage(`💥 Caiu em ${s.multiplier.toFixed(2)}× — Perdeu R$ ${phasedBet.current.toFixed(2)}!`)
          setMsgColor('#ff5252')
        } else if (!betPlacedRef.current) {
          setMessage(`💥 Avião caiu em ${s.multiplier.toFixed(2)}×`)
          setMsgColor('#ff5252')
        }
      }

      prevPhaseRef.current = s.phase
      phaseRef.current     = s.phase
      roundIdRef.current   = s.roundId
      setPhase(s.phase)
      setCountdown(s.countdown)
      setMultiplier(s.multiplier)
    }

    return () => { es.close(); stopRaf() }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Actions ────────────────────────────────────────────────────────────────
  async function performCashout(roundId: string) {
    if (cashedOutRef.current) return
    cashedOutRef.current = true
    setCashedOut(true)
    try {
      const res  = await fetch(`${BASE}/api/live/aviator/cashout`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roundId }),
      })
      const data = await res.json() as { balance?: number; prize?: number; mult?: number; error?: string }
      if (res.ok) {
        onBalanceChange(data.balance!)
        setWins(w => w + 1)
        setBestMult(prev => data.mult! > prev ? data.mult! : prev)
        setMessage(`✅ Retirou em ${data.mult!.toFixed(2)}× — Ganhou R$ ${data.prize!.toFixed(2)}!`)
        setMsgColor('#00e676')
      } else {
        cashedOutRef.current = false
        setCashedOut(false)
        setMessage(data.error ?? 'Erro ao retirar')
        setMsgColor('#ff5252')
      }
    } catch {
      cashedOutRef.current = false
      setCashedOut(false)
    }
  }

  function handleCashout() {
    if (phaseRef.current !== 'flying' || cashedOutRef.current || !betPlacedRef.current) return
    performCashout(roundIdRef.current)
  }

  async function placeBet() {
    if (phaseRef.current !== 'betting' || betPlacedRef.current) return
    const betVal = parseFloat(betRef.current) || 0
    if (betVal <= 0 || betVal > balanceRef.current) {
      setMessage('Aposta inválida!'); setMsgColor('#ff5252'); return
    }
    try {
      const res  = await fetch(`${BASE}/api/live/aviator/bet`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bet: betVal, roundId: roundIdRef.current }),
      })
      const data = await res.json() as { balance?: number; error?: string }
      if (res.ok) {
        betPlacedRef.current = true
        phasedBet.current    = betVal
        setBetPlaced(true)
        onBalanceChange(data.balance!)
        setMessage('')
      } else {
        setMessage(data.error ?? 'Erro ao apostar')
        setMsgColor('#ff5252')
      }
    } catch {
      setMessage('Erro na conexão'); setMsgColor('#ff5252')
    }
  }

  function addToBet(amount: number) {
    if (phaseRef.current === 'flying' || betPlacedRef.current) return
    const next = String((parseFloat(betRef.current) || 0) + amount)
    betRef.current = next
    setBet(next)
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  const winRate  = rounds > 0 ? ((wins / rounds) * 100).toFixed(1) : '0.0'
  const isWin    = msgColor === '#00e676'
  const multColor = phase === 'crashed' && !cashedOut
    ? '#ff4444'
    : multiplier >= 3 ? '#00e676' : multiplier >= 2 ? '#FFD700' : '#fff'

  return (
    <GameShell title="✈️ AVIATOR" onBack={onBack} balance={balance}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, maxWidth: 540, margin: '0 auto' }}>

        <LiveIndicator connected={connected} />

        {/* Crash history */}
        <div style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 8,
          background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 8, padding: '7px 12px',
        }}>
          <span style={{ color: '#444', fontSize: 10, letterSpacing: 1, whiteSpace: 'nowrap' }}>Últimos crashes:</span>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', flex: 1 }}>
            {history.length === 0
              ? <span style={{ color: '#333', fontSize: 12 }}>—</span>
              : history.map((h, i) => (
                <span key={i} style={{
                  background: h < 1.5 ? 'rgba(255,68,68,0.12)' : h < 2 ? 'rgba(255,215,0,0.12)' : 'rgba(0,230,118,0.12)',
                  color:      h < 1.5 ? '#ff4444'              : h < 2 ? '#FFD700'              : '#00e676',
                  border: `1px solid ${h < 1.5 ? 'rgba(255,68,68,0.3)' : h < 2 ? 'rgba(255,215,0,0.3)' : 'rgba(0,230,118,0.3)'}`,
                  padding: '2px 8px', borderRadius: 20, fontSize: 11,
                  fontFamily: 'Orbitron, sans-serif', fontWeight: 700,
                }}>
                  {h.toFixed(2)}×
                </span>
              ))}
          </div>
        </div>

        {/* Canvas */}
        <div style={{
          width: '100%', position: 'relative',
          background: 'rgba(0,6,20,0.95)',
          border: `1px solid ${
            phase === 'flying'  ? 'rgba(0,153,255,0.45)' :
            phase === 'betting' ? 'rgba(255,215,0,0.22)'  :
                                  'rgba(255,68,68,0.3)'
          }`,
          borderRadius: 14, overflow: 'hidden',
          boxShadow: phase === 'flying' ? '0 0 28px rgba(0,153,255,0.1)' : 'none',
          transition: 'border-color 0.3s, box-shadow 0.3s',
        }}>
          <canvas ref={canvasRef} width={520} height={200}
            style={{ width: '100%', height: 200, display: 'block' }} />

          {phase === 'betting' && (
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(0,0,0,0.68)',
            }}>
              <div style={{ fontSize: 11, color: '#666', letterSpacing: 2, marginBottom: 8 }}>PRÓXIMO VOO EM</div>
              <div style={{
                fontSize: 68, fontFamily: 'Orbitron, sans-serif', fontWeight: 900, lineHeight: 1,
                color: countdown <= 2 ? '#ff4444' : '#FFD700',
                textShadow: `0 0 30px ${countdown <= 2 ? 'rgba(255,68,68,0.9)' : 'rgba(255,215,0,0.9)'}`,
              }}>
                {countdown}
              </div>
              <div style={{ fontSize: 10, color: '#444', letterSpacing: 1.5, marginTop: 5 }}>SEGUNDOS</div>
              {betPlaced && (
                <div style={{
                  marginTop: 12, fontSize: 12, color: '#00e676',
                  background: 'rgba(0,230,118,0.08)', border: '1px solid rgba(0,230,118,0.2)',
                  padding: '4px 18px', borderRadius: 20,
                }}>
                  ✅ Aposta de R$ {bet} registrada!
                </div>
              )}
            </div>
          )}

          {phase !== 'betting' && (
            <div style={{
              position: 'absolute', top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center', pointerEvents: 'none',
            }}>
              <div style={{
                fontSize: 56, fontFamily: 'Orbitron, sans-serif', fontWeight: 900, lineHeight: 1,
                color: multColor,
                textShadow: `0 0 30px ${phase === 'crashed' && !cashedOut ? 'rgba(255,68,68,0.8)' : 'rgba(0,153,255,0.7)'}`,
              }}>
                {multiplier.toFixed(2)}×
              </div>
              <div style={{ fontSize: 10, color: '#555', letterSpacing: 1.5, marginTop: 5 }}>
                {phase === 'flying' ? 'VOANDO' : cashedOut ? '✅ RETIRADO' : '💥 CRASH'}
              </div>
              {phase === 'crashed' && (
                <div style={{ fontSize: 11, color: '#555', letterSpacing: 1.5, marginTop: 8 }}>
                  PRÓXIMO VOO EM <span style={{ color: '#FFD700', fontFamily: 'Orbitron, sans-serif', fontWeight: 900 }}>{countdown}s</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Auto cashout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%' }}>
          <span style={{ color: '#FFD700', fontSize: 12, whiteSpace: 'nowrap' }}>⚡ Saque Automático:</span>
          <input
            type="text" placeholder="Ex: 2.00x"
            value={autoCashout}
            onChange={e => setAutoCashout(e.target.value.replace('x', ''))}
            disabled={phase === 'flying'}
            style={{
              flex: 1, background: autoEnabled ? 'rgba(255,215,0,0.07)' : 'rgba(255,255,255,0.05)',
              color: '#fff', border: `1px solid ${autoEnabled ? 'rgba(255,215,0,0.35)' : 'rgba(255,255,255,0.1)'}`,
              borderRadius: 8, padding: '9px 12px', fontSize: 13, outline: 'none',
            }}
          />
          <button
            onClick={() => setAutoEnabled(e => !e)}
            disabled={phase === 'flying'}
            style={{
              padding: '9px 18px', borderRadius: 8, fontWeight: 700, fontSize: 12,
              background: autoEnabled ? 'rgba(0,230,118,0.15)' : 'rgba(255,255,255,0.05)',
              color:      autoEnabled ? '#00e676' : '#666',
              border:     autoEnabled ? '1px solid rgba(0,230,118,0.35)' : '1px solid rgba(255,255,255,0.08)',
              transition: 'all 0.2s',
            }}
          >
            {autoEnabled ? 'ON' : 'OFF'}
          </button>
          {!autoEnabled && <span style={{ color: '#333', fontSize: 11, whiteSpace: 'nowrap' }}>Desativado</span>}
        </div>

        {/* Bet row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
          <span style={{ color: '#888', fontSize: 12, whiteSpace: 'nowrap' }}>Aposta (R$):</span>
          <input
            type="number" min="1" value={bet}
            onChange={e => { setBet(e.target.value); betRef.current = e.target.value }}
            disabled={phase === 'flying' || betPlaced}
            className="input-field" style={{ flex: 1, minWidth: 0 }}
          />
          {([10, 25, 50, 100] as const).map(amt => (
            <button key={amt} onClick={() => addToBet(amt)}
              disabled={phase === 'flying' || betPlaced}
              style={{
                padding: '8px 10px', borderRadius: 7, fontWeight: 700, fontSize: 12,
                background: 'rgba(0,153,255,0.12)', color: '#0099FF',
                border: '1px solid rgba(0,153,255,0.25)', flexShrink: 0,
              }}>
              +{amt}
            </button>
          ))}
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 10, width: '100%' }}>
          <button
            onClick={placeBet}
            disabled={phase !== 'betting' || betPlaced}
            style={{
              flex: 2, padding: '14px 0', borderRadius: 10,
              background: betPlaced
                ? 'rgba(0,230,118,0.12)'
                : phase === 'betting' ? '#1A56CC' : 'rgba(255,255,255,0.04)',
              color: betPlaced ? '#00e676' : '#fff',
              fontFamily: 'Orbitron, sans-serif', fontWeight: 700, fontSize: 14, letterSpacing: 1,
              border: betPlaced
                ? '1px solid rgba(0,230,118,0.25)'
                : phase === 'betting' ? '1px solid transparent' : '1px solid rgba(255,255,255,0.07)',
            }}
            onMouseEnter={e => { if (phase === 'betting' && !betPlaced) e.currentTarget.style.boxShadow = '0 4px 24px rgba(26,86,204,0.55)' }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none' }}
          >
            {betPlaced ? '✅ APOSTA REGISTRADA' : '✈️ APOSTAR & VOAR'}
          </button>
          <button
            onClick={handleCashout}
            disabled={phase !== 'flying' || cashedOut || !betPlaced}
            style={{
              flex: 1, padding: '14px 0', borderRadius: 10,
              background: phase === 'flying' && !cashedOut && betPlaced
                ? '#EE6600' : 'rgba(255,255,255,0.04)',
              color: '#fff',
              fontFamily: 'Orbitron, sans-serif', fontWeight: 700, fontSize: 14, letterSpacing: 1,
              border: phase === 'flying' && !cashedOut && betPlaced
                ? '1px solid transparent' : '1px solid rgba(255,255,255,0.07)',
            }}
            onMouseEnter={e => { if (phase === 'flying' && !cashedOut && betPlaced) e.currentTarget.style.boxShadow = '0 4px 24px rgba(238,102,0,0.55)' }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none' }}
          >
            🔥 RETIRAR
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

        <button
          onClick={() =>
            fetch(`${BASE}/api/balance/reset`, { method: 'POST' })
              .then(r => r.json())
              .then((d: { balance: number }) => {
                onBalanceChange(d.balance)
                setMessage(''); setRounds(0); setWins(0); setBestMult(0)
              })
              .catch(() => {})
          }
          style={{
            background: 'rgba(255,255,255,0.03)', color: '#444',
            border: '1px solid rgba(255,255,255,0.07)', fontSize: 12,
            padding: '10px 0', borderRadius: 9, width: '100%',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = '#888' }}
          onMouseLeave={e => { e.currentTarget.style.color = '#444' }}
        >
          📊 NOVO JOGO (resetar banca)
        </button>

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
