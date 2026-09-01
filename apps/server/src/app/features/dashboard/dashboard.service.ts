/**
 * Dashboard Feature — Service
 *
 * Implements the balance/net-flow formulas described in SPEC.md. Queries
 * the database directly (rather than routing through income.repository/
 * expense.repository) because this is a cross-feature aggregate that needs
 * raw period rows — the derived single-status shape those repositories
 * return would require a second query per entry to recover elapsed-time
 * history.
 *
 * @module app/features/dashboard/dashboard.service
 */
import { desc, eq } from 'drizzle-orm'
import { db } from '@/infra/lib/database/db.js'
import {
  income,
  incomePeriod,
} from '@/infra/lib/database/schema/income.schema.js'
import {
  expense,
  expensePeriod,
} from '@/infra/lib/database/schema/expense.schema.js'
import { activityLog } from '@/infra/lib/database/schema/activity.schema.js'
import type {
  DashboardActiveItem,
  DashboardFrequency,
  DashboardWeeklyFlow,
  DashboardSummary,
  DashboardActivityEvent,
  DashboardActivityType,
} from './dashboard.types.js'
import { ACTIVITY_TYPE } from '@/app/constants/activity.constants.js'

// Average day-lengths per SPEC.md — month/year are explicitly documented
// as approximations, not exact billing-date accounting
const FREQUENCY_DAYS: Record<DashboardFrequency, number> = {
  minute: 1 / 1440,
  hour: 1 / 24,
  day: 1,
  month: 30.44,
  year: 365.25,
}

// Number of rolling 7-day buckets the Spend vs Save chart renders —
// matches the previous client-side chart's default lookback window
const WEEKS_TO_SHOW = 8
const WEEK_MS = 7 * 86_400_000

function frequencyMs(frequency: DashboardFrequency): number {
  return FREQUENCY_DAYS[frequency] * 86_400_000
}

interface Span {
  id: string
  periodId: string // Used to guarantee unique event IDs across multiple periods
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
// current in-progress week rather than a stale calendar-week boundary
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
// Only the last bucket is inclusive of `end` (= now); earlier buckets are
// half-open so a boundary event can never double-count across two buckets.
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

// Builds the Spend vs Save (Weekly) series from the exact same one-time
// rows and recurring spans getSummary() already fetched for the balance
// formula — guarantees the weekly totals can never drift from the
// headline currentBalance/totalIncome/totalExpenses figures.
function buildWeeklySpendVsSave(
  oneTimeIncomeRows: {
    amount: string
    createdAt: Date
    receivedAt: Date | null
  }[],
  oneTimeExpenseRows: {
    amount: string
    createdAt: Date
    purchasedAt: Date | null
  }[],
  incomeSpans: Span[],
  expenseSpans: Span[],
  now: Date,
): DashboardWeeklyFlow[] {
  const buckets = buildWeekBuckets(now, WEEKS_TO_SHOW)
  const windowStart = buckets[0]!.start

  for (const row of oneTimeIncomeRows) {
    addToBucket(
      buckets,
      row.receivedAt ?? row.createdAt,
      Number(row.amount),
      'income',
    )
  }
  for (const row of oneTimeExpenseRows) {
    addToBucket(
      buckets,
      row.purchasedAt ?? row.createdAt,
      Number(row.amount),
      'expense',
    )
  }
  accrueWeeklySteps(incomeSpans, 'income', buckets, now, windowStart)
  accrueWeeklySteps(expenseSpans, 'expense', buckets, now, windowStart)

  return buckets.map((bucket) => ({
    weekStart: bucket.start.toISOString(),
    spend: Math.round(bucket.spend * 100) / 100,
    save: Math.round((bucket.income - bucket.spend) * 100) / 100,
  }))
}

export const dashboardService = {
  async getSummary(): Promise<DashboardSummary> {
    const now = new Date()

    // Select explicitly the fields we need, including createdAt/receivedAt/purchasedAt
    // so we can build the unified historical event log directly from these row sets
    const oneTimeIncomeRows = await db
      .select({
        id: income.id,
        name: income.name,
        amount: income.amount,
        createdAt: income.createdAt,
        receivedAt: income.receivedAt,
      })
      .from(income)
      .where(eq(income.type, 'one_time'))

    const oneTimeExpenseRows = await db
      .select({
        id: expense.id,
        name: expense.name,
        amount: expense.amount,
        createdAt: expense.createdAt,
        purchasedAt: expense.purchasedAt,
      })
      .from(expense)
      .where(eq(expense.type, 'one_time'))

    const oneTimeIncomeTotal = oneTimeIncomeRows.reduce(
      (sum, r) => sum + Number(r.amount),
      0,
    )
    const oneTimeExpenseTotal = oneTimeExpenseRows.reduce(
      (sum, r) => sum + Number(r.amount),
      0,
    )

    // Joined with EVERY period, not just the open one — SPEC.md requires
    // summing elapsed time across all historical spans, since a
    // cancel→reactivate cycle produces multiple periods per entry
    const incomeSpanRows = await db
      .select({
        id: income.id,
        periodId: incomePeriod.id,
        name: income.name,
        amount: income.amount,
        frequency: income.frequency,
        startDate: incomePeriod.startDate,
        endDate: incomePeriod.endDate,
        createdAt: income.createdAt,
      })
      .from(incomePeriod)
      .innerJoin(income, eq(incomePeriod.incomeId, income.id))

    const expenseSpanRows = await db
      .select({
        id: expense.id,
        periodId: expensePeriod.id,
        name: expense.name,
        amount: expense.amount,
        frequency: expense.frequency,
        startDate: expensePeriod.startDate,
        endDate: expensePeriod.endDate,
        createdAt: expense.createdAt,
      })
      .from(expensePeriod)
      .innerJoin(expense, eq(expensePeriod.expenseId, expense.id))

    const incomeSpans = incomeSpanRows as Span[]
    const expenseSpans = expenseSpanRows as Span[]

    function accrued(spans: Span[]): number {
      return spans.reduce((sum, span) => {
        const spanEnd = span.endDate ?? now
        const elapsedMs = spanEnd.getTime() - span.startDate.getTime()
        // Step-based accrual (intentional deviation from the old continuous
        // formula, per product request): a recurring entry only contributes
        // amount once a FULL period has elapsed — e.g. a monthly entry
        // starting Jan 1 adds nothing until Feb 1, then jumps by exactly one
        // amount at each subsequent monthly boundary, rather than accruing
        // a fractional amount continuously every millisecond.
        const wholePeriodsElapsed = Math.floor(
          elapsedMs / frequencyMs(span.frequency),
        )
        const periodsElapsed = Math.max(wholePeriodsElapsed, 0)
        return sum + Number(span.amount) * periodsElapsed
      }, 0)
    }

    // Returns the next future timestamp at which `span` crosses a period
    // boundary and its next stepped amount would land — used by the
    // runway simulation below to keep the runway card's countdown
    // consistent with the same step-based accrual rule used everywhere else.
    function nextBoundary(span: Span, from: Date): Date {
      const periodMs = frequencyMs(span.frequency)
      const elapsedMs = from.getTime() - span.startDate.getTime()
      const wholePeriods = Math.floor(elapsedMs / periodMs)
      return new Date(span.startDate.getTime() + (wholePeriods + 1) * periodMs)
    }

    // Accrued totals across ALL periods of ALL recurring entries — reused
    // below both for currentBalance (net) and for totalIncome/totalExpenses
    // (gross, per-side) so the two figures can never drift apart.
    const accruedIncomeTotal = accrued(incomeSpans)
    const accruedExpenseTotal = accrued(expenseSpans)

    const currentBalance =
      oneTimeIncomeTotal +
      accruedIncomeTotal -
      oneTimeExpenseTotal -
      accruedExpenseTotal

    // All-time gross totals per side — deliberately NOT filtered to
    // currently-active periods (unlike activeIncome/activeExpenses below):
    // this answers "how much have I earned/spent overall", covering every
    // one-time entry plus every recurring entry's accrued history whether
    // that entry is currently active or cancelled.
    const totalIncome = oneTimeIncomeTotal + accruedIncomeTotal
    const totalExpenses = oneTimeExpenseTotal + accruedExpenseTotal

    // Only currently-open periods (endDate null) count toward net flow —
    // a cancelled recurring entry stops contributing immediately (SPEC.md)
    const activeIncomeSpans = incomeSpans.filter((s) => s.endDate === null)
    const activeExpenseSpans = expenseSpans.filter((s) => s.endDate === null)

    function dailyFlow(spans: Span[]): number {
      return spans.reduce(
        (sum, s) => sum + Number(s.amount) / FREQUENCY_DAYS[s.frequency],
        0,
      )
    }

    // dailyNetFlow still uses the amortized (average) rate across active
    // spans — a valid long-run trend indicator even though actual balance
    // jumps are stepped (accrued() above), since floor(t/T) ≈ t/T over a
    // long horizon. This average rate decides direction only; the actual
    // depletion timing below is simulated using discrete period boundaries
    // to stay consistent with the stepped balance mechanism.
    const dailyNetFlow =
      dailyFlow(activeIncomeSpans) - dailyFlow(activeExpenseSpans)
    const isGrowing = dailyNetFlow >= 0

    let runwayDays: number | null = null
    let runwayDate: string | null = null
    if (!isGrowing) {
      // Discrete event simulation: walk forward through each active span's
      // next period-boundary event in chronological order, applying its
      // signed step amount (income adds, expense subtracts) exactly once
      // per crossing — mirrors accrued()'s floor-based jumps instead of
      // dividing the balance by a smooth continuous rate.
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

      // Safety cap so a genuinely non-depleting mix (rounding edge cases
      // near dailyNetFlow ≈ 0) can't spin this loop forever
      const horizon = new Date(now.getTime() + 50 * 365.25 * 86_400_000)
      let runningBalance = currentBalance
      let cursor = now

      while (runningBalance > 0 && simEvents.length > 0) {
        let soonestIndex = 0
        for (let i = 1; i < simEvents.length; i++) {
          if (
            // Was `&&` — two non-zero timestamps are always truthy, so
            // soonestIndex was unconditionally pinned to the last array
            // index (always an expense event) every iteration, starving
            // income events from ever accruing in the simulation. `<`
            // restores an actual chronological "earliest next event" scan.
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
    // the same one-time rows and spans fetched above, so it can never
    // disagree with currentBalance/totalIncome/totalExpenses.
    const weeklySpendVsSave = buildWeeklySpendVsSave(
      oneTimeIncomeRows,
      oneTimeExpenseRows,
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

    // Compute the unified event log explicitly for the Recent Activity feed
    // Drives everything from explicit creation/deletion timestamps to backwards
    // accumulation of steps for recurring records.
    const events: DashboardActivityEvent[] = []

    // 1. Fetch Explicit User Actions from the Unified Activity Log
    // This entirely replaces the old logic that tried (and failed) to synthesise
    // historical creation/deletion states directly from live table rows.
    const explicitLogs = await db
      .select()
      .from(activityLog)
      .orderBy(desc(activityLog.date))
      .limit(20)

    for (const log of explicitLogs) {
      // Postgres `numeric` stores signed values accurately (it knows + vs -) but
      // naturally strips explicit `+` prefixes from the retrieved string (`"+500"` -> `"500.00"`).
      // We restore standard signed formatting here so the UI can accurately parse
      // the direction of the flow via .startsWith('+') without displaying incomes as negatives.
      const formattedAmount =
        log.amount !== null
          ? Number(log.amount) >= 0
            ? `+${Math.abs(Number(log.amount)).toFixed(2)}`
            : `-${Math.abs(Number(log.amount)).toFixed(2)}`
          : null

      events.push({
        id: log.id,
        // Drizzle reads smallint as a number automatically
        type: log.type as DashboardActivityType,
        name: log.name,
        amount: formattedAmount,
        date: log.date.toISOString(),
      })
    }

    // 2. Compute dynamic recurring step accruals
    // Unlike discrete explicit logs above, these are purely mathematical checkpoints
    // triggered by time elapsed in recurring spans.
    for (const span of incomeSpans) {
      const periodMs = frequencyMs(span.frequency)
      const limit = span.endDate && span.endDate < now ? span.endDate : now
      const elapsedMs = limit.getTime() - span.startDate.getTime()
      const wholePeriods = Math.floor(elapsedMs / periodMs)

      // Guard: only generate the most recent 10 steps per period backward from the limit
      // to avoid infinite/long loops on old, minute/hour frequency entries
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

    // Sort the merged events array to place the most recent event at index 0, returning top 10 bounds
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
