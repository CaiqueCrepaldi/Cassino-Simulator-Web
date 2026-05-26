import { Router } from 'express'
import { aviatorRoom } from '../gameLoop/AviatorRoom.js'
import { rouletteRoom } from '../gameLoop/RouletteRoom.js'
import { doubleRoom } from '../gameLoop/DoubleRoom.js'
import { baccaratRoom } from '../gameLoop/BaccaratRoom.js'

const router = Router()

router.get('/aviator',  (req, res) => aviatorRoom.subscribe(res))
router.get('/roulette', (req, res) => rouletteRoom.subscribe(res))
router.get('/double',   (req, res) => doubleRoom.subscribe(res))
router.get('/baccarat', (req, res) => baccaratRoom.subscribe(res))

export default router
