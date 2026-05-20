import React, { useState } from 'react'
import type { GameProps } from '../types'
import GameShell from './GameShell'
import { api } from '../api/client'

type Suit = '♠' | '♥' | '♦' | '♣'
type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K'
interface Card { rank: Rank; suit: Suit }

function isRed(s: Suit) { return s === '♥' || s === '♦' }

type BetSide = 'player' | 'banker' | 'tie'

export default function Baccarat({ balance, onBalanceChange, onBack }: GameProps) {
  const [bet, setBet] = useState('10')
  const [chosen, setChosen] = useState<BetSide>('player')
  const [phase, setPhase] = useState<'idle' | 'dealing' | 'done'>('idle')
  const [playerCards, setPlayerCards] = useState<Card[]>([])
  const [bankerCards, setBankerCards] = useState<Card[]>([])
  const [message, setMessage] = useState('')
  const [msgColor, setMsgColor] = useState('#fff')
  const [rounds, setRounds] = useState(0)
  const [wins, setWins] = useState(0)

  const winRate = rounds > 0 ? ((wins / rounds) * 100).toFixed(1) : '0.0'

  async function deal() {
    const betVal = parseFloat(bet) || 0
    if (betVal <= 0 || betVal > balance) { setMessage('Aposta inválida!'); setMsgColor('#ff5252'); return }
    setMessage('')
    setPhase('dealing')

    try {
      const res = await api.baccarat.deal(betVal, chosen) as Record<string, unknown>
      setPlayerCards(res.playerCards as Card[])
      setBankerCards(res.bankerCards as Card[])
      setPhase('done')
      setRounds(r => r + 1)
      onBalanceChange(res.balance as number)

      const ps     = res.playerScore as number
      const bs     = res.bankerScore as number
      const winner = res.winner as BetSide

      if (winner === chosen) {
        setWins(w => w + 1)
        setMessage(`🎉 ${winner === 'player' ? 'Jogador' : winner === 'banker' ? 'Banca' : 'Empate'} venceu! (${ps} vs ${bs}) — Ganhou R$ ${(res.prize as number).toFixed(2)}!`)
        setMsgColor('#00e676')
      } else if (winner === 'tie' && chosen !== 'tie') {
        setMessage(`🤝 Empate! (${ps} vs ${bs}) — Aposta devolvida!`)
        setMsgColor('#FFD700')
      } else {
        setMessage(`❌ ${winner === 'player' ? 'Jogador' : 'Banca'} venceu! (${ps} vs ${bs}) — Perdeu!`)
        setMsgColor('#ff5252')
      }
    } catch (err: unknown) {
      setPhase('idle')
      setMessage(err instanceof Error ? err.message : 'Erro na conexão')
      setMsgColor('#ff5252')
    }
  }

  const isWin = msgColor === '#00e676'
  const isTie = msgColor === '#FFD700'

  const BET_OPTIONS: { label: string; key: BetSide; accent: string; payout: string }[] = [
    { label: '🧑 Jogador', key: 'player', accent: '#0055CC', payout: '1×'    },
    { label: '🏦 Banca',   key: 'banker', accent: '#CC0000', payout: '0.95×' },
    { label: '🤝 Empate',  key: 'tie',    accent: '#007755', payout: '8×'    },
  ]

  return (
    <GameShell title="🎴 BACCARAT" onBack={onBack} balance={balance}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, maxWidth: 480, margin: '0 auto' }}>

        {/* Player & Banker hands */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, width: '100%' }}>
          {[
            { label: 'JOGADOR', cards: playerCards, accent: '#0055CC' },
            { label: 'BANCA',   cards: bankerCards, accent: '#CC0000' },
          ].map(side => (
            <div key={side.label} className="glass" style={{ padding: '14px 14px', borderColor: `${side.accent}25` }}>
              <p style={{ color: '#555', fontSize: 10, letterSpacing: 1.5, marginBottom: 10 }}>{side.label}</p>
              <div style={{ display: 'flex', gap: 7, minHeight: 90 }}>
                {side.cards.map((c, i) => <BaccaratCard key={i} card={c} index={i} />)}
              </div>
            </div>
          ))}
        </div>

        {/* Side buttons */}
        <div style={{ display: 'flex', gap: 10, width: '100%' }}>
          {BET_OPTIONS.map(o => (
            <button
              key={o.key}
              onClick={() => setChosen(o.key)}
              disabled={phase === 'dealing'}
              style={{
                flex: 1,
                padding: '13px 0',
                fontWeight: 700,
                fontSize: 13,
                borderRadius: 10,
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

        {/* Bet + deal */}
        <div style={{ display: 'flex', gap: 10, width: '100%', alignItems: 'center' }}>
          <label style={{ color: '#555', fontSize: 10, letterSpacing: 1.5, whiteSpace: 'nowrap' }}>APOSTA R$</label>
          <input type="number" min="1" value={bet} onChange={e => setBet(e.target.value)}
            disabled={phase === 'dealing'} className="input-field" />
          {phase !== 'done' ? (
            <button
              onClick={deal}
              disabled={phase === 'dealing'}
              style={{
                background: phase === 'dealing' ? 'rgba(255,255,255,0.04)' : '#22228a',
                color: '#fff',
                fontFamily: 'Orbitron, sans-serif',
                fontWeight: 700,
                fontSize: 13,
                padding: '10px 20px',
                borderRadius: 9,
                border: phase === 'dealing' ? '1px solid rgba(255,255,255,0.08)' : '1px solid transparent',
                whiteSpace: 'nowrap',
                letterSpacing: 1,
              }}
              onMouseEnter={e => { if (phase !== 'dealing') e.currentTarget.style.boxShadow = '0 4px 20px rgba(34,34,138,0.5)' }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none' }}
            >
              🎴 DEAL
            </button>
          ) : (
            <button
              onClick={() => { setPhase('idle'); setPlayerCards([]); setBankerCards([]); setMessage('') }}
              style={{
                background: '#22228a',
                color: '#fff',
                fontFamily: 'Orbitron, sans-serif',
                fontWeight: 700,
                fontSize: 12,
                padding: '10px 16px',
                borderRadius: 9,
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 20px rgba(34,34,138,0.5)' }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none' }}
            >
              🔄 Novo
            </button>
          )}
        </div>

        {message && (
          <div style={{
            color: msgColor,
            background: isWin ? 'rgba(0,230,118,0.08)' : isTie ? 'rgba(255,215,0,0.08)' : 'rgba(255,82,82,0.08)',
            border: `1px solid ${isWin ? 'rgba(0,230,118,0.25)' : isTie ? 'rgba(255,215,0,0.25)' : 'rgba(255,82,82,0.25)'}`,
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

        {/* Info */}
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
      background: '#fafafa',
      borderRadius: 8,
      border: '1px solid #ddd',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      color: red ? '#CC0000' : '#111',
      fontWeight: 700,
      userSelect: 'none',
      boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
      ...dealStyle,
    }}>
      <span style={{ fontSize: 16 }}>{card.rank}</span>
      <span style={{ fontSize: 20 }}>{card.suit}</span>
    </div>
  )
}
