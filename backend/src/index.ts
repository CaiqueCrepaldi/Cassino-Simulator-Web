import express from 'express'
import cors from 'cors'
import balanceRouter   from './routes/balance.js'
import slotRouter      from './routes/slot.js'
import aviatorRouter   from './routes/aviator.js'
import doubleRouter    from './routes/double.js'
import crashDiceRouter from './routes/crashDice.js'
import rouletteRouter  from './routes/roulette.js'
import coinFlipRouter  from './routes/coinFlip.js'
import blackjackRouter from './routes/blackjack.js'
import baccaratRouter  from './routes/baccarat.js'
import streamRouter    from './routes/stream.js'
import livebetRouter   from './routes/livebet.js'
import { aviatorRoom }  from './gameLoop/AviatorRoom.js'
import { rouletteRoom } from './gameLoop/RouletteRoom.js'
import { doubleRoom }   from './gameLoop/DoubleRoom.js'
import { baccaratRoom } from './gameLoop/BaccaratRoom.js'

const app = express()

app.use(cors())
app.use(express.json())

app.use('/api/balance',          balanceRouter)
app.use('/api/games/slot',       slotRouter)
app.use('/api/games/aviator',    aviatorRouter)
app.use('/api/games/double',     doubleRouter)
app.use('/api/games/crash-dice', crashDiceRouter)
app.use('/api/games/roulette',   rouletteRouter)
app.use('/api/games/coin-flip',  coinFlipRouter)
app.use('/api/games/blackjack',  blackjackRouter)
app.use('/api/games/baccarat',   baccaratRouter)
app.use('/api/stream',           streamRouter)
app.use('/api/live',             livebetRouter)

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }))

export { app }

const PORT = process.env.PORT ?? 3001
app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`)
  // Start 24/7 game rooms
  aviatorRoom.start().catch(console.error)
  rouletteRoom.start().catch(console.error)
  doubleRoom.start().catch(console.error)
  baccaratRoom.start().catch(console.error)
})
