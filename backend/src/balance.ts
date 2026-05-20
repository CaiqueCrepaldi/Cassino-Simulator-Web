const INITIAL = 1_000

let balance = INITIAL

export function getBalance(): number { return balance }

export function resetBalance(): number {
  balance = INITIAL
  return balance
}

export function deduct(amount: number): number {
  if (amount <= 0 || amount > balance) throw new Error('Aposta inválida ou saldo insuficiente')
  balance -= amount
  return balance
}

export function credit(amount: number): number {
  balance += amount
  return balance
}
