import type { GameKey } from '../types'

const GAMES: { text: string; subtitle: string; fg: string; hover: string; key: GameKey }[] = [
  { text: '🎰  SLOT MACHINE',  subtitle: 'Gire os slots e tente 3 símbolos iguais!',                        fg: '#CC0000', hover: '#990000', key: 'slot'       },
  { text: '✈️  AVIATOR',       subtitle: 'Aposte e retire antes do avião voar embora!',                    fg: '#0055CC', hover: '#003D99', key: 'aviator'    },
  { text: '🎡  DOUBLE',        subtitle: 'Aposte em Preto (2×), Vermelho (2×) ou Branco (14×)!',          fg: '#6600CC', hover: '#4a0099', key: 'double'     },
  { text: '🎲  CRASH DICE',    subtitle: 'Escolha números e role 2 dados — combos especiais pagam mais!', fg: '#FF8800', hover: '#CC6600', key: 'crash_dice' },
  { text: '🃏  BLACKJACK',     subtitle: 'Chegue em 21 sem ultrapassar e supere o dealer!',               fg: '#006622', hover: '#004416', key: 'blackjack'  },
  { text: '🎡  ROLETA',        subtitle: 'Aposte em números, cores e dezenas — até 35× de retorno!',      fg: '#880044', hover: '#660033', key: 'roulette'   },
  { text: '🪙  COIN FLIP',     subtitle: 'Cara ou Coroa? 50/50 — com modo auto flip e streak tracker!',  fg: '#555500', hover: '#777700', key: 'coin_flip'  },
  { text: '🎴  BACCARAT',      subtitle: 'Aposte em Jogador, Banca ou Empate — chegue mais perto do 9!', fg: '#1a1a6e', hover: '#0a0a4e', key: 'baccarat'   },
]

interface Props {
  balance: number
  onSelectGame: (key: GameKey) => void
  onReset: () => void
}

export default function Menu({ balance, onSelectGame, onReset }: Props) {
  const half = GAMES.length / 2
  const left  = GAMES.slice(0, half)
  const right = GAMES.slice(half)

  return (
    <div style={{ background: '#000', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px 0', overflowY: 'auto' }}>
      <div style={{ width: 620, display: 'flex', flexDirection: 'column', gap: 0 }}>

        <h1 style={{ textAlign: 'center', color: '#FFD700', fontSize: 26, fontWeight: 'bold', marginBottom: 4 }}>
          🎰 CASSINO SIMULATOR 🎰
        </h1>
        <p style={{ textAlign: 'center', color: '#CCCCCC', fontSize: 13, marginBottom: 10 }}>
          Escolha um jogo para jogar!
        </p>

        {/* Bank row */}
        <div style={{ background: '#111', borderRadius: 8, display: 'flex', alignItems: 'center', padding: '8px 14px', marginBottom: 10 }}>
          <span style={{ color: '#00FF00', fontWeight: 'bold', fontSize: 14, flex: 1 }}>
            💰 Banca: R$ {balance.toFixed(2)}
          </span>
          <button
            onClick={onReset}
            style={{ background: '#330000', color: '#FF8888', fontWeight: 'bold', fontSize: 11, padding: '6px 14px', borderRadius: 6 }}
            onMouseEnter={e => (e.currentTarget.style.background = '#550000')}
            onMouseLeave={e => (e.currentTarget.style.background = '#330000')}
          >
            🔄 Resetar Banca
          </button>
        </div>

        {/* Game grid 2 columns */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
          {[left, right].map((col, ci) => (
            <div key={ci} style={{ display: 'flex', flexDirection: 'column' }}>
              {col.map(game => (
                <div key={game.key} style={{ marginBottom: 10 }}>
                  <GameButton game={game} onSelect={onSelectGame} />
                </div>
              ))}
            </div>
          ))}
        </div>

        <p style={{ textAlign: 'center', color: '#444', fontSize: 10, marginTop: 10 }}>
          Projeto acadêmico – sem dinheiro real envolvido
        </p>
      </div>
    </div>
  )
}

function GameButton({ game, onSelect }: { game: typeof GAMES[0]; onSelect: (k: GameKey) => void }) {
  return (
    <button
      onClick={() => onSelect(game.key)}
      style={{ background: game.fg, color: '#fff', fontWeight: 'bold', fontSize: 14, borderRadius: 10, height: 52, width: '100%', transition: 'background 0.15s' }}
      onMouseEnter={e => (e.currentTarget.style.background = game.hover)}
      onMouseLeave={e => (e.currentTarget.style.background = game.fg)}
    >
      {game.text}
    </button>
  )
}
