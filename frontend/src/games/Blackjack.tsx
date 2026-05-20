import { useState } from 'react'
import type { GameProps } from '../types'
import GameShell from './GameShell'
import { api } from '../api/client'

type Suit = '♠' | '♥' | '♦' | '♣'
type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K'
interface Card { rank: Rank; suit: Suit }

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

  const betVal  = parseFloat(bet) || 0
  const winRate = rounds > 0 ? ((wins / rounds) * 100).toFixed(1) : '0.0'
  const isWin   = msgColor === '#00e676'
  const isTie   = msgColor === '#FFD700'

  async function deal() {
    if (betVal <= 0 || betVal > balance) { setMessage('Aposta inválida!'); setMsgColor('#ff5252'); return }
    try {
      const res = await api.blackjack.deal(betVal) as Record<string, unknown>
      setShowDealer(false)
      setMessage('')
      onBalanceChange(res.balance as number)

      if (res.outcome === 'blackjack') {
        setPlayerHand(res.playerHand as Card[])
        setDealerHand(res.dealerHand as Card[])
        setDeck([])
        setShowDealer(true)
        setPhase('done')
        setRounds(r => r + 1)
        setWins(w => w + 1)
        setMessage(`🎉 BLACKJACK! Ganhou R$ ${(res.prize as number).toFixed(2)}!`)
        setMsgColor('#FFD700')
      } else {
        setPlayerHand(res.playerHand as Card[])
        setDealerHand(res.dealerHand as Card[])
        setDeck(res.deck as Card[])
        setPhase('playing')
      }
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : 'Erro na conexão')
      setMsgColor('#ff5252')
    }
  }

  async function hit() {
    if (phase !== 'playing') return
    try {
      const res = await api.blackjack.hit(playerHand, deck) as Record<string, unknown>
      setPlayerHand(res.playerHand as Card[])
      setDeck(res.deck as Card[])
      if (res.bust) {
        setShowDealer(true)
        setPhase('done')
        setRounds(r => r + 1)
        setMessage(`💥 Estourou! (${res.playerScore}) — Perdeu!`)
        setMsgColor('#ff5252')
      }
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : 'Erro na conexão')
      setMsgColor('#ff5252')
    }
  }

  async function stand(doubled = false) {
    if (phase !== 'playing') return
    try {
      const res = await api.blackjack.stand(betVal, playerHand, dealerHand, deck, doubled) as Record<string, unknown>
      setDealerHand(res.dealerHand as Card[])
      setShowDealer(true)
      setPhase('done')
      setRounds(r => r + 1)
      onBalanceChange(res.balance as number)

      const outcome = res.outcome as string
      const ps = res.playerScore as number
      const ds = res.dealerScore as number

      if (outcome === 'player_wins' || outcome === 'dealer_bust') {
        setWins(w => w + 1)
        setMessage(`🎉 Você ganhou! (${ps} vs ${ds}) — R$ ${(res.prize as number).toFixed(2)}!`)
        setMsgColor('#00e676')
      } else if (outcome === 'push') {
        setMessage(`🤝 Empate! (${ps} vs ${ds}) — Devolvido!`)
        setMsgColor('#FFD700')
      } else {
        setMessage(`❌ Dealer ganhou! (${ds} vs ${ps}) — Perdeu!`)
        setMsgColor('#ff5252')
      }
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : 'Erro na conexão')
      setMsgColor('#ff5252')
    }
  }

  async function doubleDown() {
    if (phase !== 'playing' || playerHand.length !== 2) return
    if (betVal > balance) { setMessage('Saldo insuficiente para dobrar!'); setMsgColor('#ff5252'); return }
    await stand(true)
  }

  return (
    <GameShell title="🃏 BLACKJACK" onBack={onBack} balance={balance}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, maxWidth: 480, margin: '0 auto' }}>

        {/* Dealer hand */}
        <div className="glass" style={{ width: '100%', padding: '14px 16px' }}>
          <p style={{ color: '#555', fontSize: 10, letterSpacing: 1.5, marginBottom: 10 }}>
            DEALER {dealerHand.length > 0 ? `— ${showDealer ? handScore(dealerHand) : '?'}` : ''}
          </p>
          <div style={{ display: 'flex', gap: 8, minHeight: 92, flexWrap: 'wrap' }}>
            {dealerHand.map((c, i) => (
              <CardDisplay key={i} card={i === 1 && !showDealer ? null : c} />
            ))}
          </div>
        </div>

        {/* Player hand */}
        <div className="glass" style={{ width: '100%', padding: '14px 16px' }}>
          <p style={{ color: '#555', fontSize: 10, letterSpacing: 1.5, marginBottom: 10 }}>
            VOCÊ {playerHand.length > 0 ? `— ${handScore(playerHand)}` : ''}
          </p>
          <div style={{ display: 'flex', gap: 8, minHeight: 92, flexWrap: 'wrap' }}>
            {playerHand.map((c, i) => <CardDisplay key={i} card={c} />)}
          </div>
        </div>

        {/* Controls */}
        {phase === 'idle' && (
          <div style={{ display: 'flex', gap: 10, width: '100%', alignItems: 'center' }}>
            <label style={{ color: '#555', fontSize: 10, letterSpacing: 1.5, whiteSpace: 'nowrap' }}>APOSTA R$</label>
            <input type="number" min="1" value={bet} onChange={e => setBet(e.target.value)} className="input-field" />
            <button
              onClick={deal}
              style={{
                background: '#006622',
                color: '#fff',
                fontFamily: 'Orbitron, sans-serif',
                fontWeight: 700,
                fontSize: 14,
                padding: '10px 22px',
                borderRadius: 9,
                whiteSpace: 'nowrap',
                letterSpacing: 1,
              }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,102,34,0.5)' }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none' }}
            >
              🃏 DEAL
            </button>
          </div>
        )}

        {phase === 'playing' && (
          <div style={{ display: 'flex', gap: 10, width: '100%' }}>
            <button
              onClick={hit}
              style={{
                flex: 1,
                background: '#003D99',
                color: '#fff',
                fontFamily: 'Orbitron, sans-serif',
                fontWeight: 700,
                fontSize: 14,
                padding: '13px 0',
                borderRadius: 9,
                letterSpacing: 1,
              }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,61,153,0.5)' }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none' }}
            >
              ➕ HIT
            </button>
            <button
              onClick={() => stand(false)}
              style={{
                flex: 1,
                background: '#880000',
                color: '#fff',
                fontFamily: 'Orbitron, sans-serif',
                fontWeight: 700,
                fontSize: 14,
                padding: '13px 0',
                borderRadius: 9,
                letterSpacing: 1,
              }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 20px rgba(136,0,0,0.5)' }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none' }}
            >
              ✋ STAND
            </button>
            {playerHand.length === 2 && betVal <= balance && (
              <button
                onClick={doubleDown}
                style={{
                  flex: 1,
                  background: '#664400',
                  color: '#fff',
                  fontFamily: 'Orbitron, sans-serif',
                  fontWeight: 700,
                  fontSize: 14,
                  padding: '13px 0',
                  borderRadius: 9,
                  letterSpacing: 1,
                }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 20px rgba(102,68,0,0.5)' }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none' }}
              >
                ×2 DOBRAR
              </button>
            )}
          </div>
        )}

        {phase === 'done' && (
          <button
            onClick={() => { setPhase('idle'); setPlayerHand([]); setDealerHand([]); setMessage('') }}
            style={{
              background: '#005500',
              color: '#fff',
              fontFamily: 'Orbitron, sans-serif',
              fontWeight: 700,
              fontSize: 14,
              padding: '13px 48px',
              borderRadius: 9,
              letterSpacing: 1,
            }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,85,0,0.5)' }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none' }}
          >
            🔄 NOVA RODADA
          </button>
        )}

        {message && (
          <div style={{
            color: msgColor,
            background: isWin ? 'rgba(0,230,118,0.08)' : isTie ? 'rgba(255,215,0,0.08)' : 'rgba(255,82,82,0.08)',
            border: `1px solid ${isWin ? 'rgba(0,230,118,0.25)' : isTie ? 'rgba(255,215,0,0.25)' : 'rgba(255,82,82,0.25)'}`,
            borderRadius: 10,
            fontWeight: 700,
            fontSize: 16,
            textAlign: 'center',
            padding: '12px 20px',
            width: '100%',
          }}>
            {message}
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

function CardDisplay({ card }: { card: Card | null }) {
  if (!card) {
    return (
      <div style={{
        width: 62, height: 90,
        background: 'linear-gradient(135deg, #1a3a8a, #0d1f5c)',
        borderRadius: 9,
        border: '1px solid rgba(68,102,187,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 26,
        boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
      }}>
        🂠
      </div>
    )
  }
  const red = isRed(card.suit)
  return (
    <div style={{
      width: 62, height: 90,
      background: '#fafafa',
      borderRadius: 9,
      border: '1px solid #ddd',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      color: red ? '#CC0000' : '#111',
      fontWeight: 700,
      userSelect: 'none',
      boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
    }}>
      <span style={{ fontSize: 18 }}>{card.rank}</span>
      <span style={{ fontSize: 22 }}>{card.suit}</span>
    </div>
  )
}
