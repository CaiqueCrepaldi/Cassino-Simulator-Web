import { Router } from 'express'
import { deduct, credit, getBalance } from '../balance.js'
import { generateCrash, settle } from '../services/aviator.js'

const router = Router()

router.post('/generate', (req, res) => {
  const { bet } = req.body as { bet: number }
  try {
    deduct(bet)
    const crashAt = generateCrash()
    res.json({ crashAt, balance: getBalance() })
  } catch (err: unknown) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Erro' })
  }
})

router.post('/settle', (req, res) => {
  const { bet, crashAt, cashedOutAt } = req.body as { bet: number; crashAt: number; cashedOutAt: number }
  const result = settle(bet, crashAt, cashedOutAt)
  if (result.win) credit(result.prize)
  res.json({ ...result, balance: getBalance() })
})

export default router
