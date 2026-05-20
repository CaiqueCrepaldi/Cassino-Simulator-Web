import { Router } from 'express'
import { deduct, credit, getBalance } from '../balance.js'
import { rollDice } from '../services/crashDice.js'

const router = Router()

router.post('/roll', (req, res) => {
  const { bet, numbers } = req.body as { bet: number; numbers: number[] }
  try {
    deduct(bet)
    const result = rollDice(bet, numbers)
    if (result.win) credit(result.prize)
    res.json({ ...result, balance: getBalance() })
  } catch (err: unknown) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Erro' })
  }
})

export default router
