export function generateCrash(): number {
  const u = Math.random()
  return Math.max(1.0, parseFloat((0.99 / (1 - u * 0.99)).toFixed(2)))
}

export function settle(bet: number, crashAt: number, cashedOutAt: number): { win: boolean; prize: number } {
  if (cashedOutAt < 1 || cashedOutAt > crashAt) {
    return { win: false, prize: 0 }
  }
  const prize = parseFloat((bet * cashedOutAt).toFixed(2))
  return { win: true, prize }
}
