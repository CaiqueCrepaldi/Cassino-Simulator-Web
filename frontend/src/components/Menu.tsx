import { useState } from 'react'
import type { GameKey } from '../types'

const GAMES: {
  emoji: string
  text: string
  subtitle: string
  payout: string
  accent: string
  key: GameKey
}[] = [
  { emoji: '🎰', text: 'SLOT MACHINE',  subtitle: 'Gire os rolos e acerte 3 símbolos',      payout: '3×',   accent: '#FF3300', key: 'slot'       },
  { emoji: '✈️', text: 'AVIATOR',       subtitle: 'Retire antes do avião desaparecer',       payout: '∞',    accent: '#0088FF', key: 'aviator'    },
  { emoji: '🎡', text: 'DOUBLE',        subtitle: 'Preto 2×  •  Vermelho 2×  •  Branco 14×', payout: '14×',  accent: '#9900EE', key: 'double'     },
  { emoji: '🎲', text: 'CRASH DICE',    subtitle: 'Dados com combos e multiplicadores',       payout: '5×',   accent: '#FF8800', key: 'crash_dice' },
  { emoji: '🃏', text: 'BLACKJACK',     subtitle: 'Chegue em 21 sem ultrapassar o dealer',   payout: '2.5×', accent: '#00BB55', key: 'blackjack'  },
  { emoji: '🎡', text: 'ROLETA',        subtitle: 'Números, cores e dezenas até 35×',        payout: '35×',  accent: '#EE0055', key: 'roulette'   },
  { emoji: '🪙', text: 'COIN FLIP',     subtitle: 'Cara ou Coroa — 50/50 com modo auto',     payout: '2×',   accent: '#BBBB00', key: 'coin_flip'  },
  { emoji: '🎴', text: 'BACCARAT',      subtitle: 'Jogador, Banca ou Empate até 8×',         payout: '8×',   accent: '#4466FF', key: 'baccarat'   },
]

interface Props {
  balance: number
  onSelectGame: (key: GameKey) => void
  onReset: () => void
}

export default function Menu({ balance, onSelectGame, onReset }: Props) {
  return (
    <div style={{ minHeight: '100vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '36px 20px 28px' }}>

      {/* Logo */}
      <div className="fade-in" style={{ textAlign: 'center', marginBottom: 32 }}>
        <h1 className="casino-title" style={{ fontSize: 30, marginBottom: 8 }}>
          🎰 CASSINO SIMULATOR
        </h1>
        <p style={{ color: '#444', fontSize: 12, letterSpacing: 2 }}>ESCOLHA SEU JOGO</p>
      </div>

      {/* Balance chip */}
      <div
        className="fade-in"
        style={{
          display: 'flex', alignItems: 'center', gap: 20,
          padding: '14px 28px', marginBottom: 32,
          background: 'rgba(0,230,118,0.06)',
          border: '1px solid rgba(0,230,118,0.2)',
          borderRadius: 50,
          animation: 'fadeInUp 0.4s ease both, chipPulse 2.5s ease-in-out 1s infinite',
        }}
      >
        <div>
          <div style={{ color: '#444', fontSize: 9, letterSpacing: 2, marginBottom: 3 }}>BANCA</div>
          <div style={{ color: '#00e676', fontFamily: 'Orbitron, sans-serif', fontWeight: 700, fontSize: 24 }}>
            R$ {balance.toFixed(2)}
          </div>
        </div>
        <button
          onClick={onReset}
          style={{
            background: 'rgba(255,82,82,0.1)',
            color: '#ff5252',
            border: '1px solid rgba(255,82,82,0.25)',
            borderRadius: 8,
            fontSize: 12,
            padding: '7px 16px',
            letterSpacing: 0.5,
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,82,82,0.22)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,82,82,0.1)' }}
        >
          ↺ RESETAR
        </button>
      </div>

      {/* Game grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, width: '100%', maxWidth: 660 }}>
        {GAMES.map((game, i) => (
          <GameCard key={game.key} game={game} index={i} onSelect={onSelectGame} />
        ))}
      </div>

      <p style={{ color: '#2a2a2a', fontSize: 10, marginTop: 28, letterSpacing: 1.5 }}>
        PROJETO ACADÊMICO · SEM DINHEIRO REAL
      </p>
    </div>
  )
}

function GameCard({
  game,
  index,
  onSelect,
}: {
  game: typeof GAMES[0]
  index: number
  onSelect: (k: GameKey) => void
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <button
      onClick={() => onSelect(game.key)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="fade-in"
      style={{
        position: 'relative',
        overflow: 'hidden',
        background: hovered
          ? `linear-gradient(135deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.02) 100%)`
          : 'rgba(255,255,255,0.03)',
        border: `1px solid ${hovered ? game.accent + '55' : 'rgba(255,255,255,0.07)'}`,
        borderLeft: `3px solid ${hovered ? game.accent : game.accent + '66'}`,
        borderRadius: 13,
        padding: '16px 14px 13px',
        textAlign: 'left',
        color: '#fff',
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
        boxShadow: hovered
          ? `0 6px 28px ${game.accent}33, 0 0 0 1px ${game.accent}22`
          : '0 2px 10px rgba(0,0,0,0.4)',
        animationDelay: `${index * 0.055}s`,
        transition: 'all 0.22s cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}
    >
      {/* Shine on hover */}
      {hovered && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          background: 'linear-gradient(110deg, transparent 35%, rgba(255,255,255,0.05) 50%, transparent 65%)',
          pointerEvents: 'none',
        }} />
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
        <span style={{
          fontSize: 26,
          lineHeight: 1,
          filter: hovered ? `drop-shadow(0 0 6px ${game.accent})` : 'none',
          transition: 'filter 0.22s',
          flexShrink: 0,
        }}>
          {game.emoji}
        </span>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: 'Orbitron, sans-serif',
            fontWeight: 700,
            fontSize: 10,
            color: hovered ? game.accent : '#aaa',
            letterSpacing: 1.5,
            marginBottom: 4,
            transition: 'color 0.22s',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {game.text}
          </div>
          <div style={{ color: '#555', fontSize: 11, lineHeight: 1.45 }}>
            {game.subtitle}
          </div>
        </div>

        <div style={{
          background: `${game.accent}18`,
          color: hovered ? game.accent : game.accent + 'aa',
          border: `1px solid ${game.accent}33`,
          borderRadius: 6,
          padding: '3px 8px',
          fontSize: 11,
          fontFamily: 'Orbitron, sans-serif',
          fontWeight: 700,
          flexShrink: 0,
          transition: 'color 0.22s',
        }}>
          {game.payout}
        </div>
      </div>
    </button>
  )
}
