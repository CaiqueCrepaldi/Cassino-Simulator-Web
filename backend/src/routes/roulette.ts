import { Router } from 'express'
import { deduct, credit, getBalance } from '../balance.js'
import { spinWheel } from '../services/roulette.js'
import type { RouletteBet } from '../services/roulette.js'

const router = Router()

router.post('/spin', (req, res) => {
  const { bets } = req.body as { bets: RouletteBet[] }
  const totalBet = bets.reduce((s, b) => s + b.amount, 0)
  try {
    deduct(totalBet)
    const result = spinWheel(bets)
    if (result.totalWin > 0) credit(result.totalWin)
    res.json({ ...result, balance: getBalance() })
  } catch (err: unknown) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Erro' })
  }
})

export default router
