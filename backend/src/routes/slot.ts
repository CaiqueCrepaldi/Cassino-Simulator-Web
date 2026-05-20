import { Router } from 'express'
import { deduct, credit, getBalance } from '../balance.js'
import { spin } from '../services/slot.js'

const router = Router()

router.post('/spin', (req, res) => {
  const { bet } = req.body as { bet: number }
  try {
    deduct(bet)
    const result = spin(bet)
    if (result.win) credit(result.prize)
    res.json({ ...result, balance: getBalance() })
  } catch (err: unknown) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Erro' })
  }
})

export default router
