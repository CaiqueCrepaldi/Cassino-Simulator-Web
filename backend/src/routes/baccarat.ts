import { Router } from 'express'
import { deduct, credit, getBalance } from '../balance.js'
import { deal } from '../services/baccarat.js'
import type { BetSide } from '../services/baccarat.js'

const router = Router()

router.post('/deal', (req, res) => {
  const { bet, chosen } = req.body as { bet: number; chosen: BetSide }
  try {
    deduct(bet)
    const result = deal(bet, chosen)
    if (result.prize > 0) credit(result.prize)
    res.json({ ...result, balance: getBalance() })
  } catch (err: unknown) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Erro' })
  }
})

export default router
