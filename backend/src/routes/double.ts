import { Router } from 'express'
import { deduct, credit, getBalance } from '../balance.js'
import { spinWheel } from '../services/double.js'
import type { SegmentType } from '../services/double.js'

const router = Router()

router.post('/spin', (req, res) => {
  const { bet, chosen } = req.body as { bet: number; chosen: SegmentType }
  try {
    deduct(bet)
    const result = spinWheel(bet, chosen)
    if (result.win) credit(result.prize)
    res.json({ ...result, balance: getBalance() })
  } catch (err: unknown) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Erro' })
  }
})

export default router
