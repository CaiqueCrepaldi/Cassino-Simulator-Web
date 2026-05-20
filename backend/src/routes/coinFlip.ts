import { Router } from 'express'
import { deduct, credit, getBalance } from '../balance.js'
import { flip } from '../services/coinFlip.js'
import type { CoinSide } from '../services/coinFlip.js'

const router = Router()

router.post('/flip', (req, res) => {
  const { bet, chosen } = req.body as { bet: number; chosen: CoinSide }
  try {
    deduct(bet)
    const result = flip(bet, chosen)
    if (result.win) credit(result.prize)
    res.json({ ...result, balance: getBalance() })
  } catch (err: unknown) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Erro' })
  }
})

export default router
