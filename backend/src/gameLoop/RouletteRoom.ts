import type { Response } from 'express'
import { rollNumber, calculateWin, type RouletteBet } from '../services/roulette.js'
import { deduct, credit } from '../balance.js'
import { loadRouletteHistory, saveRouletteHistory } from '../persist.js'
import { subscribeSSE } from './subscribeSSE.js'

const BETTING_SEC = 7
const SPIN_SEC    = 4
const RESULT_SEC  = 4

export type RoulettePhase = 'betting' | 'spinning' | 'result'

export interface RouletteState {
  phase:      RoulettePhase
  countdown:  number
  result:     number | null
  color:      'red' | 'black' | 'green' | null
  history:    number[]
  roundId:    string
  totalWin:   number
  totalBet:   number
  newBalance: number | null
}

interface PendingBet { bets: RouletteBet[]; totalBet: number }

function mkId()  { return Math.random().toString(36).slice(2, 10) }
function sleep(ms: number) { return new Promise<void>(r => setTimeout(r, ms)) }

export class RouletteRoom {
  state: RouletteState = {
    phase: 'betting', countdown: BETTING_SEC, result: null, color: null,
    history: loadRouletteHistory() as number[], roundId: mkId(),
    totalWin: 0, totalBet: 0, newBalance: null,
  }
  private clients    = new Set<Response>()
  private pendingBet: PendingBet | null = null

  subscribe(res: Response) { subscribeSSE(res, this.clients, this.state) }

  placeBet(bets: RouletteBet[], roundId: string) {
    if (this.state.phase !== 'betting') return { success: false, error: 'Apostas encerradas' }
    if (this.state.roundId !== roundId) return { success: false, error: 'Rodada mudou' }
    const totalBet = bets.reduce((s, b) => s + b.amount, 0)
    if (totalBet <= 0) return { success: false, error: 'Aposta inválida' }
    try {
      const balance = deduct(totalBet)
      this.pendingBet = { bets, totalBet }
      return { success: true, balance }
    } catch (e) { return { success: false, error: (e as Error).message } }
  }

  private broadcast(d: RouletteState) {
    const m = `data: ${JSON.stringify(d)}\n\n`
    for (const r of this.clients) { try { r.write(m) } catch { this.clients.delete(r) } }
  }

  async start() {
    while (true) {
      try {
        // ── Betting ──────────────────────────────────────────────────────────
        this.state = {
          phase: 'betting', countdown: BETTING_SEC, result: null, color: null,
          history: this.state.history, roundId: mkId(),
          totalWin: 0, totalBet: 0, newBalance: null,
        }
        this.pendingBet = null
        for (let i = BETTING_SEC; i >= 1; i--) {
          this.state.countdown = i
          this.broadcast(this.state)
          await sleep(1000)
        }

        // ── Spinning ─────────────────────────────────────────────────────────
        const { number, color } = rollNumber()
        this.state = { ...this.state, phase: 'spinning', countdown: SPIN_SEC, result: number, color }
        for (let i = SPIN_SEC; i >= 1; i--) {
          this.state.countdown = i
          this.broadcast(this.state)
          await sleep(1000)
        }

        // ── Settle ───────────────────────────────────────────────────────────
        const pending = this.pendingBet as PendingBet | null
        let totalWin = 0
        let newBalance: number | null = null
        if (pending) {
          totalWin   = calculateWin(pending.bets, number)
          if (totalWin > 0) newBalance = credit(totalWin)
        }
        const newHistory = [number, ...this.state.history].slice(0, 15)
        saveRouletteHistory(newHistory)

        // ── Result ───────────────────────────────────────────────────────────
        this.state = {
          ...this.state, phase: 'result', countdown: RESULT_SEC,
          history: newHistory,
          totalWin, totalBet: pending?.totalBet ?? 0, newBalance,
        }
        for (let i = RESULT_SEC; i >= 1; i--) {
          this.state.countdown = i
          this.broadcast(this.state)
          await sleep(1000)
        }
      } catch (err) {
        console.error('[RouletteRoom] loop error:', err)
        await sleep(2000)
      }
    }
  }
}

export const rouletteRoom = new RouletteRoom()
