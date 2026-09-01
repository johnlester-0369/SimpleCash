/**
 * Income Feature (Web) — Type Definitions
 * Mirrors the server's income.mapper.ts response shape.
 * @module features/income/income.types
 */

export type IncomeType = 'one_time' | 'recurring'
export type IncomeFrequency = 'minute' | 'hour' | 'day' | 'month' | 'year'
export type IncomeStatus = 'active' | 'cancelled' | 'n/a'

export interface Income {
  readonly id: string
  name: string
  amount: string
  type: IncomeType
  frequency: IncomeFrequency | null
  receivedAt: string | null
  status: IncomeStatus
  readonly createdAt: string
}

export interface IncomeResponse {
  data: Income
}

export interface IncomeListResponse {
  data: Income[]
}

export interface ListIncomeParams {
  [key: string]: unknown
  search?: string
  type?: IncomeType
}

export type CreateIncomeInput =
  | {
      type: 'one_time'
      name: string
      amount: number
      receivedAt?: string
    }
  | {
      type: 'recurring'
      name: string
      amount: number
      frequency: IncomeFrequency
    }

export interface UpdateIncomeInput {
  name?: string
  amount?: number
  receivedAt?: string
}
