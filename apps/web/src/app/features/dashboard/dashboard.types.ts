/**
 * Dashboard Feature (Web) — Type Definitions
 * Mirrors the server's dashboard.service.ts response shape.
 * @module features/dashboard/dashboard.types
 */

import type { ActivityType } from '@/app/constants/activity.constants'

export type DashboardFrequency = 'minute' | 'hour' | 'day' | 'month' | 'year'

export interface DashboardActiveItem {
  id: string
  name: string
  amount: string
  frequency: DashboardFrequency
}

// Mirrors the server's DashboardWeeklyFlow — one rolling 7-day bucket
// behind the Spend vs Save (Weekly) bar chart. `save` (income − spend for
// that week) is intentionally not floored at zero: a negative bar on an
// overspent week is meaningful, unlike the all-time Spent vs Saved pie
// chart which can't render a negative slice.
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
  // All-time totals (one-time + accrued recurring, regardless of active
  // status) — mirrors dashboard.service.ts's totalIncome/totalExpenses.
  // Used to render the "everything earned vs. everything spent" chart
  // instead of the daily-equivalent active-recurring-only figures.
  totalIncome: string
  totalExpenses: string
  // Server-computed rolling 8-week Spend vs Save series — mirrors the
  // server's weeklySpendVsSave, built from the same one-time rows and
  // recurring spans behind currentBalance/totalIncome/totalExpenses, so
  // the weekly bars can never visually disagree with those figures.
  weeklySpendVsSave: DashboardWeeklyFlow[]
  // Chronological log (newest first) of all money-moving events
  // limited to the top 10 most recent entries.
  recentActivity: DashboardActivityEvent[]
}

export interface DashboardSummaryResponse {
  data: DashboardSummary
}
