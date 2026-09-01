/**
 * Income Feature — Type Definitions
 * @module app/features/income/income.types
 */

export type IncomeType = 'one_time' | 'recurring'
export type IncomeFrequency = 'minute' | 'hour' | 'day' | 'month' | 'year'

export interface Income {
  readonly id: string
  name: string
  amount: string
  type: IncomeType
  frequency: IncomeFrequency | null
  receivedAt: string | null
  readonly createdAt: string
}

// Derived, not stored — "active" iff the entry has any currently-open
// period (SPEC.md). One-time entries are always 'n/a' since they never
// touch income_period at all.
export type IncomeStatus = 'active' | 'cancelled' | 'n/a'

export interface IncomeWithStatus extends Income {
  status: IncomeStatus
}

// '| undefined' on each optional field is required by
// exactOptionalPropertyTypes: true — same rationale as
// product.types.ts's CreateProductInput
export type CreateIncomeInput = Pick<Income, 'name' | 'amount' | 'type'> & {
  frequency?: IncomeFrequency | undefined
  receivedAt?: string | undefined
}

// Recurring entries only ever accept `name` here — amount/frequency are
// write-once per SPEC.md; income.schema.ts (Zod) is the enforcement point,
// this type just documents the full editable surface for one-time entries
export type UpdateIncomeInput = {
  name?: string | undefined
  amount?: string | undefined
  receivedAt?: string | undefined
}

export interface ListIncomeFilters {
  search?: string | undefined
  type?: IncomeType | undefined
}
