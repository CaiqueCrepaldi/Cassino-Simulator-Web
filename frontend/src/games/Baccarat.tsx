import { useState } from 'react'
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

  async function deal() {
    const betVal = parseFloat(bet) || 0
    if (betVal <= 0 || betVal > balance) { setMessage('Aposta inválida!'); setMsgColor('#FF4444'); return }
    setMessage('')
    setPhase('dealing')

    try {
      const res = await api.baccarat.deal(betVal, chosen) as Record<string, unknown>
      setPlayerCards(res.playerCards as Card[])
      setBankerCards(res.bankerCards as Card[])
      setPhase('done')
      setRounds(r => r + 1)
      onBalanceChange(res.balance as number)

      const ps = res.playerScore as number
      const bs = res.bankerScore as number
      const winner = res.winner as BetSide

      if (winner === chosen) {
        setWins(w => w + 1)
        setMessage(`🎉 ${winner === 'player' ? 'Jogador' : winner === 'banker' ? 'Banca' : 'Empate'} venceu! (${ps} vs ${bs}) — Ganhou R$ ${(res.prize as number).toFixed(2)}!`)
        setMsgColor('#00FF00')
      } else if (winner === 'tie' && chosen !== 'tie') {
        setMessage(`🤝 Empate! (${ps} vs ${bs}) — Aposta devolvida!`)
        setMsgColor('#FFD700')
      } else {
        setMessage(`❌ ${winner === 'player' ? 'Jogador' : 'Banca'} venceu! (${ps} vs ${bs}) — Perdeu!`)
        setMsgColor('#FF4444')
      }
    } catch (err: unknown) {
      setPhase('idle')
      setMessage(err instanceof Error ? err.message : 'Erro na conexão')
      setMsgColor('#FF4444')
    }
  }

  const winRate = rounds > 0 ? ((wins / rounds) * 100).toFixed(1) : '0.0'

  const BET_OPTIONS: { label: string; key: BetSide; fg: string; payout: string }[] = [
    { label: '🧑 Jogador',  key: 'player', fg: '#004488', payout: '1×'    },
    { label: '🏦 Banca',    key: 'banker', fg: '#880000', payout: '0.95×' },
    { label: '🤝 Empate',   key: 'tie',    fg: '#005500', payout: '8×'    },
  ]

  return (
    <GameShell title="🎴 BACCARAT" onBack={onBack} balance={balance}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, maxWidth: 480, margin: '0 auto' }}>

        {/* Player & Banker hands */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, width: '100%' }}>
          {[{ label: 'Jogador', cards: playerCards }, { label: 'Banca', cards: bankerCards }].map(side => (
            <div key={side.label}>
              <p style={{ color: '#aaa', fontSize: 13, marginBottom: 6 }}>
                {side.label}
              </p>
              <div style={{ display: 'flex', gap: 6, minHeight: 86 }}>
                {side.cards.map((c, i) => <BaccaratCard key={i} card={c} />)}
              </div>
            </div>
          ))}
        </div>

        {/* Side buttons */}
        <div style={{ display: 'flex', gap: 10, width: '100%' }}>
          {BET_OPTIONS.map(o => (
            <button key={o.key} onClick={() => setChosen(o.key)} disabled={phase === 'dealing'}
              style={{ flex: 1, padding: '12px 0', fontWeight: 'bold', fontSize: 13, borderRadius: 10,
                background: chosen === o.key ? o.fg : '#1a1a1a',
                color: '#fff', border: chosen === o.key ? '2px solid #FFD700' : '2px solid #333', transition: 'all 0.15s' }}>
              {o.label}<br />
              <span style={{ fontSize: 11, color: '#aaa', fontWeight: 'normal' }}>{o.payout}</span>
            </button>
          ))}
        </div>

        {/* Bet + deal */}
        <div style={{ display: 'flex', gap: 10, width: '100%', alignItems: 'center' }}>
          <label style={{ color: '#aaa', fontSize: 13, whiteSpace: 'nowrap' }}>Aposta R$</label>
          <input type="number" min="1" value={bet} onChange={e => setBet(e.target.value)} disabled={phase === 'dealing'}
            style={{ flex: 1, padding: '8px 10px', background: '#222', color: '#fff', border: '1px solid #444', borderRadius: 6, fontSize: 14 }} />
          {phase !== 'done' ? (
            <button onClick={deal} disabled={phase === 'dealing'}
              style={{ background: phase === 'dealing' ? '#333' : '#1a1a6e', color: '#fff', fontWeight: 'bold', fontSize: 14, padding: '10px 20px', borderRadius: 8 }}
              onMouseEnter={e => { if (phase !== 'dealing') e.currentTarget.style.background = '#0a0a4e' }}
              onMouseLeave={e => { if (phase !== 'dealing') e.currentTarget.style.background = '#1a1a6e' }}>
              🎴 DEAL
            </button>
          ) : (
            <button onClick={() => { setPhase('idle'); setPlayerCards([]); setBankerCards([]); setMessage('') }}
              style={{ background: '#1a1a6e', color: '#fff', fontWeight: 'bold', fontSize: 13, padding: '10px 16px', borderRadius: 8 }}>
              🔄 Novo
            </button>
          )}
        </div>

        {message && (
          <div style={{ color: msgColor, fontWeight: 'bold', fontSize: 15, textAlign: 'center', background: '#111', padding: '10px 20px', borderRadius: 8, width: '100%' }}>
            {message}
          </div>
        )}

        {/* Info */}
        <div style={{ background: '#111', borderRadius: 8, padding: '10px 16px', width: '100%', fontSize: 12, color: '#666' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
            <span>Jogador: 1×  |  Banca: 0.95×  |  Empate: 8×</span>
          </div>
          <span>Empate devolve apostas em Jogador/Banca</span>
        </div>

        <div style={{ display: 'flex', gap: 20, color: '#888', fontSize: 13 }}>
          <span>Rodadas: {rounds}</span>
          <span>Vitórias: {wins}</span>
          <span>Taxa: {winRate}%</span>
        </div>
      </div>
    </GameShell>
  )
}

function BaccaratCard({ card }: { card: Card }) {
  const red = isRed(card.suit)
  return (
    <div style={{ width: 54, height: 80, background: '#fff', borderRadius: 6, border: '2px solid #ccc', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: red ? '#CC0000' : '#111', fontWeight: 'bold', userSelect: 'none' }}>
      <span style={{ fontSize: 16 }}>{card.rank}</span>
      <span style={{ fontSize: 18 }}>{card.suit}</span>
    </div>
  )
}
