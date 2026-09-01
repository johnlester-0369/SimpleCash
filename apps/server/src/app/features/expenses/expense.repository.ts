/**
 * Expenses Feature — Repository (Drizzle-backed)
 *
 * create()/cancel()/reactivate() each run inside db.transaction so the
 * expense row and its expense_period row(s) never diverge — mirrors
 * income.repository.ts's transactional shape exactly.
 * All write methods additionally append to the explicit activity log
 * inside the same transaction to guarantee reliable history.
 *
 * @module app/features/expenses/expense.repository
 */
import { and, desc, eq, ilike, isNull } from 'drizzle-orm'
import { db } from '@/infra/lib/database/db.js'
import {
  expense,
  expensePeriod,
} from '@/infra/lib/database/schema/expense.schema.js'
import { activityLog } from '@/infra/lib/database/schema/activity.schema.js'
import {
  ConflictError,
  NotFoundError,
} from '@/infra/lib/errors/app-error.lib.js'
import type {
  CreateExpenseInput,
  Expense,
  ExpenseStatus,
  ExpenseWithStatus,
  ListExpenseFilters,
  UpdateExpenseInput,
} from './expense.types.js'
import { ACTIVITY_TYPE } from '@/app/constants/activity.constants.js'

function toExpense(row: typeof expense.$inferSelect): Expense {
  return {
    id: row.id,
    name: row.name,
    amount: row.amount,
    type: row.type,
    frequency: row.frequency,
    purchasedAt: row.purchasedAt ? row.purchasedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
  }
}

// hasOpenPeriod must be computed the same way everywhere it's used — see
// findAll/findById below, which now reuse the exact isNull(endDate) check
// cancel()/reactivate() use, instead of a separately-computed value that
// could (and did) disagree with them.
function withStatus(
  row: typeof expense.$inferSelect,
  hasOpenPeriod: boolean,
): ExpenseWithStatus {
  const base = toExpense(row)
  const status: ExpenseStatus =
    base.type === 'one_time' ? 'n/a' : hasOpenPeriod ? 'active' : 'cancelled'
  return { ...base, status }
}

export const expenseRepository = {
  async findAll(filters: ListExpenseFilters): Promise<ExpenseWithStatus[]> {
    const conditions = [
      filters.search ? ilike(expense.name, `%${filters.search}%`) : undefined,
      filters.type ? eq(expense.type, filters.type) : undefined,
    ].filter(Boolean)
    const where = conditions.length ? and(...conditions) : undefined

    const rows = await db
      .select()
      .from(expense)
      .where(where)
      .orderBy(desc(expense.createdAt))

    // One query for every currently-open period, joined against `rows` in
    // memory via a Set — previously computed per-row through a raw
    // correlated EXISTS subquery projected as a select column, which could
    // disagree with cancel()/reactivate()'s own plain isNull(endDate)
    // check below (the exact cause of list showing "cancelled" for
    // entries reactivate() still saw as active, 409 "already active").
    const openPeriodRows = await db
      .select({ expenseId: expensePeriod.expenseId })
      .from(expensePeriod)
      .where(isNull(expensePeriod.endDate))
    const openIds = new Set(openPeriodRows.map((r) => r.expenseId))

    return rows.map((row) => withStatus(row, openIds.has(row.id)))
  },

  async findById(id: string): Promise<ExpenseWithStatus | undefined> {
    const [row] = await db
      .select()
      .from(expense)
      .where(eq(expense.id, id))
      .limit(1)
    if (!row) return undefined

    // Identical shape to cancel()/reactivate()'s open-period lookup below
    // — findById's notion of "active" must never diverge from theirs,
    // since reactivate() itself calls findById to build its response.
    const [openPeriod] = await db
      .select({ id: expensePeriod.id })
      .from(expensePeriod)
      .where(
        and(eq(expensePeriod.expenseId, id), isNull(expensePeriod.endDate)),
      )
      .limit(1)

    return withStatus(row, !!openPeriod)
  },

  async create(input: CreateExpenseInput): Promise<ExpenseWithStatus> {
    return db.transaction(async (tx) => {
      const [row] = await tx
        .insert(expense)
        .values({
          name: input.name,
          amount: String(input.amount),
          type: input.type,
          frequency: input.frequency ?? null,
          purchasedAt: input.purchasedAt ? new Date(input.purchasedAt) : null,
        })
        .returning()

      // Recurring creation auto-opens its first period (SPEC.md) —
      // one_time entries never get a period row at all.
      if (row!.type === 'recurring') {
        await tx.insert(expensePeriod).values({ expenseId: row!.id })

        // Intentionally omitting `date` to rely on the table's defaultNow()
        // to record true insertion time for consistent activity feed sorting
        await tx.insert(activityLog).values({
          type: ACTIVITY_TYPE.EXPENSE_CREATED,
          name: row!.name,
          amount: `-${row!.amount}`,
        })

        return withStatus(row!, true)
      }

      // expense_paid type maps semantically to the ArrowUpRight icon
      // matching actual fund flow rather than just configuration
      await tx.insert(activityLog).values({
        type: ACTIVITY_TYPE.EXPENSE_PAID,
        name: row!.name,
        amount: `-${row!.amount}`,
      })

      return withStatus(row!, false)
    })
  },

  async update(
    id: string,
    input: UpdateExpenseInput,
  ): Promise<ExpenseWithStatus | undefined> {
    const patch: Record<string, unknown> = {}
    if (input.name !== undefined) patch['name'] = input.name
    if (input.amount !== undefined) patch['amount'] = String(input.amount)
    if (input.purchasedAt !== undefined)
      patch['purchasedAt'] = new Date(input.purchasedAt)

    return db.transaction(async (tx) => {
      const [row] = await tx
        .update(expense)
        .set(patch)
        .where(eq(expense.id, id))
        .returning()
      if (!row) return undefined

      await tx.insert(activityLog).values({
        type: ACTIVITY_TYPE.EXPENSE_UPDATED,
        name: row.name,
        amount: null,
      })

      const [openPeriod] = await tx
        .select({ id: expensePeriod.id })
        .from(expensePeriod)
        .where(
          and(eq(expensePeriod.expenseId, id), isNull(expensePeriod.endDate)),
        )
        .limit(1)

      return withStatus(row, !!openPeriod)
    })
  },

  async delete(id: string): Promise<boolean> {
    // one_time-only guard lives in expense.service.ts (needs the row's
    // `type`, which a bare DELETE can't branch on) — matches
    // income.repository.ts's split of concerns
    return db.transaction(async (tx) => {
      const [row] = await tx
        .delete(expense)
        .where(eq(expense.id, id))
        .returning()
      if (!row) return false

      await tx.insert(activityLog).values({
        type: ACTIVITY_TYPE.EXPENSE_DELETED,
        name: row.name,
        amount: `+${row.amount}`, // Deleting an expense acts as positive balance reversion
      })

      return true
    })
  },

  async cancel(id: string): Promise<ExpenseWithStatus> {
    return db.transaction(async (tx) => {
      const [row] = await tx
        .select()
        .from(expense)
        .where(eq(expense.id, id))
        .limit(1)
      if (!row) throw new NotFoundError('Expense entry not found')

      const [closed] = await tx
        .update(expensePeriod)
        .set({ endDate: new Date() })
        .where(
          and(eq(expensePeriod.expenseId, id), isNull(expensePeriod.endDate)),
        )
        .returning({ id: expensePeriod.id })

      if (!closed) {
        throw new ConflictError('Expense entry is already cancelled')
      }

      await tx.insert(activityLog).values({
        type: ACTIVITY_TYPE.EXPENSE_CANCELLED,
        name: row.name,
        amount: null,
      })

      return withStatus(row, false)
    })
  },

  async reactivate(id: string): Promise<ExpenseWithStatus> {
    return db.transaction(async (tx) => {
      const [row] = await tx
        .select()
        .from(expense)
        .where(eq(expense.id, id))
        .limit(1)
      if (!row) throw new NotFoundError('Expense entry not found')

      const [openPeriod] = await tx
        .select({ id: expensePeriod.id })
        .from(expensePeriod)
        .where(
          and(eq(expensePeriod.expenseId, id), isNull(expensePeriod.endDate)),
        )
        .limit(1)

      if (openPeriod) {
        throw new ConflictError('Expense entry is already active')
      }

      // New period, previous one(s) left untouched — SPEC.md's
      // cancel/reactivate history model
      await tx.insert(expensePeriod).values({ expenseId: id })

      await tx.insert(activityLog).values({
        type: ACTIVITY_TYPE.EXPENSE_REACTIVATED,
        name: row.name,
        amount: null,
      })

      return withStatus(row, true)
    })
  },
}
