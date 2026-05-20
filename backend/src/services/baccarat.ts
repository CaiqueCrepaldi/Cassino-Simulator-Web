export type Suit = '♠' | '♥' | '♦' | '♣'
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K'
export interface Card { rank: Rank; suit: Suit }
export type BetSide = 'player' | 'banker' | 'tie'

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
export function handScore(h: Card[]): number {
  return h.reduce((s, c) => s + cardVal(c.rank), 0) % 10
}

export type BaccaratOutcome = 'player' | 'banker' | 'tie'

export interface BaccaratResult {
  playerCards: Card[]
  bankerCards: Card[]
  playerScore: number
  bankerScore: number
  winner: BaccaratOutcome
  win: boolean
  prize: number
}

export function deal(bet: number, chosen: BetSide): BaccaratResult {
  const d = shuffle(buildDeck())
  let i = 0
  const p: Card[] = [d[i++], d[i++]]
  const b: Card[] = [d[i++], d[i++]]

  const ps = handScore(p)
  const bs = handScore(b)

  if (ps < 8 && bs < 8) {
    if (ps <= 5) p.push(d[i++])

    const p3Val = p.length === 3 ? cardVal(p[2].rank) : -1
    const bsCur = handScore(b)
    let bankerDraws = false
    if (p.length === 2) {
      bankerDraws = bsCur <= 5
    } else {
      if (bsCur <= 2) bankerDraws = true
      else if (bsCur === 3) bankerDraws = p3Val !== 8
      else if (bsCur === 4) bankerDraws = p3Val >= 2 && p3Val <= 7
      else if (bsCur === 5) bankerDraws = p3Val >= 4 && p3Val <= 7
      else if (bsCur === 6) bankerDraws = p3Val === 6 || p3Val === 7
    }
    if (bankerDraws) b.push(d[i++])
  }

  const finalPs = handScore(p)
  const finalBs = handScore(b)
  const winner: BaccaratOutcome = finalPs > finalBs ? 'player' : finalBs > finalPs ? 'banker' : 'tie'

  let prize = 0
  const win = winner === chosen || (winner === 'tie' && chosen !== 'tie')

  if (winner === chosen) {
    if (chosen === 'player') prize = bet * 2
    else if (chosen === 'banker') prize = bet + bet * 0.95
    else prize = bet * 9
  } else if (winner === 'tie' && chosen !== 'tie') {
    prize = bet // return stake on tie
  }

  return {
    playerCards: p, bankerCards: b,
    playerScore: finalPs, bankerScore: finalBs,
    winner, win, prize,
  }
}
