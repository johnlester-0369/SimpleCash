/**
 * Activity Type Constants
 *
 * Provides centralized numeric enums for tracking activity logs.
 * Mapping events to integers instead of verbose strings drastically
 * shrinks the long-term DB footprint for massive event tables.
 *
 * @module app/constants/activity.constants
 */

export const ACTIVITY_TYPE = {
  INCOME_CREATED: 1,
  EXPENSE_CREATED: 2,
  INCOME_UPDATED: 3,
  EXPENSE_UPDATED: 4,
  INCOME_DELETED: 5,
  EXPENSE_DELETED: 6,
  INCOME_RECEIVED: 7,
  EXPENSE_PAID: 8,
  INCOME_CANCELLED: 9,
  EXPENSE_CANCELLED: 10,
  INCOME_REACTIVATED: 11,
  EXPENSE_REACTIVATED: 12,
  INCOME_STEP: 13,
  EXPENSE_STEP: 14,
} as const

export type ActivityType = (typeof ACTIVITY_TYPE)[keyof typeof ACTIVITY_TYPE]
