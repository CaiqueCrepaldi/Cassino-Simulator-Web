import type { Response } from 'express'
import { deal, type Card, type BetSide } from '../services/baccarat.js'
import { deduct, credit } from '../balance.js'
import { loadBaccaratHistory, saveBaccaratHistory } from '../persist.js'
import { subscribeSSE } from './subscribeSSE.js'

const BETTING_SEC = 7
const RESULT_SEC  = 5

export type BaccaratPhase = 'betting' | 'result'

export interface BaccaratLiveState {
  phase:       BaccaratPhase
  countdown:   number
  playerCards: Card[]  | null
  bankerCards: Card[]  | null
  winner:      BetSide | null
  playerScore: number  | null
  bankerScore: number  | null
  history:     BetSide[]
  roundId:     string
  win:         boolean
  prize:       number
  totalBet:    number
  newBalance:  number | null
}

interface PendingBet { amount: number; chosen: BetSide }

function mkId()  { return Math.random().toString(36).slice(2, 10) }
function sleep(ms: number) { return new Promise<void>(r => setTimeout(r, ms)) }

export class BaccaratRoom {
  state: BaccaratLiveState = {
    phase: 'betting', countdown: BETTING_SEC,
    playerCards: null, bankerCards: null, winner: null,
    playerScore: null, bankerScore: null,
    history: loadBaccaratHistory() as BetSide[], roundId: mkId(),
    win: false, prize: 0, totalBet: 0, newBalance: null,
  }
  private clients    = new Set<Response>()
  private pendingBet: PendingBet | null = null

  subscribe(res: Response) { subscribeSSE(res, this.clients, this.state) }

  placeBet(amount: number, chosen: BetSide, roundId: string) {
    if (this.state.phase !== 'betting') return { success: false, error: 'Apostas encerradas' }
    if (this.state.roundId !== roundId) return { success: false, error: 'Rodada mudou' }
    if (this.pendingBet)               return { success: false, error: 'Já apostou nesta rodada' }
    try {
      const balance = deduct(amount)
      this.pendingBet = { amount, chosen }
      return { success: true, balance }
    } catch (e) { return { success: false, error: (e as Error).message } }
  }

  private broadcast(d: BaccaratLiveState) {
    const m = `data: ${JSON.stringify(d)}\n\n`
    for (const r of this.clients) { try { r.write(m) } catch { this.clients.delete(r) } }
  }

  async start() {
    while (true) {
      try {
        // ── Betting ──────────────────────────────────────────────────────────
        this.state = {
          phase: 'betting', countdown: BETTING_SEC,
          playerCards: null, bankerCards: null, winner: null,
          playerScore: null, bankerScore: null,
          history: this.state.history, roundId: mkId(),
          win: false, prize: 0, totalBet: 0, newBalance: null,
        }
        this.pendingBet = null
        for (let i = BETTING_SEC; i >= 1; i--) {
          this.state.countdown = i
          this.broadcast(this.state)
          await sleep(1000)
        }

        // ── Deal & settle ─────────────────────────────────────────────────────
        const pending   = this.pendingBet as PendingBet | null
        const betAmount = pending?.amount ?? 0
        const betChosen = pending?.chosen ?? 'player'
        const result    = deal(betAmount, betChosen)

        let newBalance: number | null = null
        if (pending && result.win) newBalance = credit(result.prize)

        const newHistory = [result.winner, ...this.state.history].slice(0, 15) as BetSide[]
        saveBaccaratHistory(newHistory)

        // ── Result ───────────────────────────────────────────────────────────
        this.state = {
          ...this.state, phase: 'result', countdown: RESULT_SEC,
          playerCards: result.playerCards, bankerCards: result.bankerCards,
          winner: result.winner, playerScore: result.playerScore, bankerScore: result.bankerScore,
          history: newHistory,
          win: pending ? result.win : false,
          prize: pending ? result.prize : 0,
          totalBet: betAmount, newBalance,
        }
        for (let i = RESULT_SEC; i >= 1; i--) {
          this.state.countdown = i
          this.broadcast(this.state)
          await sleep(1000)
        }
      } catch (err) {
        console.error('[BaccaratRoom] loop error:', err)
        await sleep(2000)
      }
    }
  }
}

export const baccaratRoom = new BaccaratRoom()
