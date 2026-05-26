import { readFileSync } from 'fs'
import { writeFile } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dir = dirname(fileURLToPath(import.meta.url))
const FILE  = join(__dir, '..', 'game-history.json')

interface Saved {
  aviator:  number[]
  roulette: number[]
  double:   string[]
  baccarat: string[]
}

function load(): Saved {
  try { return JSON.parse(readFileSync(FILE, 'utf-8')) }
  catch { return { aviator: [], roulette: [], double: [], baccarat: [] } }
}

function save(s: Saved) {
  writeFile(FILE, JSON.stringify(s)).catch(() => {})
}

const _cache = load()

export function loadAviatorHistory():  number[] { return _cache.aviator }
export function loadRouletteHistory(): number[] { return _cache.roulette }
export function loadDoubleHistory():   string[] { return _cache.double }
export function loadBaccaratHistory(): string[] { return _cache.baccarat }

export function saveAviatorHistory(h: number[]) {
  _cache.aviator = h; save(_cache)
}
export function saveRouletteHistory(h: number[]) {
  _cache.roulette = h; save(_cache)
}
export function saveDoubleHistory(h: string[]) {
  _cache.double = h; save(_cache)
}
export function saveBaccaratHistory(h: string[]) {
  _cache.baccarat = h; save(_cache)
}
