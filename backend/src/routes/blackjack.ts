import { Router } from 'express'
import { deduct, credit, getBalance } from '../balance.js'
import { deal, hit, stand, resolveBlackjack } from '../services/blackjack.js'
import type { Card } from '../services/blackjack.js'

const router = Router()

router.post('/deal', (req, res) => {
  const { bet } = req.body as { bet: number }
  try {
    deduct(bet)
    const result = deal()
    if (result.outcome === 'blackjack') {
      const bj = resolveBlackjack(result.playerHand, result.dealerHand, result.deck, bet)
      credit(bj.prize)
      return res.json({ ...bj, balance: getBalance() })
    }
    res.json({ ...result, balance: getBalance() })
  } catch (err: unknown) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Erro' })
  }
})

router.post('/hit', (req, res) => {
  const { playerHand, deck } = req.body as { playerHand: Card[]; deck: Card[] }
  const result = hit(playerHand, deck)
  res.json({ ...result, balance: getBalance() })
})

router.post('/stand', (req, res) => {
  const { bet, playerHand, dealerHand, deck, doubled } = req.body as {
    bet: number; playerHand: Card[]; dealerHand: Card[]; deck: Card[]; doubled?: boolean
  }
  if (doubled) {
    try {
      deduct(bet)
    } catch (err: unknown) {
      return res.status(400).json({ error: err instanceof Error ? err.message : 'Erro' })
    }
  }
  const result = stand(playerHand, dealerHand, deck, bet, doubled)
  if (result.prize > 0) credit(result.prize)
  res.json({ ...result, balance: getBalance() })
})

export default router
