export const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

async function post<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? 'Erro na requisição')
  }
  return res.json()
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`)
  if (!res.ok) throw new Error('Erro na requisição')
  return res.json()
}

// ─── Balance ─────────────────────────────────────────────────────────────────
export const api = {
  balance: {
    get:   ()          => get<{ balance: number }>('/api/balance'),
    reset: ()          => post<{ balance: number }>('/api/balance/reset'),
  },
  slot: {
    spin: (bet: number) =>
      post<{ reels: [number,number,number]; win: boolean; multiplier: number; prize: number; balance: number }>(
        '/api/games/slot/spin', { bet }),
  },
  aviator: {
    generate: (bet: number) =>
      post<{ crashAt: number; balance: number }>('/api/games/aviator/generate', { bet }),
    settle: (bet: number, crashAt: number, cashedOutAt: number) =>
      post<{ win: boolean; prize: number; balance: number }>('/api/games/aviator/settle', { bet, crashAt, cashedOutAt }),
  },
  double: {
    spin: (bet: number, chosen: string) =>
      post<{ segmentIndex: number; type: string; multiplier: number; win: boolean; prize: number; balance: number }>(
        '/api/games/double/spin', { bet, chosen }),
  },
  crashDice: {
    roll: (bet: number, numbers: number[]) =>
      post<{ d1: number; d2: number; sum: number; win: boolean; multiplier: number; prize: number; reason: string; balance: number }>(
        '/api/games/crash-dice/roll', { bet, numbers }),
  },
  roulette: {
    spin: (bets: { type: string; value?: number; amount: number }[]) =>
      post<{ number: number; color: string; totalBet: number; totalWin: number; balance: number }>(
        '/api/games/roulette/spin', { bets }),
  },
  coinFlip: {
    flip: (bet: number, chosen: string) =>
      post<{ result: string; win: boolean; prize: number; balance: number }>(
        '/api/games/coin-flip/flip', { bet, chosen }),
  },
  blackjack: {
    deal:  (bet: number) =>
      post<Record<string, unknown>>('/api/games/blackjack/deal', { bet }),
    hit:   (playerHand: unknown[], deck: unknown[]) =>
      post<Record<string, unknown>>('/api/games/blackjack/hit', { playerHand, deck }),
    stand: (bet: number, playerHand: unknown[], dealerHand: unknown[], deck: unknown[], doubled?: boolean) =>
      post<Record<string, unknown>>('/api/games/blackjack/stand', { bet, playerHand, dealerHand, deck, doubled }),
  },
  baccarat: {
    deal: (bet: number, chosen: string) =>
      post<Record<string, unknown>>('/api/games/baccarat/deal', { bet, chosen }),
  },
}
