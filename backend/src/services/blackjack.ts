export type Suit = '♠' | '♥' | '♦' | '♣'
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K'
export interface Card { rank: Rank; suit: Suit }

const SUITS: Suit[] = ['♠', '♥', '♦', '♣']
const RANKS: Rank[] = ['A','2','3','4','5','6','7','8','9','10','J','Q','K']

export function buildDeck(): Card[] {
  const deck: Card[] = []
  for (const suit of SUITS) for (const rank of RANKS) deck.push({ rank, suit })
  return deck
}

export function shuffle(deck: Card[]): Card[] {
  const d = [...deck]
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]]
  }
  return d
}

export function cardValue(rank: Rank): number {
  if (['J','Q','K'].includes(rank)) return 10
  if (rank === 'A') return 11
  return parseInt(rank)
}

export function handScore(hand: Card[]): number {
  let score = hand.reduce((s, c) => s + cardValue(c.rank), 0)
  let aces  = hand.filter(c => c.rank === 'A').length
  while (score > 21 && aces > 0) { score -= 10; aces-- }
  return score
}

export function isBlackjack(hand: Card[]): boolean {
  return hand.length === 2 && handScore(hand) === 21
}

export type DealOutcome = 'blackjack' | 'playing'

export interface DealResult {
  playerHand: Card[]
  dealerHand: Card[]
  deck: Card[]
  outcome: DealOutcome
  playerScore: number
}

export function deal(): DealResult {
  const deck = shuffle(buildDeck())
  const playerHand: Card[] = [deck[0], deck[2]]
  const dealerHand: Card[] = [deck[1], deck[3]]
  const rest = deck.slice(4)
  const outcome: DealOutcome = isBlackjack(playerHand) ? 'blackjack' : 'playing'
  return { playerHand, dealerHand, deck: rest, outcome, playerScore: handScore(playerHand) }
}

export interface HitResult {
  playerHand: Card[]
  deck: Card[]
  playerScore: number
  bust: boolean
}

export function hit(playerHand: Card[], deck: Card[]): HitResult {
  const updated = [...playerHand, deck[0]]
  const score = handScore(updated)
  return { playerHand: updated, deck: deck.slice(1), playerScore: score, bust: score > 21 }
}

export type StandOutcome = 'player_wins' | 'dealer_wins' | 'push' | 'dealer_bust'

export interface StandResult {
  dealerHand: Card[]
  playerScore: number
  dealerScore: number
  outcome: StandOutcome
  prize: number
  bet: number
}

export function stand(playerHand: Card[], dealerHand: Card[], deck: Card[], bet: number, doubled = false): StandResult {
  let dl = [...dealerHand]
  let dk = [...deck]
  while (handScore(dl) < 17) { dl = [...dl, dk[0]]; dk = dk.slice(1) }

  const ps = handScore(playerHand)
  const ds = handScore(dl)
  const mult = doubled ? 2 : 1

  let outcome: StandOutcome
  let prize: number

  if (ds > 21)       { outcome = 'dealer_bust';  prize = bet * 2 * mult }
  else if (ps > ds)  { outcome = 'player_wins';  prize = bet * 2 * mult }
  else if (ps === ds){ outcome = 'push';          prize = bet * mult     }
  else               { outcome = 'dealer_wins';   prize = 0              }

  return { dealerHand: dl, playerScore: ps, dealerScore: ds, outcome, prize, bet: bet * mult }
}

export interface BlackjackResult {
  playerScore: number
  dealerScore: number
  dealerHand: Card[]
  outcome: 'blackjack_win'
  prize: number
}

export function resolveBlackjack(playerHand: Card[], dealerHand: Card[], deck: Card[], bet: number): BlackjackResult {
  let dl = [...dealerHand]
  let dk = [...deck]
  if (!isBlackjack(dl)) {
    // reveal dealer without drawing
  } else {
    // push
    while (handScore(dl) < 17) { dl = [...dl, dk[0]]; dk = dk.slice(1) }
  }
  const dealerBJ = isBlackjack(dl)
  const prize    = dealerBJ ? bet : bet * 2.5
  return { playerScore: handScore(playerHand), dealerScore: handScore(dl), dealerHand: dl, outcome: 'blackjack_win', prize }
}
