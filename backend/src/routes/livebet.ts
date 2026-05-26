import { Router } from 'express'
import { aviatorRoom }  from '../gameLoop/AviatorRoom.js'
import { rouletteRoom } from '../gameLoop/RouletteRoom.js'
import { doubleRoom }   from '../gameLoop/DoubleRoom.js'
import { baccaratRoom } from '../gameLoop/BaccaratRoom.js'
import type { RouletteBet } from '../services/roulette.js'
import { getBalance } from '../balance.js'

const SEGMENT_TYPES = new Set(['black', 'red', 'white'])
const BET_SIDES     = new Set(['player', 'banker', 'tie'])
const BET_TYPES     = new Set(['number','red','black','even','odd','low','high','dozen1','dozen2','dozen3','col1','col2','col3'])

function isPositiveNumber(v: unknown): v is number {
  return typeof v === 'number' && isFinite(v) && v > 0
}
function isString(v: unknown): v is string {
  return typeof v === 'string' && v.length > 0
}

const router = Router()

router.post('/aviator/bet', (req, res) => {
  const { bet, roundId } = req.body as Record<string, unknown>
  if (!isPositiveNumber(bet))  return void res.status(400).json({ error: 'Aposta inválida' })
  if (!isString(roundId))      return void res.status(400).json({ error: 'roundId inválido' })
  const result = aviatorRoom.placeBet(bet, roundId)
  if (!result.success) return void res.status(400).json({ error: result.error })
  res.json({ balance: result.balance })
})

router.post('/aviator/cashout', (req, res) => {
  const { roundId } = req.body as Record<string, unknown>
  if (!isString(roundId)) return void res.status(400).json({ error: 'roundId inválido' })
  const result = aviatorRoom.cashout(roundId)
  if (!result.success) return void res.status(400).json({ error: result.error })
  res.json({ prize: result.prize, balance: result.balance, mult: result.mult })
})

router.get('/aviator/state', (_req, res) => {
  res.json({ ...aviatorRoom.state, balance: getBalance() })
})

router.post('/roulette/bet', (req, res) => {
  const { bets, roundId } = req.body as Record<string, unknown>
  if (!isString(roundId))       return void res.status(400).json({ error: 'roundId inválido' })
  if (!Array.isArray(bets) || bets.length === 0)
    return void res.status(400).json({ error: 'Apostas inválidas' })
  for (const b of bets as Record<string, unknown>[]) {
    if (!isPositiveNumber(b.amount))   return void res.status(400).json({ error: 'Valor de aposta inválido' })
    if (!isString(b.type) || !BET_TYPES.has(b.type))
      return void res.status(400).json({ error: 'Tipo de aposta inválido' })
  }
  const result = rouletteRoom.placeBet(bets as RouletteBet[], roundId)
  if (!result.success) return void res.status(400).json({ error: result.error })
  res.json({ balance: result.balance })
})

router.get('/roulette/state', (_req, res) => {
  res.json({ ...rouletteRoom.state, balance: getBalance() })
})

router.post('/double/bet', (req, res) => {
  const { bet, chosen, roundId } = req.body as Record<string, unknown>
  if (!isPositiveNumber(bet))                        return void res.status(400).json({ error: 'Aposta inválida' })
  if (!isString(chosen) || !SEGMENT_TYPES.has(chosen)) return void res.status(400).json({ error: 'Escolha inválida' })
  if (!isString(roundId))                            return void res.status(400).json({ error: 'roundId inválido' })
  const result = doubleRoom.placeBet(bet, chosen as 'black' | 'red' | 'white', roundId)
  if (!result.success) return void res.status(400).json({ error: result.error })
  res.json({ balance: result.balance })
})

router.get('/double/state', (_req, res) => {
  res.json({ ...doubleRoom.state, balance: getBalance() })
})

router.post('/baccarat/bet', (req, res) => {
  const { bet, chosen, roundId } = req.body as Record<string, unknown>
  if (!isPositiveNumber(bet))                     return void res.status(400).json({ error: 'Aposta inválida' })
  if (!isString(chosen) || !BET_SIDES.has(chosen)) return void res.status(400).json({ error: 'Escolha inválida' })
  if (!isString(roundId))                         return void res.status(400).json({ error: 'roundId inválido' })
  const result = baccaratRoom.placeBet(bet, chosen as 'player' | 'banker' | 'tie', roundId)
  if (!result.success) return void res.status(400).json({ error: result.error })
  res.json({ balance: result.balance })
})

router.get('/baccarat/state', (_req, res) => {
  res.json({ ...baccaratRoom.state, balance: getBalance() })
})

export default router
