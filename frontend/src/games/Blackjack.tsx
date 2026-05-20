import { useState, useCallback } from 'react'
import type { GameProps } from '../types'
import GameShell from './GameShell'

type Suit = '♠' | '♥' | '♦' | '♣'
type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K'
interface Card { rank: Rank; suit: Suit }

const SUITS: Suit[] = ['♠', '♥', '♦', '♣']
const RANKS: Rank[] = ['A','2','3','4','5','6','7','8','9','10','J','Q','K']

function buildDeck(): Card[] {
  const deck: Card[] = []
  for (const suit of SUITS) for (const rank of RANKS) deck.push({ rank, suit })
  return deck
}

function shuffle(deck: Card[]): Card[] {
  const d = [...deck]
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]]
  }
  return d
}

function cardValue(rank: Rank): number {
  if (['J', 'Q', 'K'].includes(rank)) return 10
  if (rank === 'A') return 11
  return parseInt(rank)
}

function handScore(hand: Card[]): number {
  let score = hand.reduce((s, c) => s + cardValue(c.rank), 0)
  let aces  = hand.filter(c => c.rank === 'A').length
  while (score > 21 && aces > 0) { score -= 10; aces-- }
  return score
}

function isBlackjack(hand: Card[]): boolean {
  return hand.length === 2 && handScore(hand) === 21
}

function isRed(suit: Suit): boolean { return suit === '♥' || suit === '♦' }

type Phase = 'idle' | 'playing' | 'done'

export default function Blackjack({ balance, onBalanceChange, onBack }: GameProps) {
  const [bet, setBet] = useState('10')
  const [deck, setDeck] = useState<Card[]>([])
  const [playerHand, setPlayerHand] = useState<Card[]>([])
  const [dealerHand, setDealerHand] = useState<Card[]>([])
  const [phase, setPhase] = useState<Phase>('idle')
  const [showDealer, setShowDealer] = useState(false)
  const [message, setMessage] = useState('')
  const [msgColor, setMsgColor] = useState('#fff')
  const [rounds, setRounds] = useState(0)
  const [wins, setWins] = useState(0)

  const betVal = parseFloat(bet) || 0

  const newDeck = useCallback(() => shuffle(buildDeck()), [])

  function deal() {
    if (betVal <= 0 || betVal > balance) { setMessage('Aposta inválida!'); setMsgColor('#FF4444'); return }
    const d = newDeck()
    const p = [d[0], d[2]]
    const dl = [d[1], d[3]]
    const rest = d.slice(4)
    setDeck(rest)
    setPlayerHand(p)
    setDealerHand(dl)
    setShowDealer(false)
    setMessage('')
    setPhase('playing')
    onBalanceChange(balance - betVal)

    if (isBlackjack(p)) {
      setTimeout(() => finish(p, dl, rest, true), 400)
    }
  }

  function hit() {
    if (phase !== 'playing') return
    const card = deck[0]
    const rest  = deck.slice(1)
    const hand  = [...playerHand, card]
    setDeck(rest)
    setPlayerHand(hand)
    if (handScore(hand) > 21) {
      finishAfterBust(hand, dealerHand, rest)
    }
  }

  function stand() {
    if (phase !== 'playing') return
    finish(playerHand, dealerHand, deck, false)
  }

  function doubleDown() {
    if (phase !== 'playing' || playerHand.length !== 2) return
    if (betVal > balance) { setMessage('Saldo insuficiente para dobrar!'); setMsgColor('#FF4444'); return }
    onBalanceChange(balance - betVal) // extra bet deducted
    const card = deck[0]
    const rest  = deck.slice(1)
    const hand  = [...playerHand, card]
    setDeck(rest)
    setPlayerHand(hand)
    if (handScore(hand) > 21) {
      finishAfterBust(hand, dealerHand, rest, true)
    } else {
      finish(hand, dealerHand, rest, false, true)
    }
  }

  function finishAfterBust(pHand: Card[], dHand: Card[], _rest: Card[], doubled = false) {
    setShowDealer(true)
    setPhase('done')
    setRounds(r => r + 1)
    setMessage(`💥 Estourou! (${handScore(pHand)}) — Perdeu R$ ${(betVal * (doubled ? 2 : 1)).toFixed(2)}!`)
    setMsgColor('#FF4444')
    void dHand
  }

  function finish(pHand: Card[], dHand: Card[], deckLeft: Card[], playerBJ = false, doubled = false) {
    let dl = [...dHand]
    let dk = [...deckLeft]

    if (!playerBJ) {
      while (handScore(dl) < 17) {
        dl = [...dl, dk[0]]
        dk = dk.slice(1)
      }
    }

    setDealerHand(dl)
    setDeck(dk)
    setShowDealer(true)
    setPhase('done')
    setRounds(r => r + 1)

    const ps = handScore(pHand)
    const ds = handScore(dl)
    const mult = doubled ? 2 : 1

    if (playerBJ && !isBlackjack(dl)) {
      const prize = betVal * 2.5
      onBalanceChange(balance - betVal + prize)
      setWins(w => w + 1)
      setMessage(`🎉 BLACKJACK! Ganhou R$ ${prize.toFixed(2)}!`)
      setMsgColor('#FFD700')
    } else if (ps > 21) {
      setMessage(`💥 Estourou! (${ps}) — Perdeu!`)
      setMsgColor('#FF4444')
    } else if (ds > 21) {
      const prize = betVal * 2 * mult
      onBalanceChange(balance - betVal * mult + prize)
      setWins(w => w + 1)
      setMessage(`🎉 Dealer estourou! Ganhou R$ ${prize.toFixed(2)}!`)
      setMsgColor('#00FF00')
    } else if (ps > ds) {
      const prize = betVal * 2 * mult
      onBalanceChange(balance - betVal * mult + prize)
      setWins(w => w + 1)
      setMessage(`🎉 Você ganhou! (${ps} vs ${ds}) — R$ ${prize.toFixed(2)}!`)
      setMsgColor('#00FF00')
    } else if (ps === ds) {
      onBalanceChange(balance - betVal * mult + betVal * mult)
      setMessage(`🤝 Empate! (${ps} vs ${ds}) — Devolvido!`)
      setMsgColor('#FFD700')
    } else {
      setMessage(`❌ Dealer ganhou! (${ds} vs ${ps}) — Perdeu!`)
      setMsgColor('#FF4444')
    }
  }

  const winRate = rounds > 0 ? ((wins / rounds) * 100).toFixed(1) : '0.0'

  return (
    <GameShell title="🃏 BLACKJACK" onBack={onBack} balance={balance}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, maxWidth: 480, margin: '0 auto' }}>

        {/* Dealer hand */}
        <div style={{ width: '100%' }}>
          <p style={{ color: '#aaa', fontSize: 13, marginBottom: 6 }}>
            Dealer {dealerHand.length > 0 ? `(${showDealer ? handScore(dealerHand) : '?'})` : ''}
          </p>
          <div style={{ display: 'flex', gap: 8, minHeight: 90 }}>
            {dealerHand.map((c, i) => (
              <CardDisplay key={i} card={i === 1 && !showDealer ? null : c} />
            ))}
          </div>
        </div>

        {/* Player hand */}
        <div style={{ width: '100%' }}>
          <p style={{ color: '#aaa', fontSize: 13, marginBottom: 6 }}>
            Você {playerHand.length > 0 ? `(${handScore(playerHand)})` : ''}
          </p>
          <div style={{ display: 'flex', gap: 8, minHeight: 90 }}>
            {playerHand.map((c, i) => <CardDisplay key={i} card={c} />)}
          </div>
        </div>

        {/* Controls */}
        {phase === 'idle' && (
          <div style={{ display: 'flex', gap: 10, width: '100%', alignItems: 'center' }}>
            <label style={{ color: '#aaa', fontSize: 13, whiteSpace: 'nowrap' }}>Aposta R$</label>
            <input type="number" min="1" value={bet} onChange={e => setBet(e.target.value)}
              style={{ flex: 1, padding: '8px 10px', background: '#222', color: '#fff', border: '1px solid #444', borderRadius: 6, fontSize: 14 }} />
            <button onClick={deal}
              style={{ background: '#006622', color: '#fff', fontWeight: 'bold', fontSize: 15, padding: '10px 20px', borderRadius: 8 }}
              onMouseEnter={e => (e.currentTarget.style.background = '#004416')}
              onMouseLeave={e => (e.currentTarget.style.background = '#006622')}>
              🃏 DEAL
            </button>
          </div>
        )}

        {phase === 'playing' && (
          <div style={{ display: 'flex', gap: 10, width: '100%' }}>
            <button onClick={hit}
              style={{ flex: 1, background: '#004488', color: '#fff', fontWeight: 'bold', fontSize: 15, padding: '12px 0', borderRadius: 8 }}
              onMouseEnter={e => (e.currentTarget.style.background = '#002266')}
              onMouseLeave={e => (e.currentTarget.style.background = '#004488')}>
              ➕ HIT
            </button>
            <button onClick={stand}
              style={{ flex: 1, background: '#880000', color: '#fff', fontWeight: 'bold', fontSize: 15, padding: '12px 0', borderRadius: 8 }}
              onMouseEnter={e => (e.currentTarget.style.background = '#660000')}
              onMouseLeave={e => (e.currentTarget.style.background = '#880000')}>
              ✋ STAND
            </button>
            {playerHand.length === 2 && betVal <= balance && (
              <button onClick={doubleDown}
                style={{ flex: 1, background: '#664400', color: '#fff', fontWeight: 'bold', fontSize: 15, padding: '12px 0', borderRadius: 8 }}
                onMouseEnter={e => (e.currentTarget.style.background = '#442200')}
                onMouseLeave={e => (e.currentTarget.style.background = '#664400')}>
                ×2 DOBRAR
              </button>
            )}
          </div>
        )}

        {phase === 'done' && (
          <button onClick={() => { setPhase('idle'); setPlayerHand([]); setDealerHand([]); setMessage('') }}
            style={{ background: '#006622', color: '#fff', fontWeight: 'bold', fontSize: 15, padding: '12px 40px', borderRadius: 8 }}
            onMouseEnter={e => (e.currentTarget.style.background = '#004416')}
            onMouseLeave={e => (e.currentTarget.style.background = '#006622')}>
            🔄 NOVA RODADA
          </button>
        )}

        {message && (
          <div style={{ color: msgColor, fontWeight: 'bold', fontSize: 16, textAlign: 'center', background: '#111', padding: '10px 20px', borderRadius: 8, width: '100%' }}>
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

function CardDisplay({ card }: { card: Card | null }) {
  if (!card) {
    return (
      <div style={{ width: 60, height: 86, background: '#1a4a8a', borderRadius: 8, border: '2px solid #2266aa', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
        🂠
      </div>
    )
  }
  const red = isRed(card.suit)
  return (
    <div style={{ width: 60, height: 86, background: '#fff', borderRadius: 8, border: '2px solid #ccc', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: red ? '#CC0000' : '#111', fontWeight: 'bold', fontSize: 16, userSelect: 'none' }}>
      <span style={{ fontSize: 18 }}>{card.rank}</span>
      <span style={{ fontSize: 20 }}>{card.suit}</span>
    </div>
  )
}
