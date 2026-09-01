/**
 * Income Feature (Web) — Demo Data & CRUD
 *
 * Backs income.api.ts when VITE_DEMO_MODE=true. Maintains realistic mock records
 * matching the structure used by the database, simulating periods and dates for accurate
 * timeline generation on the dashboard.
 *
 * @module features/income/income.demo
 */
import {
  loadDemoCollection,
  saveDemoCollection,
  generateDemoId,
} from '@/infra/lib/storage/local-storage.lib'
import type {
  CreateIncomeInput,
  Income,
  IncomeListResponse,
  IncomeType,
  IncomeFrequency,
  ListIncomeParams,
  UpdateIncomeInput,
} from './income.types'
import {
  ACTIVITY_TYPE,
  type ActivityType,
} from '@/app/constants/activity.constants'

const INCOME_STORAGE_KEY = 'demo:income:v2'
const ACTIVITY_STORAGE_KEY = 'demo:activity:v2'

export interface DemoIncomePeriod {
  id: string
  startDate: string
  endDate: string | null
}

export interface DemoIncome {
  id: string
  name: string
  amount: string
  type: IncomeType
  frequency: 'minute' | 'hour' | 'day' | 'month' | 'year' | null
  receivedAt: string | null
  createdAt: string
  periods: DemoIncomePeriod[]
}

export interface DemoActivityLog {
  id: string
  type: ActivityType
  name: string
  amount: string | null
  date: string
}

/** PRNG implementation for deterministic mock generation */
function mulberry32(seed: number): () => number {
  let state = seed
  return function random() {
    state |= 0
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function randInt(rng: () => number, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min
}

function randFloat(
  rng: () => number,
  min: number,
  max: number,
  decimals = 2,
): number {
  return Number((rng() * (max - min) + min).toFixed(decimals))
}

function randomPastDateIso(
  rng: () => number,
  minDaysAgo: number,
  maxDaysAgo: number,
): string {
  const days = randInt(rng, minDaysAgo, maxDaysAgo)
  const hours = randInt(rng, 0, 23)
  const minutes = randInt(rng, 0, 59)
  const d = new Date()
  d.setDate(d.getDate() - days)
  d.setHours(hours, minutes, 0, 0)
  return d.toISOString()
}

/**
 * Generates deterministic seed items alongside their explicit creation/reception
 * activity logs, ensuring the dashboard feed represents the full history.
 */
function generateSeedIncome() {
  const rng = mulberry32(20260215)
  const items: DemoIncome[] = []
  const activities: DemoActivityLog[] = []
  let idCounter = 1

  // 1. Initial Balance (Always present to avoid 0 start)
  const balanceId = `demo-inc-${String(idCounter++).padStart(3, '0')}`
  const balanceDate = randomPastDateIso(rng, 115, 120)
  items.push({
    id: balanceId,
    name: 'Initial Balance',
    amount: randFloat(rng, 100000, 300000).toFixed(2),
    type: 'one_time',
    frequency: null,
    receivedAt: balanceDate,
    createdAt: balanceDate,
    periods: [],
  })
  activities.push({
    id: `act-inc-${idCounter}`,
    type: ACTIVITY_TYPE.INCOME_RECEIVED,
    name: 'Initial Balance',
    amount: `+${items[0]!.amount}`,
    date: balanceDate,
  })

  // 2. Recurring Income Sources
  const recurringTpls = [
    { n: 'Monthly Salary', a: [60000, 95000], f: 'month' },
    { n: 'Freelance Retainer', a: [15000, 35000], f: 'month' },
    { n: 'Investment Dividends', a: [2000, 8000], f: 'month' },
  ]
  recurringTpls.forEach((tpl) => {
    const id = `demo-inc-${String(idCounter++).padStart(3, '0')}`
    const createdAt = randomPastDateIso(rng, 60, 110)
    const amount = randFloat(rng, tpl.a[0]!, tpl.a[1]!).toFixed(2)
    items.push({
      id,
      name: tpl.n,
      amount,
      type: 'recurring',
      frequency: tpl.f as IncomeFrequency,
      receivedAt: null,
      createdAt,
      periods: [{ id: `${id}-p1`, startDate: createdAt, endDate: null }],
    })
    activities.push({
      id: `act-inc-${idCounter}`,
      type: ACTIVITY_TYPE.INCOME_CREATED,
      name: tpl.n,
      amount: `+${amount}`,
      date: createdAt,
    })
  })

  // 3. Scattered One-Time Income
  const oneTimeTpls = [
    'Tax Refund',
    'Performance Bonus',
    'Sold Old Phone',
    'Birthday Gift',
    'Consulting Gig',
    'Travel Reimbursement',
    'Marketplace Sale',
    'Cashback Reward',
  ]
  for (let i = 0; i < 16; i++) {
    const name = oneTimeTpls[randInt(rng, 0, oneTimeTpls.length - 1)]!
    const id = `demo-inc-${String(idCounter++).padStart(3, '0')}`
    const createdAt = randomPastDateIso(rng, 2, 90)
    const amount = randFloat(rng, 500, 25000).toFixed(2)
    items.push({
      id,
      name,
      amount,
      type: 'one_time',
      frequency: null,
      receivedAt: createdAt,
      createdAt,
      periods: [],
    })
    activities.push({
      id: `act-inc-${idCounter}`,
      type: ACTIVITY_TYPE.INCOME_RECEIVED,
      name,
      amount: `+${amount}`,
      date: createdAt,
    })
  }

  return { items, activities }
}

const SEEDS = generateSeedIncome()
export const SEED_INCOME = SEEDS.items
export const SEED_INCOME_ACTIVITIES = SEEDS.activities

function readIncome(): DemoIncome[] {
  return loadDemoCollection(INCOME_STORAGE_KEY, SEED_INCOME)
}

function writeIncome(items: DemoIncome[]): void {
  saveDemoCollection(INCOME_STORAGE_KEY, items)
}

// Centralized activity log append utility used across income and expense demo mocks.
// Stores up to 100 historical explicit logs to complement dynamic timeline tracking.
export function recordActivityLog(
  type: ActivityType,
  name: string,
  amount: string | null,
) {
  const raw = localStorage.getItem(ACTIVITY_STORAGE_KEY)
  const logs: DemoActivityLog[] = raw ? JSON.parse(raw) : []

  logs.unshift({
    id: generateDemoId(),
    type,
    name,
    amount,
    date: new Date().toISOString(),
  })
  saveDemoCollection(ACTIVITY_STORAGE_KEY, logs.slice(0, 100))
}

export function listAllDemoIncome(): DemoIncome[] {
  return readIncome()
}

function toIncome(demo: DemoIncome): Income {
  const hasOpenPeriod = demo.periods.some((p) => p.endDate === null)
  const status =
    demo.type === 'one_time' ? 'n/a' : hasOpenPeriod ? 'active' : 'cancelled'
  return {
    id: demo.id,
    name: demo.name,
    amount: demo.amount,
    type: demo.type,
    frequency: demo.frequency,
    receivedAt: demo.receivedAt,
    status,
    createdAt: demo.createdAt,
  }
}

export const incomeDemoApi = {
  list(params: ListIncomeParams): IncomeListResponse {
    let filtered = readIncome()
    if (params.search) {
      const q = params.search.toLowerCase()
      filtered = filtered.filter((i) => i.name.toLowerCase().includes(q))
    }
    if (params.type) {
      filtered = filtered.filter((i) => i.type === params.type)
    }
    filtered.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    return { data: filtered.map(toIncome) }
  },

  create(input: CreateIncomeInput): Income {
    const now = new Date().toISOString()
    const isRecurring = input.type === 'recurring'
    const newEntry: DemoIncome = {
      id: generateDemoId(),
      name: input.name,
      // Forces precision parity with the Postgres numeric(12,2) cast
      amount: Number(input.amount).toFixed(2),
      type: input.type,
      frequency: isRecurring ? input.frequency : null,
      receivedAt: !isRecurring ? input.receivedAt || now : null,
      createdAt: now,
      periods: isRecurring
        ? [{ id: generateDemoId(), startDate: now, endDate: null }]
        : [],
    }
    const items = readIncome()
    items.push(newEntry)
    writeIncome(items)

    recordActivityLog(
      isRecurring
        ? ACTIVITY_TYPE.INCOME_CREATED
        : ACTIVITY_TYPE.INCOME_RECEIVED,
      newEntry.name,
      `+${newEntry.amount}`,
    )
    return toIncome(newEntry)
  },

  update(id: string, input: UpdateIncomeInput): Income {
    const items = readIncome()
    const idx = items.findIndex((i) => i.id === id)
    if (idx === -1) throw new Error('Not found')
    const current = items[idx]!

    // Strict validation parity with income.service.ts
    // Rejects edits to amount or receivedAt on recurring rows since they are
    // structurally immutable to preserve past period mathematics
    if (
      current.type === 'recurring' &&
      (input.amount !== undefined || input.receivedAt !== undefined)
    ) {
      throw new Error(
        'Recurring income entries only allow editing the name. Cancel and create a new entry to change the amount.',
      )
    }

    if (input.name !== undefined) current.name = input.name
    if (current.type === 'one_time') {
      // Replicates the strict numeric(12,2) DB boundaries
      if (input.amount !== undefined)
        current.amount = Number(input.amount).toFixed(2)
      if (input.receivedAt !== undefined) current.receivedAt = input.receivedAt
    }

    writeIncome(items)
    recordActivityLog(ACTIVITY_TYPE.INCOME_UPDATED, current.name, null)
    return toIncome(current)
  },

  remove(id: string): void {
    const items = readIncome()
    const idx = items.findIndex((i) => i.id === id)
    if (idx === -1) throw new Error('Not found')
    const item = items[idx]!
    if (item.type === 'recurring') {
      throw new Error('Cannot delete recurring income')
    }

    items.splice(idx, 1)
    writeIncome(items)
    recordActivityLog(
      ACTIVITY_TYPE.INCOME_DELETED,
      item.name,
      `-${item.amount}`,
    )
  },

  cancel(id: string): Income {
    const items = readIncome()
    const item = items.find((i) => i.id === id)
    if (!item) throw new Error('Not found')
    const openPeriod = item.periods.find((p) => p.endDate === null)
    if (!openPeriod) throw new Error('Already cancelled')

    openPeriod.endDate = new Date().toISOString()
    writeIncome(items)
    recordActivityLog(ACTIVITY_TYPE.INCOME_CANCELLED, item.name, null)
    return toIncome(item)
  },

  reactivate(id: string): Income {
    const items = readIncome()
    const item = items.find((i) => i.id === id)
    if (!item) throw new Error('Not found')
    const openPeriod = item.periods.find((p) => p.endDate === null)
    if (openPeriod) throw new Error('Already active')

    item.periods.push({
      id: generateDemoId(),
      startDate: new Date().toISOString(),
      endDate: null,
    })
    writeIncome(items)
    recordActivityLog(ACTIVITY_TYPE.INCOME_REACTIVATED, item.name, null)
    return toIncome(item)
  },
}
