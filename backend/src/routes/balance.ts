import { Router } from 'express'
import { getBalance, resetBalance } from '../balance.js'

const router = Router()

router.get('/', (_req, res) => {
  res.json({ balance: getBalance() })
})

router.post('/reset', (_req, res) => {
  res.json({ balance: resetBalance() })
})

export default router
