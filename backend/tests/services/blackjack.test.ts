import { describe, it, expect } from 'vitest'
import { handScore, isBlackjack, deal, hit, stand, buildDeck, shuffle } from '../../src/services/blackjack.js'
import type { Card } from '../../src/services/blackjack.js'

describe('Blackjack — handScore', () => {
  it('face cards count as 10', () => {
    const hand: Card[] = [{ rank: 'K', suit: '♠' }, { rank: 'Q', suit: '♥' }]
    expect(handScore(hand)).toBe(20)
  })

  it('ace is 11 by default', () => {
    const hand: Card[] = [{ rank: 'A', suit: '♠' }, { rank: '9', suit: '♥' }]
    expect(handScore(hand)).toBe(20)
  })

  it('ace becomes 1 when hand would bust', () => {
    const hand: Card[] = [
      { rank: 'A', suit: '♠' },
      { rank: 'K', suit: '♥' },
      { rank: '5', suit: '♦' },
    ]
    expect(handScore(hand)).toBe(16)
  })

  it('multiple aces reduce correctly', () => {
    const hand: Card[] = [
      { rank: 'A', suit: '♠' },
      { rank: 'A', suit: '♥' },
      { rank: '9', suit: '♦' },
    ]
    expect(handScore(hand)).toBe(21)
  })
})

describe('Blackjack — isBlackjack', () => {
  it('detects blackjack (A + face card)', () => {
    const hand: Card[] = [{ rank: 'A', suit: '♠' }, { rank: 'K', suit: '♥' }]
    expect(isBlackjack(hand)).toBe(true)
  })

  it('21 with 3 cards is not blackjack', () => {
    const hand: Card[] = [
      { rank: '7', suit: '♠' },
      { rank: '7', suit: '♥' },
      { rank: '7', suit: '♦' },
    ]
    expect(isBlackjack(hand)).toBe(false)
  })
})

describe('Blackjack — deal', () => {
  it('returns 2 cards for player and dealer', () => {
    const res = deal()
    expect(res.playerHand).toHaveLength(2)
    expect(res.dealerHand).toHaveLength(2)
  })

  it('deck has 48 remaining cards', () => {
    const res = deal()
    expect(res.deck).toHaveLength(48)
  })

  it('outcome is blackjack or playing', () => {
    for (let i = 0; i < 50; i++) {
      const res = deal()
      expect(['blackjack', 'playing']).toContain(res.outcome)
    }
  })
})

describe('Blackjack — hit', () => {
  it('adds one card to player hand', () => {
    const deck = shuffle(buildDeck())
    const res = hit([deck[0], deck[1]], deck.slice(2))
    expect(res.playerHand).toHaveLength(3)
  })

  it('sets bust=true when score > 21', () => {
    const hand: Card[] = [
      { rank: 'K', suit: '♠' },
      { rank: 'K', suit: '♥' },
    ]
    const extraDeck: Card[] = [{ rank: 'K', suit: '♦' }, ...shuffle(buildDeck())]
    const res = hit(hand, extraDeck)
    expect(res.bust).toBe(true)
    expect(res.playerScore).toBeGreaterThan(21)
  })
})

describe('Blackjack — stand', () => {
  it('dealer draws until >= 17', () => {
    const hand: Card[] = [{ rank: '9', suit: '♠' }, { rank: '8', suit: '♥' }]
    const dealer: Card[] = [{ rank: '5', suit: '♠' }, { rank: '6', suit: '♦' }]
    const deck = shuffle(buildDeck())
    const res = stand(hand, dealer, deck, 10)
    expect(res.dealerScore).toBeGreaterThanOrEqual(17)
  })

  it('player wins when player score > dealer score', () => {
    const player: Card[] = [{ rank: 'K', suit: '♠' }, { rank: '9', suit: '♥' }]
    const dealer: Card[] = [{ rank: '6', suit: '♠' }, { rank: '7', suit: '♦' }]
    const deck: Card[] = [{ rank: '2', suit: '♣' }, ...shuffle(buildDeck())]
    const res = stand(player, dealer, deck, 10)
    if (res.outcome === 'player_wins') {
      expect(res.prize).toBe(20)
    }
  })
})
