/**
 * Income Feature — Repository (Drizzle-backed)
 *
 * create()/cancel()/reactivate() each run inside db.transaction so the
 * income row and its income_period row(s) never diverge — e.g. a crash
 * between "insert income" and "insert first period" would otherwise leave
 * a recurring entry permanently stuck at 'n/a' status.
 * All write methods additionally append to the explicit activity log
 * inside the same transaction to guarantee reliable history.
 *
 * @module app/features/income/income.repository
 */
import { and, desc, eq, ilike, isNull } from 'drizzle-orm'
import { db } from '@/infra/lib/database/db.js'
import {
  income,
  incomePeriod,
} from '@/infra/lib/database/schema/income.schema.js'
import { activityLog } from '@/infra/lib/database/schema/activity.schema.js'
import {
  ConflictError,
  NotFoundError,
} from '@/infra/lib/errors/app-error.lib.js'
import type {
  CreateIncomeInput,
  Income,
  IncomeStatus,
  IncomeWithStatus,
  ListIncomeFilters,
  UpdateIncomeInput,
} from './income.types.js'
import { ACTIVITY_TYPE } from '@/app/constants/activity.constants.js'

function toIncome(row: typeof income.$inferSelect): Income {
  return {
    id: row.id,
    name: row.name,
    amount: row.amount,
    type: row.type,
    frequency: row.frequency,
    receivedAt: row.receivedAt ? row.receivedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
  }
}

// hasOpenPeriod must be computed the same way everywhere it's used — see
// findAll/findById below, which now reuse the exact isNull(endDate) check
// cancel()/reactivate() use, instead of a separately-computed value that
// could (and did) disagree with them.
function withStatus(
  row: typeof income.$inferSelect,
  hasOpenPeriod: boolean,
): IncomeWithStatus {
  const base = toIncome(row)
  const status: IncomeStatus =
    base.type === 'one_time' ? 'n/a' : hasOpenPeriod ? 'active' : 'cancelled'
  return { ...base, status }
}

export const incomeRepository = {
  async findAll(filters: ListIncomeFilters): Promise<IncomeWithStatus[]> {
    const conditions = [
      filters.search ? ilike(income.name, `%${filters.search}%`) : undefined,
      filters.type ? eq(income.type, filters.type) : undefined,
    ].filter(Boolean)
    const where = conditions.length ? and(...conditions) : undefined

    const rows = await db
      .select()
      .from(income)
      .where(where)
      .orderBy(desc(income.createdAt))

    // One query for every currently-open period across all recurring
    // entries, joined against `rows` in memory via a Set. Previously this
    // status was computed per-row through a raw correlated EXISTS subquery
    // projected as a select column — that value could disagree with
    // cancel()/reactivate()'s own plain isNull(endDate) check below,
    // which is exactly what caused the list to show "cancelled" for
    // entries reactivate() still considered active (409 "already active").
    const openPeriodRows = await db
      .select({ incomeId: incomePeriod.incomeId })
      .from(incomePeriod)
      .where(isNull(incomePeriod.endDate))
    const openIds = new Set(openPeriodRows.map((r) => r.incomeId))

    return rows.map((row) => withStatus(row, openIds.has(row.id)))
  },

  async findById(id: string): Promise<IncomeWithStatus | undefined> {
    const [row] = await db
      .select()
      .from(income)
      .where(eq(income.id, id))
      .limit(1)
    if (!row) return undefined

    // Identical shape to cancel()/reactivate()'s open-period lookup below
    // — findById's notion of "active" must never diverge from theirs,
    // since reactivate() itself calls findById to build its response.
    const [openPeriod] = await db
      .select({ id: incomePeriod.id })
      .from(incomePeriod)
      .where(and(eq(incomePeriod.incomeId, id), isNull(incomePeriod.endDate)))
      .limit(1)

    return withStatus(row, !!openPeriod)
  },

  async create(input: CreateIncomeInput): Promise<IncomeWithStatus> {
    return db.transaction(async (tx) => {
      const [row] = await tx
        .insert(income)
        .values({
          name: input.name,
          amount: String(input.amount),
          type: input.type,
          frequency: input.frequency ?? null,
          receivedAt: input.receivedAt ? new Date(input.receivedAt) : null,
        })
        .returning()

      // Recurring creation auto-opens its first period (SPEC.md) —
      // one_time entries never get a period row at all.
      if (row!.type === 'recurring') {
        await tx.insert(incomePeriod).values({ incomeId: row!.id })

        // Intentionally omitting `date` so it delegates to defaultNow()
        // This ensures the audit log reflects the chronological insertion
        // time, preventing sorting bugs in the Recent Activity feed
        await tx.insert(activityLog).values({
          type: ACTIVITY_TYPE.INCOME_CREATED,
          name: row!.name,
          amount: `+${row!.amount}`,
        })

        return withStatus(row!, true)
      }

      // income_received type maps semantically to the ArrowDownRight icon
      // matching actual fund flow rather than just configuration
      await tx.insert(activityLog).values({
        type: ACTIVITY_TYPE.INCOME_RECEIVED,
        name: row!.name,
        amount: `+${row!.amount}`,
      })

      return withStatus(row!, false)
    })
  },

  async update(
    id: string,
    input: UpdateIncomeInput,
  ): Promise<IncomeWithStatus | undefined> {
    const patch: Record<string, unknown> = {}
    if (input.name !== undefined) patch['name'] = input.name
    if (input.amount !== undefined) patch['amount'] = String(input.amount)
    if (input.receivedAt !== undefined)
      patch['receivedAt'] = new Date(input.receivedAt)

    return db.transaction(async (tx) => {
      const [row] = await tx
        .update(income)
        .set(patch)
        .where(eq(income.id, id))
        .returning()
      if (!row) return undefined

      // Explicit log keeps the timeline intact even if amount doesn't change
      await tx.insert(activityLog).values({
        type: ACTIVITY_TYPE.INCOME_UPDATED,
        name: row.name,
        amount: null,
      })

      const [openPeriod] = await tx
        .select({ id: incomePeriod.id })
        .from(incomePeriod)
        .where(and(eq(incomePeriod.incomeId, id), isNull(incomePeriod.endDate)))
        .limit(1)

      return withStatus(row, !!openPeriod)
    })
  },

  async delete(id: string): Promise<boolean> {
    // Wrapped in a transaction to capture the explicit deletion event log before
    // the row actually vanishes from the database, fixing the issue where
    // deleting an item made it disappear completely from the dashboard history.
    return db.transaction(async (tx) => {
      const [row] = await tx.delete(income).where(eq(income.id, id)).returning()
      if (!row) return false

      await tx.insert(activityLog).values({
        type: ACTIVITY_TYPE.INCOME_DELETED,
        name: row.name,
        amount: `-${row.amount}`, // Deleting income negates its balance impact
      })

      return true
    })
  },

  async cancel(id: string): Promise<IncomeWithStatus> {
    return db.transaction(async (tx) => {
      const [row] = await tx
        .select()
        .from(income)
        .where(eq(income.id, id))
        .limit(1)
      if (!row) throw new NotFoundError('Income entry not found')

      const [closed] = await tx
        .update(incomePeriod)
        .set({ endDate: new Date() })
        .where(and(eq(incomePeriod.incomeId, id), isNull(incomePeriod.endDate)))
        .returning({ id: incomePeriod.id })

      if (!closed) {
        throw new ConflictError('Income entry is already cancelled')
      }

      await tx.insert(activityLog).values({
        type: ACTIVITY_TYPE.INCOME_CANCELLED,
        name: row.name,
        amount: null,
      })

      return withStatus(row, false)
    })
  },

  async reactivate(id: string): Promise<IncomeWithStatus> {
    return db.transaction(async (tx) => {
      const [row] = await tx
        .select()
        .from(income)
        .where(eq(income.id, id))
        .limit(1)
      if (!row) throw new NotFoundError('Income entry not found')

      const [openPeriod] = await tx
        .select({ id: incomePeriod.id })
        .from(incomePeriod)
        .where(and(eq(incomePeriod.incomeId, id), isNull(incomePeriod.endDate)))
        .limit(1)

      if (openPeriod) {
        throw new ConflictError('Income entry is already active')
      }

      // New period, previous one(s) left untouched — SPEC.md's
      // cancel/reactivate history model
      await tx.insert(incomePeriod).values({ incomeId: id })

      await tx.insert(activityLog).values({
        type: ACTIVITY_TYPE.INCOME_REACTIVATED,
        name: row.name,
        amount: null,
      })

      return withStatus(row, true)
    })
  },
}
