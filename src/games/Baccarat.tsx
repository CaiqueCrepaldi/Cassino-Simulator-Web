import { useState, useCallback } from 'react'
import type { GameProps } from '../types'
import GameShell from './GameShell'

type Suit = '♠' | '♥' | '♦' | '♣'
type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K'
interface Card { rank: Rank; suit: Suit }

const SUITS: Suit[] = ['♠', '♥', '♦', '♣']
const RANKS: Rank[] = ['A','2','3','4','5','6','7','8','9','10','J','Q','K']

function buildDeck(): Card[] {
  const d: Card[] = []
  for (const s of SUITS) for (const r of RANKS) d.push({ rank: r, suit: s })
  return d
}
function shuffle(d: Card[]): Card[] {
  const a = [...d]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
function cardVal(r: Rank): number {
  if (r === 'A') return 1
  if (['10','J','Q','K'].includes(r)) return 0
  return parseInt(r)
}
function handScore(h: Card[]): number {
  return h.reduce((s, c) => s + cardVal(c.rank), 0) % 10
}
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

  const newDeck = useCallback(() => shuffle(buildDeck()), [])

  function deal() {
    const betVal = parseFloat(bet) || 0
    if (betVal <= 0 || betVal > balance) { setMessage('Aposta inválida!'); setMsgColor('#FF4444'); return }
    onBalanceChange(balance - betVal)
    setMessage('')
    setPhase('dealing')

    const d = newDeck()
    let i = 0
    const p: Card[] = [d[i++], d[i++]]
    const b: Card[] = [d[i++], d[i++]]

    const ps = handScore(p)
    const bs = handScore(b)

    // Natural — no more cards
    if (ps >= 8 || bs >= 8) {
      resolve(p, b, betVal)
      return
    }

    // Player draws on 0-5
    if (ps <= 5) { p.push(d[i++]) }

    // Banker drawing rules
    const p3 = p.length === 3 ? cardVal(p[2].rank) : -1
    const bsCur = handScore(b)
    let bankerDraws = false
    if (p.length === 2) {
      bankerDraws = bsCur <= 5
    } else {
      if (bsCur <= 2) bankerDraws = true
      else if (bsCur === 3) bankerDraws = p3 !== 8
      else if (bsCur === 4) bankerDraws = p3 >= 2 && p3 <= 7
      else if (bsCur === 5) bankerDraws = p3 >= 4 && p3 <= 7
      else if (bsCur === 6) bankerDraws = p3 === 6 || p3 === 7
    }
    if (bankerDraws) b.push(d[i++])

    resolve(p, b, betVal)
  }

  function resolve(p: Card[], b: Card[], betVal: number) {
    setPlayerCards(p)
    setBankerCards(b)
    setPhase('done')
    setRounds(r => r + 1)

    const ps = handScore(p)
    const bs = handScore(b)
    const winner: BetSide = ps > bs ? 'player' : bs > ps ? 'banker' : 'tie'

    let prize = 0
    if (winner === chosen) {
      if (chosen === 'player') prize = betVal * 2
      else if (chosen === 'banker') prize = betVal + betVal * 0.95
      else prize = betVal * 9
      onBalanceChange(balance - betVal + prize)
      setWins(w => w + 1)
      setMessage(`🎉 ${winner === 'player' ? 'Jogador' : winner === 'banker' ? 'Banca' : 'Empate'} venceu! (${ps} vs ${bs}) — Ganhou R$ ${prize.toFixed(2)}!`)
      setMsgColor('#00FF00')
    } else if (winner === 'tie' && chosen !== 'tie') {
      // tie returns bet for player/banker bets
      onBalanceChange(balance - betVal + betVal)
      setMessage(`🤝 Empate! (${ps} vs ${bs}) — Aposta devolvida!`)
      setMsgColor('#FFD700')
    } else {
      setMessage(`❌ ${winner === 'player' ? 'Jogador' : 'Banca'} venceu! (${ps} vs ${bs}) — Perdeu!`)
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
                {side.label} {side.cards.length > 0 ? `(${handScore(side.cards)})` : ''}
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
