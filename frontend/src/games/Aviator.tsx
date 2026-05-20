import { useState, useRef, useEffect } from 'react'
import type { GameProps } from '../types'
import GameShell from './GameShell'
import { api } from '../api/client'

const MAX_HISTORY = 10
const BETTING_SEC  = 5
const TICK_MS      = 100
const MULT_FACTOR  = 1.015

function localCrash(): number {
  return Math.max(1.01, +(-Math.log(Math.random()) * 0.85 + 1.0).toFixed(2))
}

export default function Aviator({ balance, onBalanceChange, onBack }: GameProps) {
  const [bet,          setBet]         = useState('10')
  const [autoCashout,  setAutoCashout] = useState('')
  const [autoEnabled,  setAutoEnabled] = useState(false)
  const [phase,        setPhase]       = useState<'betting' | 'flying' | 'crashed'>('betting')
  const [countdown,    setCountdown]   = useState(BETTING_SEC)
  const [multiplier,   setMultiplier]  = useState(1.0)
  const [cashedOut,    setCashedOut]   = useState(false)
  const [betPlaced,    setBetPlaced]   = useState(false)
  const [message,      setMessage]     = useState('')
  const [msgColor,     setMsgColor]    = useState('#fff')
  const [history,      setHistory]     = useState<number[]>([])
  const [rounds,       setRounds]      = useState(0)
  const [wins,         setWins]        = useState(0)
  const [bestMult,     setBestMult]    = useState(0)

  // Refs kept in sync for interval-safe reads
  const betRef          = useRef('10')
  const autoEnabledRef  = useRef(false)
  const autoCashoutRef  = useRef('')
  const betPlacedRef    = useRef(false)
  const cashedOutRef    = useRef(false)
  const crashedRef      = useRef(false)
  const crashRef        = useRef(1.0)
  const multRef         = useRef(1.0)
  const tickRef         = useRef(0)
  const phasedBet       = useRef(0)
  const balanceRef      = useRef(balance)
  balanceRef.current    = balance

  const flyIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const cntIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const rafRef         = useRef<number | null>(null)
  const pointsRef      = useRef<{ x: number; y: number }[]>([])
  const canvasRef      = useRef<HTMLCanvasElement>(null)

  useEffect(() => { betRef.current         = bet },         [bet])
  useEffect(() => { autoEnabledRef.current = autoEnabled }, [autoEnabled])
  useEffect(() => { autoCashoutRef.current = autoCashout }, [autoCashout])

  // ── Canvas ──────────────────────────────────────────────────────────────────
  function drawCanvas() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const W = canvas.width
    const H = canvas.height
    const crashed   = crashedRef.current
    const cashedNow = cashedOutRef.current
    const lineColor = crashed && !cashedNow ? '#ff4444' : '#0099FF'

    ctx.clearRect(0, 0, W, H)

    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.03)'
    ctx.lineWidth = 1
    for (let x = 0; x <= W; x += 64) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke() }
    for (let y = 0; y <= H; y += 44) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke() }

    const pts = pointsRef.current
    if (pts.length < 2) return

    // Gradient fill
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

    // Curve line
    ctx.strokeStyle = lineColor
    ctx.lineWidth = 2.5
    ctx.shadowBlur = 8
    ctx.shadowColor = lineColor
    ctx.beginPath()
    ctx.moveTo(pts[0].x, pts[0].y)
    for (const p of pts) ctx.lineTo(p.x, p.y)
    ctx.stroke()
    ctx.shadowBlur = 0

    // Plane / explosion at tip
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
    stopRaf()
    const loop = () => { drawCanvas(); rafRef.current = requestAnimationFrame(loop) }
    rafRef.current = requestAnimationFrame(loop)
  }
  function stopRaf()  { if (rafRef.current)         { cancelAnimationFrame(rafRef.current);     rafRef.current         = null } }
  function stopFly()  { if (flyIntervalRef.current)  { clearInterval(flyIntervalRef.current);    flyIntervalRef.current = null } }
  function stopCnt()  { if (cntIntervalRef.current)  { clearInterval(cntIntervalRef.current);    cntIntervalRef.current = null } }

  // ── startBetting ref (avoids stale closure in setTimeout) ──────────────────
  const startBettingRef = useRef<() => void>(() => {})

  // ── Betting phase ───────────────────────────────────────────────────────────
  function startBetting() {
    stopFly(); stopCnt(); stopRaf()
    betPlacedRef.current  = false
    cashedOutRef.current  = false
    crashedRef.current    = false
    multRef.current       = 1.0
    tickRef.current       = 0
    pointsRef.current     = []

    setPhase('betting'); setCountdown(BETTING_SEC); setBetPlaced(false)
    setCashedOut(false);  setMessage('');             setMultiplier(1.0)

    const canvas = canvasRef.current
    if (canvas) canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height)

    let cnt = BETTING_SEC
    cntIntervalRef.current = setInterval(() => {
      cnt--
      setCountdown(cnt)
      if (cnt <= 0) { stopCnt(); startFlightInternal() }
    }, 1000)
  }
  startBettingRef.current = startBetting

  // ── Flight ──────────────────────────────────────────────────────────────────
  async function startFlightInternal() {
    const placed = betPlacedRef.current
    const betVal = parseFloat(betRef.current) || 0
    let crashAt: number

    try {
      if (placed && betVal > 0) {
        const res = await api.aviator.generate(betVal)
        crashAt = res.crashAt
        phasedBet.current = betVal
        onBalanceChange(res.balance)
      } else {
        crashAt = localCrash()
      }
    } catch {
      crashAt = localCrash()
      betPlacedRef.current = false
      setBetPlaced(false)
      phasedBet.current = 0
    }

    crashRef.current = crashAt
    multRef.current  = 1.0
    tickRef.current  = 0

    const W = canvasRef.current?.width  ?? 520
    const H = canvasRef.current?.height ?? 200
    pointsRef.current = [{ x: 20, y: H - 15 }]

    setPhase('flying')
    setMultiplier(1.0)
    startRaf()

    flyIntervalRef.current = setInterval(() => {
      tickRef.current++
      const t    = tickRef.current
      const mult = parseFloat(Math.pow(MULT_FACTOR, t).toFixed(2))
      multRef.current = mult
      setMultiplier(mult)

      // Add canvas point
      const xProg = Math.min(t / 90, 1)
      const x     = 20 + (W - 50) * xProg
      const rise  = Math.pow(Math.max(mult - 1, 0) / 9, 0.65)
      const y     = Math.max(H - 15 - rise * (H - 30), 8)
      pointsRef.current = [...pointsRef.current, { x, y }]

      // Auto cashout
      if (autoEnabledRef.current && betPlacedRef.current && !cashedOutRef.current) {
        const av = parseFloat(autoCashoutRef.current)
        if (!isNaN(av) && av > 1 && mult >= av) { doWin(phasedBet.current, mult); return }
      }

      // Crash
      if (mult >= crashAt) {
        stopFly()
        crashedRef.current = true
        setPhase('crashed')
        setRounds(r => r + 1)
        setHistory(h => [crashAt, ...h].slice(0, MAX_HISTORY))

        if (betPlacedRef.current && !cashedOutRef.current) {
          setMessage(`💥 Caiu em ${crashAt.toFixed(2)}× — Perdeu R$ ${phasedBet.current.toFixed(2)}!`)
          setMsgColor('#ff5252')
        } else {
          setMessage(`💥 Avião caiu em ${crashAt.toFixed(2)}×`)
          setMsgColor('#ff5252')
        }
        setTimeout(() => startBettingRef.current(), 3000)
      }
    }, TICK_MS)
  }

  // ── Cash out ────────────────────────────────────────────────────────────────
  function doWin(betVal: number, mult: number) {
    stopFly()
    cashedOutRef.current = true
    setCashedOut(true)
    setPhase('crashed')
    setRounds(r => r + 1)
    setWins(w => w + 1)
    setBestMult(prev => mult > prev ? mult : prev)
    setHistory(h => [crashRef.current, ...h].slice(0, MAX_HISTORY))

    api.aviator.settle(betVal, crashRef.current, mult)
      .then(r => {
        onBalanceChange(r.balance)
        setMessage(`✅ Retirou em ${mult.toFixed(2)}× — Ganhou R$ ${r.prize.toFixed(2)}!`)
        setMsgColor('#00e676')
      })
      .catch(() => {})

    setTimeout(() => startBettingRef.current(), 3000)
  }

  function handleCashout() {
    if (phase !== 'flying' || cashedOutRef.current || !betPlacedRef.current) return
    doWin(phasedBet.current, multRef.current)
  }

  function placeBet() {
    if (phase !== 'betting' || betPlaced) return
    const betVal = parseFloat(betRef.current) || 0
    if (betVal <= 0 || betVal > balanceRef.current) { setMessage('Aposta inválida!'); setMsgColor('#ff5252'); return }
    betPlacedRef.current = true
    setBetPlaced(true)
    setMessage('')
  }

  function addToBet(amount: number) {
    if (phase === 'flying' || betPlaced) return
    const next = String((parseFloat(betRef.current) || 0) + amount)
    betRef.current = next
    setBet(next)
  }

  useEffect(() => {
    startBettingRef.current()
    return () => { stopFly(); stopCnt(); stopRaf() }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const winRate = rounds > 0 ? ((wins / rounds) * 100).toFixed(1) : '0.0'
  const isWin   = msgColor === '#00e676'

  const multColor = phase === 'crashed' && !cashedOut
    ? '#ff4444'
    : multiplier >= 3 ? '#00e676' : multiplier >= 2 ? '#FFD700' : '#fff'

  return (
    <GameShell title="✈️ AVIATOR" onBack={onBack} balance={balance}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, maxWidth: 540, margin: '0 auto' }}>

        {/* Crash history bar */}
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

        {/* Canvas flight area */}
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

          {/* Betting countdown overlay */}
          {phase === 'betting' && (
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(0,0,0,0.68)',
            }}>
              <div style={{ fontSize: 11, color: '#666', letterSpacing: 2, marginBottom: 8 }}>
                PRÓXIMO VOO EM
              </div>
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

          {/* Multiplier overlay during flight / crash */}
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
            </div>
          )}
        </div>

        {/* Auto cashout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%' }}>
          <span style={{ color: '#FFD700', fontSize: 12, whiteSpace: 'nowrap' }}>
            ⚡ Saque Automático:
          </span>
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
          {!autoEnabled && (
            <span style={{ color: '#333', fontSize: 11, whiteSpace: 'nowrap' }}>Desativado</span>
          )}
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

        {/* Action buttons */}
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
            api.balance.reset()
              .then(r => { onBalanceChange(r.balance); setMessage(''); setRounds(0); setWins(0); setBestMult(0) })
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
