import type { Response } from 'express'
import { generateCrash } from '../services/aviator.js'
import { deduct, credit } from '../balance.js'
import { loadAviatorHistory, saveAviatorHistory } from '../persist.js'
import { subscribeSSE } from './subscribeSSE.js'

const MAX_HISTORY = 15
const BETTING_SEC = 5
const CRASHED_SEC = 4
const TICK_MS     = 100
const MULT_FACTOR = 1.015

export type AviatorPhase = 'betting' | 'flying' | 'crashed'

export interface AviatorState {
  phase:      AviatorPhase
  countdown:  number
  multiplier: number
  crashAt:    number | null
  history:    number[]
  roundId:    string
}

function mkId()  { return Math.random().toString(36).slice(2, 10) }
function sleep(ms: number) { return new Promise<void>(r => setTimeout(r, ms)) }

export class AviatorRoom {
  state: AviatorState = {
    phase: 'betting', countdown: BETTING_SEC, multiplier: 1.0,
    crashAt: null, history: loadAviatorHistory(), roundId: mkId(),
  }
  private clients    = new Set<Response>()
  private pendingBet: { amount: number; cashedOut: boolean } | null = null

  subscribe(res: Response) { subscribeSSE(res, this.clients, this.state) }

  placeBet(amount: number, roundId: string) {
    if (this.state.phase !== 'betting') return { success: false, error: 'Apostas encerradas' }
    if (this.state.roundId !== roundId) return { success: false, error: 'Rodada mudou, tente novamente' }
    if (this.pendingBet)               return { success: false, error: 'Já apostou nesta rodada' }
    try {
      const balance = deduct(amount)
      this.pendingBet = { amount, cashedOut: false }
      return { success: true, balance }
    } catch (e) { return { success: false, error: (e as Error).message } }
  }

  cashout(roundId: string) {
    if (this.state.phase !== 'flying')                        return { success: false, error: 'Avião não está voando' }
    if (this.state.roundId !== roundId)                       return { success: false, error: 'Rodada inválida' }
    if (!this.pendingBet || this.pendingBet.cashedOut)        return { success: false, error: 'Sem aposta ativa' }
    const mult  = this.state.multiplier
    const prize = parseFloat((this.pendingBet.amount * mult).toFixed(2))
    this.pendingBet.cashedOut = true
    const balance = credit(prize)
    return { success: true, prize, balance, mult }
  }

  private broadcast(d: AviatorState) {
    const m = `data: ${JSON.stringify(d)}\n\n`
    for (const r of this.clients) { try { r.write(m) } catch { this.clients.delete(r) } }
  }

  async start() {
    while (true) {
      try {
        // ── Betting ──────────────────────────────────────────────────────────
        this.state = {
          phase: 'betting', countdown: BETTING_SEC, multiplier: 1.0,
          crashAt: null, history: this.state.history, roundId: mkId(),
        }
        this.pendingBet = null
        for (let i = BETTING_SEC; i >= 1; i--) {
          this.state.countdown = i
          this.broadcast(this.state)
          await sleep(1000)
        }

        // ── Flying ───────────────────────────────────────────────────────────
        const crashAt = generateCrash()
        this.state = { ...this.state, phase: 'flying', countdown: 0, multiplier: 1.0 }
        this.broadcast(this.state)

        let tick = 0
        while (true) {
          await sleep(TICK_MS)
          tick++
          const mult = parseFloat(Math.pow(MULT_FACTOR, tick).toFixed(2))
          this.state.multiplier = mult
          if (mult >= crashAt) break
          this.broadcast(this.state)
        }

        // ── Crashed ──────────────────────────────────────────────────────────
        const newHistory = [crashAt, ...this.state.history].slice(0, MAX_HISTORY)
        saveAviatorHistory(newHistory)

        this.state = {
          ...this.state, phase: 'crashed', countdown: CRASHED_SEC,
          multiplier: crashAt, crashAt, history: newHistory,
        }
        for (let i = CRASHED_SEC; i >= 1; i--) {
          this.state.countdown = i
          this.broadcast(this.state)
          await sleep(1000)
        }
      } catch (err) {
        console.error('[AviatorRoom] loop error:', err)
        await sleep(2000)
      }
    }
  }
}

export const aviatorRoom = new AviatorRoom()
