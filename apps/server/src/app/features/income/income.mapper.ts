/**
 * Income Feature — Mapper
 * @module app/features/income/income.mapper
 */
import type { IncomeWithStatus } from './income.types.js'

export interface IncomeResponse {
  id: string
  name: string
  amount: string
  type: 'one_time' | 'recurring'
  frequency: 'minute' | 'hour' | 'day' | 'month' | 'year' | null
  receivedAt: string | null
  status: 'active' | 'cancelled' | 'n/a'
  createdAt: string
}

export function toIncomeResponse(i: IncomeWithStatus): IncomeResponse {
  return { ...i }
}

export function toIncomeResponseList(
  items: IncomeWithStatus[],
): IncomeResponse[] {
  return items.map(toIncomeResponse)
}
