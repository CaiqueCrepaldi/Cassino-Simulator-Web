import React, { useState, useRef, useEffect } from 'react'
import type { GameProps } from '../types'
import GameShell from './GameShell'
import { BASE } from '../api/client'
import { LiveIndicator } from './LiveIndicator'

type Suit = '♠' | '♥' | '♦' | '♣'
type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K'
interface Card { rank: Rank; suit: Suit }

function isRed(s: Suit) { return s === '♥' || s === '♦' }

type BetSide = 'player' | 'banker' | 'tie'
type BaccaratPhase = 'betting' | 'result'

interface LiveState {
  phase: BaccaratPhase
  countdown: number
  playerCards: Card[] | null
  bankerCards: Card[] | null
  winner: BetSide | null
  playerScore: number | null
  bankerScore: number | null
  history: BetSide[]
  roundId: string
  win: boolean
  prize: number
  totalBet: number
  newBalance: number | null
}

const BET_OPTIONS: { label: string; key: BetSide; accent: string; payout: string }[] = [
  { label: '🧑 Jogador', key: 'player', accent: '#0055CC', payout: '1×'    },
  { label: '🏦 Banca',   key: 'banker', accent: '#CC0000', payout: '0.95×' },
  { label: '🤝 Empate',  key: 'tie',    accent: '#007755', payout: '8×'    },
]

export default function Baccarat({ balance, onBalanceChange, onBack }: GameProps) {
  const [bet,         setBet]        = useState('10')
  const [chosen,      setChosen]     = useState<BetSide>('player')
  const [phase,       setPhase]      = useState<BaccaratPhase>('betting')
  const [countdown,   setCountdown]  = useState(7)
  const [playerCards, setPlayerCards]= useState<Card[]>([])
  const [bankerCards, setBankerCards]= useState<Card[]>([])
  const [winner,      setWinner]     = useState<BetSide | null>(null)
  const [playerScore, setPlayerScore]= useState<number | null>(null)
  const [bankerScore, setBankerScore]= useState<number | null>(null)
  const [history,     setHistory]    = useState<BetSide[]>([])
  const [betSent,     setBetSent]    = useState(false)
  const [message,     setMessage]    = useState('')
  const [msgColor,    setMsgColor]   = useState('#fff')
  const [rounds,      setRounds]     = useState(0)
  const [wins,        setWins]       = useState(0)
  const [connected,   setConnected]  = useState(false)

  const phaseRef     = useRef<BaccaratPhase>('betting')
  const roundIdRef   = useRef('')
  const connectedRef = useRef(false)
  const chosenRef    = useRef<BetSide>('player')
  const balanceRef   = useRef(balance)
  balanceRef.current = balance
  chosenRef.current  = chosen

  // ── SSE ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const es = new EventSource(`${BASE}/api/stream/baccarat`)
    es.onopen  = () => { connectedRef.current = true;  setConnected(true) }
    es.onerror = () => { connectedRef.current = false; setConnected(false) }

    es.onmessage = (e) => {
      if (!connectedRef.current) { connectedRef.current = true; setConnected(true) }
      const s    = JSON.parse(e.data) as LiveState
      const prev = phaseRef.current

      if (s.phase === 'betting' && prev !== 'betting') {
        setBetSent(false)
        setMessage('')
        setPlayerCards([])
        setBankerCards([])
        setWinner(null)
        setPlayerScore(null)
        setBankerScore(null)
      }

      if (s.phase === 'result' && prev !== 'result') {
        setPlayerCards(s.playerCards ?? [])
        setBankerCards(s.bankerCards ?? [])
        setWinner(s.winner)
        setPlayerScore(s.playerScore)
        setBankerScore(s.bankerScore)
        setHistory(s.history)
        if (s.newBalance !== null) onBalanceChange(s.newBalance)

        const winnerLabel = s.winner === 'player' ? 'Jogador' : s.winner === 'banker' ? 'Banca' : 'Empate'
        if (s.totalBet > 0) {
          setRounds(r => r + 1)
          if (s.win) {
            setWins(w => w + 1)
            setMessage(`🎉 ${winnerLabel} venceu! (${s.playerScore} vs ${s.bankerScore}) — Ganhou R$ ${s.prize.toFixed(2)}!`)
            setMsgColor('#00e676')
          } else if (s.winner === 'tie' && chosenRef.current !== 'tie') {
            setMessage(`🤝 Empate! (${s.playerScore} vs ${s.bankerScore}) — Aposta devolvida!`)
            setMsgColor('#FFD700')
          } else {
            setMessage(`❌ ${winnerLabel} venceu! (${s.playerScore} vs ${s.bankerScore}) — Perdeu!`)
            setMsgColor('#ff5252')
          }
        } else {
          setMessage(`${winnerLabel} venceu (${s.playerScore} vs ${s.bankerScore})`)
          setMsgColor('#fff')
        }
      }

      phaseRef.current  = s.phase
      roundIdRef.current = s.roundId
      setPhase(s.phase)
      setCountdown(s.countdown)
    }

    return () => es.close()
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
      const res  = await fetch(`${BASE}/api/live/baccarat/bet`, {
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
  const winRate = rounds > 0 ? ((wins / rounds) * 100).toFixed(1) : '0.0'
  const isWin   = msgColor === '#00e676'
  const isTie   = msgColor === '#FFD700'
  const isResult = phase === 'result'

  return (
    <GameShell title="🎴 BACCARAT" onBack={onBack} balance={balance}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, maxWidth: 480, margin: '0 auto' }}>

        <LiveIndicator connected={connected} />

        {/* Countdown */}
        {phase === 'betting' && (
          <div style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
            background: 'rgba(34,34,138,0.06)', border: '1px solid rgba(34,34,138,0.25)',
            borderRadius: 10, padding: '10px 16px',
          }}>
            <span style={{ color: '#555', fontSize: 11, letterSpacing: 1.5 }}>APOSTAS ENCERRAM EM</span>
            <span style={{
              fontFamily: 'Orbitron, sans-serif', fontWeight: 900, fontSize: 28,
              color: countdown <= 2 ? '#ff4444' : '#FFD700',
              textShadow: `0 0 14px ${countdown <= 2 ? 'rgba(255,68,68,0.8)' : 'rgba(255,215,0,0.8)'}`,
            }}>
              {countdown}s
            </span>
            {betSent && (
              <span style={{
                fontSize: 11, color: '#00e676',
                background: 'rgba(0,230,118,0.08)', border: '1px solid rgba(0,230,118,0.2)',
                padding: '2px 12px', borderRadius: 20,
              }}>
                ✅ Aposta registrada
              </span>
            )}
          </div>
        )}

        {/* Result countdown */}
        {isResult && (
          <div style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
            background: 'rgba(34,34,138,0.06)', border: '1px solid rgba(34,34,138,0.25)',
            borderRadius: 10, padding: '10px 16px',
          }}>
            <span style={{ color: '#555', fontSize: 11, letterSpacing: 1.5 }}>PRÓXIMA RODADA EM</span>
            <span style={{
              fontFamily: 'Orbitron, sans-serif', fontWeight: 900, fontSize: 28, color: '#FFD700',
              textShadow: '0 0 14px rgba(255,215,0,0.8)',
            }}>
              {countdown}s
            </span>
          </div>
        )}

        {/* Player & Banker hands */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, width: '100%' }}>
          {[
            { label: 'JOGADOR', cards: playerCards, score: playerScore, accent: '#0055CC', isWinner: winner === 'player' },
            { label: 'BANCA',   cards: bankerCards, score: bankerScore, accent: '#CC0000', isWinner: winner === 'banker' },
          ].map(side => (
            <div key={side.label} className="glass" style={{
              padding: '14px',
              borderColor: side.isWinner ? `${side.accent}66` : `${side.accent}25`,
              boxShadow: side.isWinner ? `0 0 16px ${side.accent}22` : 'none',
              transition: 'all 0.3s',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <p style={{ color: '#555', fontSize: 10, letterSpacing: 1.5 }}>{side.label}</p>
                {side.score !== null && (
                  <span style={{
                    fontFamily: 'Orbitron, sans-serif', fontWeight: 900, fontSize: 18,
                    color: side.isWinner ? side.accent : '#444',
                  }}>
                    {side.score}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: 7, minHeight: 90 }}>
                {side.cards.map((c, i) => <BaccaratCard key={i} card={c} index={i} />)}
              </div>
            </div>
          ))}
        </div>

        {/* Tie result badge */}
        {isResult && winner === 'tie' && (
          <div style={{
            background: 'rgba(0,119,85,0.15)', color: '#00e676',
            border: '1px solid rgba(0,119,85,0.4)',
            padding: '8px 24px', borderRadius: 20,
            fontFamily: 'Orbitron, sans-serif', fontWeight: 700, fontSize: 14,
          }}>
            🤝 EMPATE ({playerScore} vs {bankerScore})
          </div>
        )}

        {/* Side buttons */}
        <div style={{ display: 'flex', gap: 10, width: '100%' }}>
          {BET_OPTIONS.map(o => (
            <button
              key={o.key}
              onClick={() => { if (!betSent && phase === 'betting') setChosen(o.key) }}
              disabled={betSent || phase !== 'betting'}
              style={{
                flex: 1, padding: '13px 0', fontWeight: 700, fontSize: 13, borderRadius: 10,
                background: chosen === o.key ? `${o.accent}22` : 'rgba(255,255,255,0.03)',
                color: chosen === o.key ? '#fff' : '#555',
                border: chosen === o.key ? `1px solid ${o.accent}55` : '1px solid rgba(255,255,255,0.07)',
                boxShadow: chosen === o.key ? `0 0 16px ${o.accent}33` : 'none',
                transition: 'all 0.2s',
              }}
            >
              {o.label}<br />
              <span style={{ fontSize: 11, color: chosen === o.key ? o.accent : '#444', fontFamily: 'Orbitron, sans-serif' }}>
                {o.payout}
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
              background: betSent ? 'rgba(0,230,118,0.1)' : isResult ? 'rgba(255,255,255,0.04)' : '#22228a',
              color: betSent ? '#00e676' : '#fff',
              fontFamily: 'Orbitron, sans-serif', fontWeight: 700, fontSize: 13,
              padding: '10px 20px', borderRadius: 9,
              border: betSent ? '1px solid rgba(0,230,118,0.25)' : isResult ? '1px solid rgba(255,255,255,0.08)' : '1px solid transparent',
              whiteSpace: 'nowrap', letterSpacing: 1,
            }}
            onMouseEnter={e => { if (!betSent && phase === 'betting') e.currentTarget.style.boxShadow = '0 4px 20px rgba(34,34,138,0.5)' }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none' }}
          >
            {betSent ? '✅ APOSTADO' : '🎴 APOSTAR'}
          </button>
        </div>

        {message && (
          <div style={{
            color: msgColor,
            background: isWin ? 'rgba(0,230,118,0.08)' : isTie ? 'rgba(255,215,0,0.08)' : 'rgba(255,82,82,0.08)',
            border: `1px solid ${isWin ? 'rgba(0,230,118,0.25)' : isTie ? 'rgba(255,215,0,0.25)' : 'rgba(255,82,82,0.25)'}`,
            borderRadius: 10, fontWeight: 700, fontSize: 15,
            textAlign: 'center', padding: '12px 20px', width: '100%',
          }}>
            {message}
          </div>
        )}

        {/* History */}
        {history.length > 0 && (
          <div style={{ width: '100%' }}>
            <p style={{ color: '#444', fontSize: 10, letterSpacing: 1.5, marginBottom: 8 }}>ÚLTIMOS RESULTADOS</p>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {history.map((h, i) => (
                <span key={i} style={{
                  fontSize: 11, fontFamily: 'Orbitron, sans-serif', fontWeight: 700,
                  padding: '2px 8px', borderRadius: 20,
                  background: h === 'player' ? 'rgba(0,85,204,0.15)' : h === 'banker' ? 'rgba(204,0,0,0.15)' : 'rgba(0,119,85,0.15)',
                  color: h === 'player' ? '#0077FF' : h === 'banker' ? '#FF3333' : '#00e676',
                  border: `1px solid ${h === 'player' ? 'rgba(0,85,204,0.3)' : h === 'banker' ? 'rgba(204,0,0,0.3)' : 'rgba(0,119,85,0.3)'}`,
                }}>
                  {h === 'player' ? 'J' : h === 'banker' ? 'B' : 'E'}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="glass" style={{ padding: '10px 16px', width: '100%' }}>
          <p style={{ color: '#444', fontSize: 11, textAlign: 'center' }}>
            Jogador: <span style={{ color: '#0055CC', fontFamily: 'Orbitron, sans-serif' }}>1×</span>
            {'  ·  '}
            Banca: <span style={{ color: '#CC0000', fontFamily: 'Orbitron, sans-serif' }}>0.95×</span>
            {'  ·  '}
            Empate: <span style={{ color: '#007755', fontFamily: 'Orbitron, sans-serif' }}>8×</span>
          </p>
          <p style={{ color: '#333', fontSize: 11, textAlign: 'center', marginTop: 4 }}>
            Empate devolve apostas em Jogador/Banca
          </p>
        </div>

        <div className="stats-bar">
          <div className="stat-item"><span className="stat-label">RODADAS</span><span className="stat-value">{rounds}</span></div>
          <div className="stat-item"><span className="stat-label">VITÓRIAS</span><span className="stat-value">{wins}</span></div>
          <div className="stat-item"><span className="stat-label">TAXA</span><span className="stat-value">{winRate}%</span></div>
        </div>
      </div>
    </GameShell>
  )
}

function BaccaratCard({ card, index = 0 }: { card: Card; index?: number }) {
  const red = isRed(card.suit)
  const dealStyle: React.CSSProperties = {
    animation: 'cardDeal 0.32s ease-out both',
    animationDelay: `${index * 0.07}s`,
  }
  return (
    <div style={{
      width: 56, height: 82,
      background: '#fafafa', borderRadius: 8, border: '1px solid #ddd',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      color: red ? '#CC0000' : '#111',
      fontWeight: 700, userSelect: 'none',
      boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
      ...dealStyle,
    }}>
      <span style={{ fontSize: 16 }}>{card.rank}</span>
      <span style={{ fontSize: 20 }}>{card.suit}</span>
    </div>
  )
}
