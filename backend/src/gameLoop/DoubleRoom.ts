import type { Response } from 'express'
import { rollSegment, type SegmentType } from '../services/double.js'
import { deduct, credit } from '../balance.js'
import { loadDoubleHistory, saveDoubleHistory } from '../persist.js'
import { subscribeSSE } from './subscribeSSE.js'

const BETTING_SEC = 7
const SPIN_SEC    = 4
const RESULT_SEC  = 4

export type DoublePhase = 'betting' | 'spinning' | 'result'

export interface DoubleState {
  phase:        DoublePhase
  countdown:    number
  segmentIndex: number | null
  type:         SegmentType | null
  mult:         number | null
  history:      SegmentType[]
  roundId:      string
  win:          boolean
  prize:        number
  totalBet:     number
  newBalance:   number | null
}

interface PendingBet { amount: number; chosen: SegmentType }

function mkId()  { return Math.random().toString(36).slice(2, 10) }
function sleep(ms: number) { return new Promise<void>(r => setTimeout(r, ms)) }

export class DoubleRoom {
  state: DoubleState = {
    phase: 'betting', countdown: BETTING_SEC, segmentIndex: null,
    type: null, mult: null, history: loadDoubleHistory() as SegmentType[],
    roundId: mkId(), win: false, prize: 0, totalBet: 0, newBalance: null,
  }
  private clients    = new Set<Response>()
  private pendingBet: PendingBet | null = null

  subscribe(res: Response) { subscribeSSE(res, this.clients, this.state) }

  placeBet(amount: number, chosen: SegmentType, roundId: string) {
    if (this.state.phase !== 'betting') return { success: false, error: 'Apostas encerradas' }
    if (this.state.roundId !== roundId) return { success: false, error: 'Rodada mudou' }
    if (this.pendingBet)               return { success: false, error: 'Já apostou nesta rodada' }
    try {
      const balance = deduct(amount)
      this.pendingBet = { amount, chosen }
      return { success: true, balance }
    } catch (e) { return { success: false, error: (e as Error).message } }
  }

  private broadcast(d: DoubleState) {
    const m = `data: ${JSON.stringify(d)}\n\n`
    for (const r of this.clients) { try { r.write(m) } catch { this.clients.delete(r) } }
  }

  async start() {
    while (true) {
      try {
        // ── Betting ──────────────────────────────────────────────────────────
        this.state = {
          phase: 'betting', countdown: BETTING_SEC, segmentIndex: null,
          type: null, mult: null, history: this.state.history, roundId: mkId(),
          win: false, prize: 0, totalBet: 0, newBalance: null,
        }
        this.pendingBet = null
        for (let i = BETTING_SEC; i >= 1; i--) {
          this.state.countdown = i
          this.broadcast(this.state)
          await sleep(1000)
        }

        // ── Spinning ─────────────────────────────────────────────────────────
        const { segmentIndex, type, mult } = rollSegment()
        this.state = { ...this.state, phase: 'spinning', countdown: SPIN_SEC, segmentIndex, type, mult }
        for (let i = SPIN_SEC; i >= 1; i--) {
          this.state.countdown = i
          this.broadcast(this.state)
          await sleep(1000)
        }

        // ── Settle ───────────────────────────────────────────────────────────
        const pending = this.pendingBet as PendingBet | null
        let win  = false
        let prize = 0
        let newBalance: number | null = null
        if (pending) {
          win   = pending.chosen === type
          prize = win ? parseFloat((pending.amount * mult).toFixed(2)) : 0
          if (win) newBalance = credit(prize)
        }
        const newHistory = [type, ...this.state.history].slice(0, 15) as SegmentType[]
        saveDoubleHistory(newHistory)

        // ── Result ───────────────────────────────────────────────────────────
        this.state = {
          ...this.state, phase: 'result', countdown: RESULT_SEC,
          history: newHistory,
          win, prize, totalBet: pending?.amount ?? 0, newBalance,
        }
        for (let i = RESULT_SEC; i >= 1; i--) {
          this.state.countdown = i
          this.broadcast(this.state)
          await sleep(1000)
        }
      } catch (err) {
        console.error('[DoubleRoom] loop error:', err)
        await sleep(2000)
      }
    }
  }
}

export const doubleRoom = new DoubleRoom()
