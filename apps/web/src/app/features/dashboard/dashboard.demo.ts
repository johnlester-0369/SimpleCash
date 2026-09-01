/**
 * Dashboard Feature (Web) — Demo Data Aggregation
 *
 * Implements the balance/net-flow formulas identical to dashboard.service.ts
 * but reads directly from the localStorage representations instead of DB queries.
 * Handles continuous accruals dynamically over seeded time periods.
 *
 * @module features/dashboard/dashboard.demo
 */
import { saveDemoCollection } from '@/infra/lib/storage/local-storage.lib'
import {
  listAllDemoIncome,
  SEED_INCOME_ACTIVITIES,
} from '@/app/features/income/income.demo'
import {
  listAllDemoExpenses,
  SEED_EXPENSES_ACTIVITIES,
} from '@/app/features/expenses/expense.demo'
import { ACTIVITY_TYPE } from '@/app/constants/activity.constants'
import type {
  DashboardSummary,
  DashboardActiveItem,
  DashboardWeeklyFlow,
  DashboardActivityEvent,
  DashboardFrequency,
} from './dashboard.types'

// Average day-lengths matching backend logic for smooth projection interpolation
const FREQUENCY_DAYS: Record<DashboardFrequency, number> = {
  minute: 1 / 1440,
  hour: 1 / 24,
  day: 1,
  month: 30.44,
  year: 365.25,
}

// Number of rolling 7-day buckets the Spend vs Save chart renders —
// mirrors dashboard.service.ts's WEEKS_TO_SHOW exactly, so demo mode and
// production always show the same lookback window
const WEEKS_TO_SHOW = 8
const WEEK_MS = 7 * 86_400_000
const ACTIVITY_STORAGE_KEY = 'demo:activity:v2'

function frequencyMs(frequency: DashboardFrequency): number {
  return FREQUENCY_DAYS[frequency] * 86_400_000
}

interface Span {
  id: string
  periodId: string
  name: string
  amount: string
  frequency: DashboardFrequency
  startDate: Date
  endDate: Date | null
  createdAt: Date
}

interface WeekBucket {
  start: Date
  end: Date
  spend: number
  income: number
}

// Builds fixed-width rolling 7-day buckets, oldest first — the last
// bucket always ends at `now` so the chart's rightmost bar reflects the
// current in-progress week rather than a stale calendar-week boundary.
// Mirrors dashboard.service.ts's buildWeekBuckets exactly.
function buildWeekBuckets(now: Date, weeks: number): WeekBucket[] {
  const buckets: WeekBucket[] = []
  for (let i = weeks - 1; i >= 0; i--) {
    const end = new Date(now.getTime() - i * WEEK_MS)
    const start = new Date(end.getTime() - WEEK_MS)
    buckets.push({ start, end, spend: 0, income: 0 })
  }
  return buckets
}

// Locates the bucket a given event date falls into and accumulates its
// contribution — shared by one-time entries and recurring step events so
// every money-moving event feeds the same weekly totals through one path.
function addToBucket(
  buckets: WeekBucket[],
  date: Date,
  amount: number,
  kind: 'income' | 'expense',
): void {
  const lastBucket = buckets[buckets.length - 1]!
  for (const bucket of buckets) {
    const inRange =
      bucket === lastBucket
        ? date >= bucket.start && date <= bucket.end
        : date >= bucket.start && date < bucket.end
    if (inRange) {
      if (kind === 'income') bucket.income += amount
      else bucket.spend += amount
      return
    }
  }
}

// Walks each recurring span's step boundaries and buckets every step that
// falls within the chart's window. startIdx is derived directly from
// windowStart instead of a flat step-count guess — a cap sized for
// day/month/year frequencies (the old MAX_STEPS_PER_SPAN = 5000) is far
// too small for "minute" spans: 5000 minutes is only ~3.5 days, well
// short of the 56-day window, so older weeks silently lost their
// minute-frequency contribution. Deriving startIdx from elapsed time
// bounds the loop to exactly the steps that can land in the window, for
// every frequency.
function accrueWeeklySteps(
  spans: Span[],
  kind: 'income' | 'expense',
  buckets: WeekBucket[],
  now: Date,
  windowStart: Date,
): void {
  for (const span of spans) {
    const periodMs = frequencyMs(span.frequency)
    const limit = span.endDate && span.endDate < now ? span.endDate : now
    const elapsedMs = limit.getTime() - span.startDate.getTime()
    const wholePeriods = Math.floor(elapsedMs / periodMs)
    if (wholePeriods <= 0) continue

    // First step index whose boundary date can land on/after windowStart.
    // windowElapsedMs <= 0 means the span started at or after windowStart,
    // so every step from i = 0 is potentially inside the window.
    const windowElapsedMs = windowStart.getTime() - span.startDate.getTime()
    const startIdx =
      windowElapsedMs > 0
        ? Math.max(0, Math.ceil(windowElapsedMs / periodMs) - 1)
        : 0
    for (let i = startIdx; i < wholePeriods; i++) {
      const stepDate = new Date(span.startDate.getTime() + (i + 1) * periodMs)
      if (stepDate < windowStart) continue
      addToBucket(buckets, stepDate, Number(span.amount), kind)
    }
  }
}

// Builds the Spend vs Save (Weekly) series from the same one-time rows and
// recurring spans getSummary() already computed for the balance formula —
// mirrors dashboard.service.ts's buildWeeklySpendVsSave so demo mode and
// production can never visually disagree on chart shape.
function buildWeeklySpendVsSave(
  incomeRows: {
    type: string
    amount: string
    createdAt: string
    receivedAt?: string | null
  }[],
  expenseRows: {
    type: string
    amount: string
    createdAt: string
    purchasedAt?: string | null
  }[],
  incomeSpans: Span[],
  expenseSpans: Span[],
  now: Date,
): DashboardWeeklyFlow[] {
  const buckets = buildWeekBuckets(now, WEEKS_TO_SHOW)
  const windowStart = buckets[0]!.start

  for (const row of incomeRows) {
    if (row.type !== 'one_time') continue
    const date = new Date(row.receivedAt ?? row.createdAt)
    addToBucket(buckets, date, Number(row.amount), 'income')
  }
  for (const row of expenseRows) {
    if (row.type !== 'one_time') continue
    const date = new Date(row.purchasedAt ?? row.createdAt)
    addToBucket(buckets, date, Number(row.amount), 'expense')
  }
  accrueWeeklySteps(incomeSpans, 'income', buckets, now, windowStart)
  accrueWeeklySteps(expenseSpans, 'expense', buckets, now, windowStart)

  // "save" is net contribution to balance that week (income − spend) and
  // is intentionally NOT floored at zero — a negative bar on an overspent
  // week is meaningful, unlike the all-time Spent vs Saved pie chart.
  return buckets.map((bucket) => ({
    weekStart: bucket.start.toISOString(),
    spend: Math.round(bucket.spend * 100) / 100,
    save: Math.round((bucket.income - bucket.spend) * 100) / 100,
  }))
}

export const dashboardDemoApi = {
  getSummary(): DashboardSummary {
    const now = new Date()

    const incomeRows = listAllDemoIncome()
    const expenseRows = listAllDemoExpenses()

    // Retrieve explicit logs. If the log is entirely uninitialized, mix our
    // generated activity seeds, sort chronologically, and save them. This
    // ensures the dashboard recent activity list looks populated out of the box.
    const rawLogs = localStorage.getItem(ACTIVITY_STORAGE_KEY)
    let explicitLogs: DashboardActivityEvent[]
    if (!rawLogs) {
      const seeds = [...SEED_INCOME_ACTIVITIES, ...SEED_EXPENSES_ACTIVITIES]
      seeds.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      )
      explicitLogs = seeds.slice(0, 100)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      saveDemoCollection(ACTIVITY_STORAGE_KEY, explicitLogs as any)
    } else {
      try {
        explicitLogs = JSON.parse(rawLogs)
      } catch {
        explicitLogs = []
      }
    }

    let oneTimeIncomeTotal = 0
    let oneTimeExpenseTotal = 0

    const incomeSpans: Span[] = []
    for (const inc of incomeRows) {
      if (inc.type === 'one_time') {
        oneTimeIncomeTotal += Number(inc.amount)
      } else {
        for (const p of inc.periods) {
          incomeSpans.push({
            id: inc.id,
            periodId: p.id,
            name: inc.name,
            amount: inc.amount,
            frequency: inc.frequency as DashboardFrequency,
            startDate: new Date(p.startDate),
            endDate: p.endDate ? new Date(p.endDate) : null,
            createdAt: new Date(inc.createdAt),
          })
        }
      }
    }

    const expenseSpans: Span[] = []
    for (const exp of expenseRows) {
      if (exp.type === 'one_time') {
        oneTimeExpenseTotal += Number(exp.amount)
      } else {
        for (const p of exp.periods) {
          expenseSpans.push({
            id: exp.id,
            periodId: p.id,
            name: exp.name,
            amount: exp.amount,
            frequency: exp.frequency as DashboardFrequency,
            startDate: new Date(p.startDate),
            endDate: p.endDate ? new Date(p.endDate) : null,
            createdAt: new Date(exp.createdAt),
          })
        }
      }
    }

    function accrued(spans: Span[]): number {
      return spans.reduce((sum, span) => {
        const spanEnd = span.endDate ?? now
        const elapsedMs = spanEnd.getTime() - span.startDate.getTime()
        const wholePeriodsElapsed = Math.floor(
          elapsedMs / frequencyMs(span.frequency),
        )
        const periodsElapsed = Math.max(wholePeriodsElapsed, 0)
        return sum + Number(span.amount) * periodsElapsed
      }, 0)
    }

    function nextBoundary(span: Span, from: Date): Date {
      const periodMs = frequencyMs(span.frequency)
      const elapsedMs = from.getTime() - span.startDate.getTime()
      const wholePeriods = Math.floor(elapsedMs / periodMs)
      return new Date(span.startDate.getTime() + (wholePeriods + 1) * periodMs)
    }

    const accruedIncomeTotal = accrued(incomeSpans)
    const accruedExpenseTotal = accrued(expenseSpans)

    const currentBalance =
      oneTimeIncomeTotal +
      accruedIncomeTotal -
      oneTimeExpenseTotal -
      accruedExpenseTotal

    const totalIncome = oneTimeIncomeTotal + accruedIncomeTotal
    const totalExpenses = oneTimeExpenseTotal + accruedExpenseTotal

    const activeIncomeSpans = incomeSpans.filter((s) => s.endDate === null)
    const activeExpenseSpans = expenseSpans.filter((s) => s.endDate === null)

    function dailyFlow(spans: Span[]): number {
      return spans.reduce(
        (sum, s) => sum + Number(s.amount) / FREQUENCY_DAYS[s.frequency],
        0,
      )
    }

    const dailyNetFlow =
      dailyFlow(activeIncomeSpans) - dailyFlow(activeExpenseSpans)
    const isGrowing = dailyNetFlow >= 0

    let runwayDays: number | null = null
    let runwayDate: string | null = null

    if (!isGrowing) {
      interface SimEvent {
        span: Span
        sign: 1 | -1
        next: Date
      }
      const simEvents: SimEvent[] = [
        ...activeIncomeSpans.map((span): SimEvent => ({
          span,
          sign: 1,
          next: nextBoundary(span, now),
        })),
        ...activeExpenseSpans.map((span): SimEvent => ({
          span,
          sign: -1,
          next: nextBoundary(span, now),
        })),
      ]

      const horizon = new Date(now.getTime() + 50 * 365.25 * 86_400_000)
      let runningBalance = currentBalance
      let cursor = now

      while (runningBalance > 0 && simEvents.length > 0) {
        let soonestIndex = 0
        for (let i = 1; i < simEvents.length; i++) {
          if (
            simEvents[i]!.next.getTime() <
            simEvents[soonestIndex]!.next.getTime()
          ) {
            soonestIndex = i
          }
        }
        const event = simEvents[soonestIndex]!
        if (event.next.getTime() > horizon.getTime()) break

        cursor = event.next
        runningBalance += event.sign * Number(event.span.amount)
        event.next = new Date(
          event.next.getTime() + frequencyMs(event.span.frequency),
        )
      }

      if (runningBalance <= 0) {
        runwayDays = Math.max(
          Math.floor((cursor.getTime() - now.getTime()) / 86_400_000),
          0,
        )
        runwayDate = cursor.toISOString()
      }
    }

    // Rolling 8-week Spend vs Save series for the weekly bar chart — reuses
    // the same one-time rows and spans computed above, mirroring
    // dashboard.service.ts's weeklySpendVsSave so demo mode and production
    // render the same chart shape.
    const weeklySpendVsSave = buildWeeklySpendVsSave(
      incomeRows,
      expenseRows,
      incomeSpans,
      expenseSpans,
      now,
    )

    const toItem = (s: Span): DashboardActiveItem => ({
      id: s.id,
      name: s.name,
      amount: s.amount,
      frequency: s.frequency,
    })

    const events: DashboardActivityEvent[] = []

    // Applies the exact formatting normalization from dashboard.service.ts
    // Guarantees all explicitly logged historical items are uniformly signed + .toFixed(2)
    for (const log of explicitLogs) {
      const formattedAmount =
        log.amount !== null
          ? Number(log.amount) >= 0
            ? `+${Math.abs(Number(log.amount)).toFixed(2)}`
            : `-${Math.abs(Number(log.amount)).toFixed(2)}`
          : null

      events.push({
        id: log.id,
        type: log.type,
        name: log.name,
        amount: formattedAmount,
        date: log.date,
      })
    }

    for (const span of incomeSpans) {
      const periodMs = frequencyMs(span.frequency)
      const limit = span.endDate && span.endDate < now ? span.endDate : now
      const elapsedMs = limit.getTime() - span.startDate.getTime()
      const wholePeriods = Math.floor(elapsedMs / periodMs)

      if (wholePeriods > 0) {
        const startIdx = Math.max(0, wholePeriods - 10)
        for (let i = startIdx; i < wholePeriods; i++) {
          const stepDate = new Date(
            span.startDate.getTime() + (i + 1) * periodMs,
          )
          events.push({
            id: `step-inc-${span.periodId}-${i}`,
            type: ACTIVITY_TYPE.INCOME_STEP,
            name: span.name,
            amount: `+${span.amount}`,
            date: stepDate.toISOString(),
          })
        }
      }
    }

    for (const span of expenseSpans) {
      const periodMs = frequencyMs(span.frequency)
      const limit = span.endDate && span.endDate < now ? span.endDate : now
      const elapsedMs = limit.getTime() - span.startDate.getTime()
      const wholePeriods = Math.floor(elapsedMs / periodMs)

      if (wholePeriods > 0) {
        const startIdx = Math.max(0, wholePeriods - 10)
        for (let i = startIdx; i < wholePeriods; i++) {
          const stepDate = new Date(
            span.startDate.getTime() + (i + 1) * periodMs,
          )
          events.push({
            id: `step-exp-${span.periodId}-${i}`,
            type: ACTIVITY_TYPE.EXPENSE_STEP,
            name: span.name,
            amount: `-${span.amount}`,
            date: stepDate.toISOString(),
          })
        }
      }
    }

    events.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    )
    const recentActivity = events.slice(0, 10)

    return {
      currentBalance: currentBalance.toFixed(2),
      dailyNetFlow: dailyNetFlow.toFixed(2),
      isGrowing,
      runwayDays,
      runwayDate,
      activeIncome: activeIncomeSpans.map(toItem),
      activeExpenses: activeExpenseSpans.map(toItem),
      totalIncome: totalIncome.toFixed(2),
      totalExpenses: totalExpenses.toFixed(2),
      weeklySpendVsSave,
      recentActivity,
    }
  },
}
