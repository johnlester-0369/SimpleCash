/**
 * Activity Type Constants (Web)
 *
 * Mirrors the server's numeric enums for UI rendering.
 * Converting string IDs to simple integer mapping avoids heavy
 * string manipulation on both client parsing and DB storage levels.
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
