/**
 * Dashboard Feature — Type Definitions
 * @module app/features/dashboard/dashboard.types
 */

import type { ActivityType } from '@/app/constants/activity.constants.js'

export type DashboardFrequency = 'minute' | 'hour' | 'day' | 'month' | 'year'

export interface DashboardActiveItem {
  id: string
  name: string
  amount: string
  frequency: DashboardFrequency
}

// One rolling 7-day bucket behind the Spend vs Save (Weekly) bar chart.
// `weekStart` is the ISO timestamp of the bucket's start (the client
// formats it for the x-axis); `spend` is the bucket's total expense
// contribution; `save` is net contribution to balance (income − spend)
// for that week, and — unlike the all-time Spent vs Saved pie chart —
// is intentionally NOT floored at zero, since a negative bar on a single
// overspent week is itself meaningful information.
export interface DashboardWeeklyFlow {
  weekStart: string
  spend: number
  save: number
}

// Discriminator values mapped from the centralized numeric constants
// for formatting the recent activity UI
export type DashboardActivityType = ActivityType

// Represents a unified money-moving event or lifecycle change derived
// from existing rows across the income and expense tables/periods
export interface DashboardActivityEvent {
  id: string
  type: DashboardActivityType
  // Name replaces message to save DB storage; client formats actual display string
  name: string
  amount: string | null
  date: string
}

export interface DashboardSummary {
  currentBalance: string
  dailyNetFlow: string
  isGrowing: boolean
  runwayDays: number | null
  runwayDate: string | null
  activeIncome: DashboardActiveItem[]
  activeExpenses: DashboardActiveItem[]
  // All-time totals: one-time entries plus the accrued total of every
  // recurring entry's elapsed whole periods (same step-based accrual rule
  // as currentBalance) — covers every entry regardless of whether its
  // recurring period is currently active or cancelled. Lets the client
  // visualize "how much I've earned/spent overall" separately from the
  // active-recurring-only daily net flow figure above.
  totalIncome: string
  totalExpenses: string
  // Rolling 8-week Spend vs Save series driving the Dashboard's weekly
  // bar chart — each bucket is a 7-day window ending on the current
  // in-progress week, built from the exact same one-time rows and
  // recurring period spans used for currentBalance, so the weekly totals
  // can never drift out of sync with the headline balance figure.
  weeklySpendVsSave: DashboardWeeklyFlow[]
  // Chronological log (newest first) of all money-moving events
  // limited to the top 10 most recent entries.
  recentActivity: DashboardActivityEvent[]
}
