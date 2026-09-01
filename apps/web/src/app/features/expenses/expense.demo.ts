/**
 * Expenses Feature (Web) — Demo Data & CRUD
 *
 * Backs expense.api.ts when VITE_DEMO_MODE=true. Provides period-based
 * mock history matching the income structure for correct timeline calculation.
 *
 * @module features/expenses/expense.demo
 */
import {
  loadDemoCollection,
  saveDemoCollection,
  generateDemoId,
} from '@/infra/lib/storage/local-storage.lib'
import type {
  CreateExpenseInput,
  Expense,
  ExpenseListResponse,
  ExpenseFrequency,
  ExpenseType,
  ListExpenseParams,
  UpdateExpenseInput,
} from './expense.types'
import {
  ACTIVITY_TYPE,
  type ActivityType,
} from '@/app/constants/activity.constants'

const EXPENSE_STORAGE_KEY = 'demo:expenses:v2'
const ACTIVITY_STORAGE_KEY = 'demo:activity:v2'

export interface DemoExpensePeriod {
  id: string
  startDate: string
  endDate: string | null
}

export interface DemoExpense {
  id: string
  name: string
  amount: string
  type: ExpenseType
  frequency: 'minute' | 'hour' | 'day' | 'month' | 'year' | null
  purchasedAt: string | null
  createdAt: string
  periods: DemoExpensePeriod[]
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
function generateSeedExpenses() {
  const rng = mulberry32(20260216)
  const items: DemoExpense[] = []
  const activities: DemoActivityLog[] = []
  let idCounter = 1

  // 1. Recurring Expenses
  const recurringTpls = [
    { n: 'Apartment Rent', a: [20000, 35000], f: 'month' },
    { n: 'Electricity Bill', a: [3000, 7500], f: 'month' },
    { n: 'Fiber Internet', a: [1500, 2500], f: 'month' },
    { n: 'Gym Membership', a: [1200, 2500], f: 'month' },
    { n: 'Netflix Subscription', a: [400, 600], f: 'month' },
    { n: 'Spotify Premium', a: [150, 250], f: 'month' },
    { n: 'Water Bill', a: [500, 1500], f: 'month' },
    { n: 'Cloud Storage', a: [100, 300], f: 'month' },
  ]
  recurringTpls.forEach((tpl) => {
    const id = `demo-exp-${String(idCounter++).padStart(3, '0')}`
    const createdAt = randomPastDateIso(rng, 60, 110)
    const amount = randFloat(rng, tpl.a[0]!, tpl.a[1]!).toFixed(2)
    items.push({
      id,
      name: tpl.n,
      amount,
      type: 'recurring',
      frequency: tpl.f as ExpenseFrequency,
      purchasedAt: null,
      createdAt,
      periods: [{ id: `${id}-p1`, startDate: createdAt, endDate: null }],
    })
    activities.push({
      id: `act-exp-${idCounter}`,
      type: ACTIVITY_TYPE.EXPENSE_CREATED,
      name: tpl.n,
      amount: `-${amount}`,
      date: createdAt,
    })
  })

  // 2. Scattered One-Time Expenses
  const oneTimeTpls = [
    'Supermarket Groceries',
    'Morning Coffee',
    'Restaurant Dinner',
    'Movie Tickets',
    'Ride Share',
    'Gas Station',
    'Pharmacy',
    'Books',
    'Video Game',
    'Haircut',
    'New Shoes',
    'Concert Ticket',
    'Hardware Store',
    'Pet Supplies',
    'Office Supplies',
    'Lunch Delivery',
  ]
  for (let i = 0; i < 65; i++) {
    const name = oneTimeTpls[randInt(rng, 0, oneTimeTpls.length - 1)]!
    const id = `demo-exp-${String(idCounter++).padStart(3, '0')}`
    const createdAt = randomPastDateIso(rng, 1, 90)
    // Most expenses are small everyday things, some are larger
    const isLarge = randInt(rng, 1, 10) > 8
    const amount = randFloat(
      rng,
      isLarge ? 3000 : 150,
      isLarge ? 15000 : 1500,
    ).toFixed(2)

    items.push({
      id,
      name,
      amount,
      type: 'one_time',
      frequency: null,
      purchasedAt: createdAt,
      createdAt,
      periods: [],
    })
    activities.push({
      id: `act-exp-${idCounter}`,
      type: ACTIVITY_TYPE.EXPENSE_PAID,
      name,
      amount: `-${amount}`,
      date: createdAt,
    })
  }

  return { items, activities }
}

const SEEDS = generateSeedExpenses()
export const SEED_EXPENSES = SEEDS.items
export const SEED_EXPENSES_ACTIVITIES = SEEDS.activities

function readExpenses(): DemoExpense[] {
  return loadDemoCollection(EXPENSE_STORAGE_KEY, SEED_EXPENSES)
}

function writeExpenses(items: DemoExpense[]): void {
  saveDemoCollection(EXPENSE_STORAGE_KEY, items)
}

// Shares the explicit activity array namespace with Income to maintain
// unified event timeline continuity.
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

export function listAllDemoExpenses(): DemoExpense[] {
  return readExpenses()
}

function toExpense(demo: DemoExpense): Expense {
  const hasOpenPeriod = demo.periods.some((p) => p.endDate === null)
  const status =
    demo.type === 'one_time' ? 'n/a' : hasOpenPeriod ? 'active' : 'cancelled'
  return {
    id: demo.id,
    name: demo.name,
    amount: demo.amount,
    type: demo.type,
    frequency: demo.frequency,
    purchasedAt: demo.purchasedAt,
    status,
    createdAt: demo.createdAt,
  }
}

export const expenseDemoApi = {
  list(params: ListExpenseParams): ExpenseListResponse {
    let filtered = readExpenses()
    if (params.search) {
      const q = params.search.toLowerCase()
      filtered = filtered.filter((e) => e.name.toLowerCase().includes(q))
    }
    if (params.type) {
      filtered = filtered.filter((e) => e.type === params.type)
    }
    filtered.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    return { data: filtered.map(toExpense) }
  },

  create(input: CreateExpenseInput): Expense {
    const now = new Date().toISOString()
    const isRecurring = input.type === 'recurring'
    const newEntry: DemoExpense = {
      id: generateDemoId(),
      name: input.name,
      // Forces precision parity with the Postgres numeric(12,2) cast
      amount: Number(input.amount).toFixed(2),
      type: input.type,
      frequency: isRecurring ? input.frequency : null,
      purchasedAt: !isRecurring ? input.purchasedAt || now : null,
      createdAt: now,
      periods: isRecurring
        ? [{ id: generateDemoId(), startDate: now, endDate: null }]
        : [],
    }
    const items = readExpenses()
    items.push(newEntry)
    writeExpenses(items)

    recordActivityLog(
      isRecurring ? ACTIVITY_TYPE.EXPENSE_CREATED : ACTIVITY_TYPE.EXPENSE_PAID,
      newEntry.name,
      `-${newEntry.amount}`,
    )
    return toExpense(newEntry)
  },

  update(id: string, input: UpdateExpenseInput): Expense {
    const items = readExpenses()
    const idx = items.findIndex((e) => e.id === id)
    if (idx === -1) throw new Error('Not found')
    const current = items[idx]!

    // Strict validation parity with expense.service.ts
    // Rejects edits to amount or purchasedAt on recurring rows since they are
    // structurally immutable to preserve past period mathematics
    if (
      current.type === 'recurring' &&
      (input.amount !== undefined || input.purchasedAt !== undefined)
    ) {
      throw new Error(
        'Recurring expense entries only allow editing the name. Cancel and create a new entry to change the amount.',
      )
    }

    if (input.name !== undefined) current.name = input.name
    if (current.type === 'one_time') {
      // Replicates the strict numeric(12,2) DB boundaries
      if (input.amount !== undefined)
        current.amount = Number(input.amount).toFixed(2)
      if (input.purchasedAt !== undefined)
        current.purchasedAt = input.purchasedAt
    }

    writeExpenses(items)
    recordActivityLog(ACTIVITY_TYPE.EXPENSE_UPDATED, current.name, null)
    return toExpense(current)
  },

  remove(id: string): void {
    const items = readExpenses()
    const idx = items.findIndex((e) => e.id === id)
    if (idx === -1) throw new Error('Not found')
    const item = items[idx]!
    if (item.type === 'recurring') {
      throw new Error('Cannot delete recurring expense')
    }

    items.splice(idx, 1)
    writeExpenses(items)
    recordActivityLog(
      ACTIVITY_TYPE.EXPENSE_DELETED,
      item.name,
      `+${item.amount}`,
    )
  },

  cancel(id: string): Expense {
    const items = readExpenses()
    const item = items.find((e) => e.id === id)
    if (!item) throw new Error('Not found')
    const openPeriod = item.periods.find((p) => p.endDate === null)
    if (!openPeriod) throw new Error('Already cancelled')

    openPeriod.endDate = new Date().toISOString()
    writeExpenses(items)
    recordActivityLog(ACTIVITY_TYPE.EXPENSE_CANCELLED, item.name, null)
    return toExpense(item)
  },

  reactivate(id: string): Expense {
    const items = readExpenses()
    const item = items.find((e) => e.id === id)
    if (!item) throw new Error('Not found')
    const openPeriod = item.periods.find((p) => p.endDate === null)
    if (openPeriod) throw new Error('Already active')

    item.periods.push({
      id: generateDemoId(),
      startDate: new Date().toISOString(),
      endDate: null,
    })
    writeExpenses(items)
    recordActivityLog(ACTIVITY_TYPE.EXPENSE_REACTIVATED, item.name, null)
    return toExpense(item)
  },
}
