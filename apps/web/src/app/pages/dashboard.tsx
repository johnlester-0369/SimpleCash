import { Helmet } from '@dr.pogodin/react-helmet'
import { Link } from 'react-router-dom'
import { formatDistanceToNow, format } from 'date-fns'
import {
  Wallet,
  Receipt,
  TrendingUp,
  TrendingDown,
  LayoutDashboard,
  Settings,
  Plus,
  ArrowDownRight,
  ArrowUpRight,
  Ban,
  History,
  Trash,
  Pencil,
} from 'lucide-react'
import { useDashboardSummaryQuery } from '@/app/features/dashboard/dashboard.queries'
import Card from '@/app/components/ui/data-display/Card'
import Badge from '@/app/components/ui/data-display/Badge'
import Alert from '@/app/components/ui/feedback/Alert'
import Button from '@/app/components/ui/buttons/Button'
import { ROUTES } from '@/app/routes/routes.constants'
import type { DashboardActivityType } from '@/app/features/dashboard/dashboard.types'
import { ACTIVITY_TYPE } from '@/app/constants/activity.constants'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

const FREQUENCY_LABEL: Record<string, string> = {
  minute: 'Every minute',
  hour: 'Hourly',
  day: 'Daily',
  month: 'Monthly',
  year: 'Yearly',
}

interface FlowSlice {
  name: string
  value: number
}

/**
 * Converts the server's all-time totalIncome/totalExpenses figures (which
 * already sum every one-time entry plus every recurring entry's accrued
 * whole periods — active or cancelled, see dashboard.service.ts) into the
 * two-slice breakdown for the Spent vs Saved pie chart: how much of
 * everything ever earned has gone out the door versus how much is still
 * sitting in the balance. Saved is floored at zero when expenses exceed
 * income (overspent all-time) — a pie chart can't render a negative
 * slice, and the Spent slice alone still communicates the overspend.
 */
function buildSpendVsSavedBreakdown(
  totalIncome: number,
  totalExpenses: number,
): FlowSlice[] {
  const saved = Math.max(totalIncome - totalExpenses, 0)
  return [
    { name: 'Spent', value: totalExpenses },
    { name: 'Saved', value: saved },
  ]
}

/**
 * Savings rate — the share of everything ever earned that hasn't been
 * spent: (totalIncome − totalExpenses) / totalIncome × 100. Replaces the
 * old flat "Balance is growing" label (which just restated the trending
 * icon) with a concrete, comparable percentage — the same headline metric
 * budgeting/FIRE-style apps lead with. Returns null when totalIncome is 0
 * (nothing earned yet) so the UI can render a neutral placeholder instead
 * of dividing by zero. Can legitimately be negative (spent more than
 * earned all-time) even while daily flow currently trends positive —
 * that's real information, not a bug, so it's rendered as-is.
 */
function computeSavingsRate(
  totalIncome: number,
  totalExpenses: number,
): number | null {
  if (totalIncome <= 0) return null
  return ((totalIncome - totalExpenses) / totalIncome) * 100
}

/**
 * Maps the server's unified activity log discriminators to visual Lucide icons.
 */
function getActivityIcon(type: DashboardActivityType) {
  switch (type) {
    case ACTIVITY_TYPE.INCOME_CREATED:
    case ACTIVITY_TYPE.EXPENSE_CREATED:
      return <Plus className="h-4 w-4 text-primary" />
    case ACTIVITY_TYPE.INCOME_RECEIVED:
    case ACTIVITY_TYPE.INCOME_STEP:
      return <ArrowUpRight className="h-4 w-4 text-success" />
    case ACTIVITY_TYPE.EXPENSE_PAID:
    case ACTIVITY_TYPE.EXPENSE_STEP:
      return <ArrowDownRight className="h-4 w-4 text-warning" />
    case ACTIVITY_TYPE.INCOME_CANCELLED:
    case ACTIVITY_TYPE.EXPENSE_CANCELLED:
      return <Ban className="h-4 w-4 text-on-surface-variant" />
    case ACTIVITY_TYPE.INCOME_DELETED:
    case ACTIVITY_TYPE.EXPENSE_DELETED:
      return <Trash className="h-4 w-4 text-on-surface-variant" />
    case ACTIVITY_TYPE.INCOME_REACTIVATED:
    case ACTIVITY_TYPE.EXPENSE_REACTIVATED:
      return <History className="h-4 w-4 text-primary" />
    case ACTIVITY_TYPE.INCOME_UPDATED:
    case ACTIVITY_TYPE.EXPENSE_UPDATED:
      return <Pencil className="h-4 w-4 text-on-surface-variant" />
  }
}

/**
 * Reconstructs the display string from the log type and entity name,
 * reducing duplicate string templates in the database layer.
 */
function getActivityMessage(type: DashboardActivityType, name: string): string {
  switch (type) {
    case ACTIVITY_TYPE.INCOME_CREATED:
      return `Added recurring income: ${name}`
    case ACTIVITY_TYPE.EXPENSE_CREATED:
      return `Added recurring expense: ${name}`
    case ACTIVITY_TYPE.INCOME_RECEIVED:
      return `Received one-time income: ${name}`
    case ACTIVITY_TYPE.EXPENSE_PAID:
      return `Paid one-time expense: ${name}`
    case ACTIVITY_TYPE.INCOME_UPDATED:
      return `Updated income: ${name}`
    case ACTIVITY_TYPE.EXPENSE_UPDATED:
      return `Updated expense: ${name}`
    case ACTIVITY_TYPE.INCOME_DELETED:
      return `Deleted income: ${name}`
    case ACTIVITY_TYPE.EXPENSE_DELETED:
      return `Deleted expense: ${name}`
    case ACTIVITY_TYPE.INCOME_CANCELLED:
      return `Cancelled recurring income: ${name}`
    case ACTIVITY_TYPE.EXPENSE_CANCELLED:
      return `Cancelled recurring expense: ${name}`
    case ACTIVITY_TYPE.INCOME_REACTIVATED:
      return `Reactivated income: ${name}`
    case ACTIVITY_TYPE.EXPENSE_REACTIVATED:
      return `Reactivated expense: ${name}`
    case ACTIVITY_TYPE.INCOME_STEP:
      return `Accrued: ${name}`
    case ACTIVITY_TYPE.EXPENSE_STEP:
      return `Paid: ${name}`
    default:
      return name
  }
}

interface QuickAction {
  label: string
  description: string
  icon: React.ReactNode
  href: string
  iconBg: string
  iconColor: string
}

// Quick actions mirror the pattern from the reference example — each entry
// links to a route that exists in routes.constants.ts, providing one-click
// shortcuts to the most frequent admin tasks.
const QUICK_ACTIONS: QuickAction[] = [
  {
    label: 'Income',
    description: 'Track your income sources',
    icon: <Wallet className="h-5 w-5" />,
    href: ROUTES.ADMIN.INCOME,
    iconBg: 'bg-primary/10 group-hover:bg-primary/20',
    iconColor: 'text-primary',
  },
  {
    label: 'Expenses',
    description: 'Manage your spending',
    icon: <Receipt className="h-5 w-5" />,
    href: ROUTES.ADMIN.EXPENSES,
    iconBg: 'bg-success/10 group-hover:bg-success/20',
    iconColor: 'text-success',
  },
  {
    label: 'Settings',
    description: 'Manage your admin account',
    icon: <Settings className="h-5 w-5" />,
    href: ROUTES.ADMIN.ACCOUNT_SETTINGS,
    iconBg: 'bg-warning/10 group-hover:bg-warning/20',
    iconColor: 'text-warning',
  },
  {
    label: 'Dashboard',
    description: 'Overview at a glance',
    icon: <LayoutDashboard className="h-5 w-5" />,
    href: ROUTES.ADMIN.DASHBOARD,
    iconBg: 'bg-info/10 group-hover:bg-info/20',
    iconColor: 'text-info',
  },
]

/**
 * Dashboard — SPEC.md `/dashboard`.
 * Renders the live-computed balance/net-flow summary from
 * GET /api/v1/dashboard/summary. No client-side balance math happens
 * here — every figure, including the Spend vs Save (Weekly) bar chart's
 * weeklySpendVsSave series, is derived server-side by dashboard.service.ts
 * so the chart and the headline balance figures can never disagree. The
 * two exceptions are Savings Rate (computeSavingsRate) and the Spent vs
 * Saved pie chart split (buildSpendVsSavedBreakdown) — both pure
 * derivations from totalIncome/totalExpenses computed client-side; no new
 * figure is introduced server-side, just a different presentation of
 * numbers already in the payload.
 *
 * Quick actions provide one-click navigation to the most frequent admin
 * tasks (Income, Expenses, Settings, Dashboard) in a grid of icon cards
 * matching the reference example's pattern.
 */
export default function DashboardView() {
  const { data, isLoading, isError } = useDashboardSummaryQuery()

  const savingsRate = data
    ? computeSavingsRate(Number(data.totalIncome), Number(data.totalExpenses))
    : null

  return (
    <>
      <Helmet>
        <title>Dashboard | SimpleCash</title>
        <meta
          name="description"
          content="Your current balance and where it's headed, at a glance."
        />
      </Helmet>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-headline">Dashboard</h1>
          <p className="mt-1 text-muted">
            Your current balance and where it&apos;s headed, at a glance.
          </p>
        </div>

        {isError && (
          <Alert
            variant="tonal"
            color="error"
            title="Error"
            message="Failed to load dashboard summary. Please try again."
          />
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Card.Root className="shadow-sm border border-outline-variant/25">
            <Card.Body>
              <p className="text-body-sm text-on-surface-variant">
                Current Balance
              </p>
              <p className="mt-1 text-3xl font-bold text-on-surface">
                {isLoading
                  ? '—'
                  : `₱${Number(data?.currentBalance ?? 0).toFixed(2)}`}
              </p>
            </Card.Body>
          </Card.Root>

          <Card.Root className="shadow-sm border border-outline-variant/25">
            <Card.Body>
              <div className="flex items-center gap-2">
                {/* isGrowing still branches the card — the icon keeps
                    reflecting the current daily-flow trend even though the
                    text/value below shows Savings Rate instead of a flat
                    "growing" adjective (SPEC.md: never show a countdown
                    when net flow is non-negative) */}
                {data?.isGrowing ? (
                  <TrendingUp className="h-5 w-5 text-success" />
                ) : (
                  <TrendingDown className="h-5 w-5 text-error" />
                )}
                <p className="text-body-sm text-on-surface-variant">
                  {data?.isGrowing ? 'Savings Rate' : 'Runway'}
                </p>
              </div>
              <p className="mt-1 text-2xl font-bold text-on-surface">
                {isLoading
                  ? '—'
                  : data?.isGrowing
                    ? savingsRate !== null
                      ? `${savingsRate.toFixed(1)}%`
                      : '—'
                    : data?.runwayDays !== null &&
                        data?.runwayDays !== undefined
                      ? `~${data.runwayDays} days left`
                      : '—'}
              </p>
            </Card.Body>
          </Card.Root>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card.Root className="shadow-sm border border-outline-variant/25">
            <Card.Header withDivider>
              <div className="flex w-full items-center justify-between">
                <Card.Title as="h2">Active Income</Card.Title>
                <Link to={ROUTES.ADMIN.INCOME}>
                  <Button variant="text" color="primary" size="sm">
                    View all
                  </Button>
                </Link>
              </div>
            </Card.Header>
            <Card.Body>
              {!isLoading && (data?.activeIncome.length ?? 0) === 0 ? (
                <p className="text-body-sm text-on-surface-variant">
                  No active recurring income.
                </p>
              ) : (
                <ul className="space-y-3">
                  {data?.activeIncome.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <Wallet className="h-4 w-4 text-on-surface-variant" />
                        <span className="text-body-sm text-on-surface">
                          {item.name}
                        </span>
                        <Badge variant="tonal" color="success">
                          {FREQUENCY_LABEL[item.frequency]}
                        </Badge>
                      </div>
                      <span className="text-body-sm font-medium text-on-surface">
                        ₱{Number(item.amount).toFixed(2)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card.Body>
          </Card.Root>

          <Card.Root className="shadow-sm border border-outline-variant/25">
            <Card.Header withDivider>
              <div className="flex w-full items-center justify-between">
                <Card.Title as="h2">Active Expenses</Card.Title>
                <Link to={ROUTES.ADMIN.EXPENSES}>
                  <Button variant="text" color="primary" size="sm">
                    View all
                  </Button>
                </Link>
              </div>
            </Card.Header>
            <Card.Body>
              {!isLoading && (data?.activeExpenses.length ?? 0) === 0 ? (
                <p className="text-body-sm text-on-surface-variant">
                  No active recurring expenses.
                </p>
              ) : (
                <ul className="space-y-3">
                  {data?.activeExpenses.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <Receipt className="h-4 w-4 text-on-surface-variant" />
                        <span className="text-body-sm text-on-surface">
                          {item.name}
                        </span>
                        <Badge variant="tonal" color="warning">
                          {FREQUENCY_LABEL[item.frequency]}
                        </Badge>
                      </div>
                      <span className="text-body-sm font-medium text-on-surface">
                        -₱{Number(item.amount).toFixed(2)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card.Body>
          </Card.Root>
        </div>

        {/* Spend vs Save (Weekly) bar chart and Spent vs Saved (All Time)
            pie chart — both derive entirely from figures already present
            in `data`, so no new API call is introduced. */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card.Root className="shadow-sm border border-outline-variant/25">
            <Card.Header withDivider>
              <Card.Title as="h2">Spend vs Save (Weekly)</Card.Title>
            </Card.Header>
            <Card.Body>
              {isLoading || !data ? (
                <p className="text-body-sm text-on-surface-variant">
                  Loading weekly breakdown...
                </p>
              ) : (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={data.weeklySpendVsSave}
                      margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="var(--color-outline-variant)"
                      />
                      <XAxis
                        dataKey="weekStart"
                        tickFormatter={(weekStart: string) =>
                          format(new Date(weekStart), 'MMM d')
                        }
                        stroke="var(--color-on-surface-variant)"
                        fontSize={12}
                      />
                      <YAxis
                        stroke="var(--color-on-surface-variant)"
                        fontSize={12}
                        tickFormatter={(value: number) =>
                          value < 0
                            ? `-₱${Math.abs(value).toFixed(0)}`
                            : `₱${value.toFixed(0)}`
                        }
                      />
                      {/* Recharts Tooltip typings expect generic ValueType shapes; using unknown bypasses strict mode mismatches */}
                      <Tooltip
                        formatter={(value: unknown, name: unknown) => {
                          const num = Number(value)
                          return [
                            num < 0
                              ? `-₱${Math.abs(num).toFixed(2)}`
                              : `₱${num.toFixed(2)}`,
                            name === 'spend' ? 'Spent' : 'Saved',
                          ]
                        }}
                        labelFormatter={(weekStart: unknown) =>
                          `Week of ${format(new Date(String(weekStart)), 'MMM d, yyyy')}`
                        }
                      />
                      <Legend
                        formatter={(value: string) =>
                          value === 'spend' ? 'Spent' : 'Saved'
                        }
                      />
                      {/* Two grouped bars per week — spend in warning color
                          (money out), save in success color (net kept).
                          `save` can render below the axis on an overspent
                          week, which is intentional (see DashboardWeeklyFlow). */}
                      <Bar
                        dataKey="spend"
                        fill="var(--color-warning)"
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar
                        dataKey="save"
                        fill="var(--color-success)"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card.Body>
          </Card.Root>

          <Card.Root className="shadow-sm border border-outline-variant/25">
            <Card.Header withDivider>
              <Card.Title as="h2">Spent vs Saved (All Time)</Card.Title>
            </Card.Header>
            <Card.Body>
              {isLoading || !data ? (
                <p className="text-body-sm text-on-surface-variant">
                  Loading breakdown...
                </p>
              ) : buildSpendVsSavedBreakdown(
                  Number(data.totalIncome),
                  Number(data.totalExpenses),
                ).every((slice) => slice.value === 0) ? (
                <p className="text-body-sm text-on-surface-variant">
                  No spending or savings recorded yet.
                </p>
              ) : (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={buildSpendVsSavedBreakdown(
                          Number(data.totalIncome),
                          Number(data.totalExpenses),
                        )}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={2}
                      >
                        {/* Fixed slice order (Spent, Saved) matches
                            buildSpendVsSavedBreakdown's return order, so
                            colors never swap between renders */}
                        <Cell fill="var(--color-warning)" />
                        <Cell fill="var(--color-success)" />
                      </Pie>
                      {/* Recharts Tooltip typings expect generic ValueType shapes; using any bypasses strict mode mismatches */}
                      <Tooltip
                        formatter={(value: unknown) =>
                          `₱${Number(value).toFixed(2)}`
                        }
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card.Body>
          </Card.Root>
        </div>

        <Card.Root className="shadow-sm border border-outline-variant/25">
          <Card.Header withDivider>
            <div className="flex w-full items-center gap-2">
              <Card.Title as="h2">Recent Activity</Card.Title>
            </div>
          </Card.Header>
          <Card.Body>
            {isLoading || !data ? (
              <p className="text-body-sm text-on-surface-variant">
                Loading activity...
              </p>
            ) : data.recentActivity.length === 0 ? (
              <p className="text-body-sm text-on-surface-variant">
                No recent activity found.
              </p>
            ) : (
              <ul className="divide-y divide-outline-variant/50">
                {data.recentActivity.map((event) => (
                  <li
                    key={event.id}
                    className="flex flex-col py-3 first:pt-0 last:pb-0"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-variant/50">
                          {getActivityIcon(event.type)}
                        </div>
                        <div>
                          <p className="text-body-sm font-medium text-on-surface">
                            {getActivityMessage(event.type, event.name)}
                          </p>
                          <p className="text-label-sm text-on-surface-variant">
                            {formatDistanceToNow(new Date(event.date), {
                              addSuffix: true,
                            })}
                          </p>
                        </div>
                      </div>
                      {event.amount && (
                        <span className={`text-body-sm font-medium`}>
                          {event.amount.startsWith('+') ? '' : '-'}₱
                          {Math.abs(Number(event.amount)).toFixed(2)}
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card.Body>
        </Card.Root>

        {/* Quick actions — one-click shortcuts to the most frequent admin
            tasks, styled as icon cards matching the reference example.
            The grid goes 1 column on phones, 2 on tablets, 4 on large
            screens, mirroring the example's responsive behavior. */}
        <Card.Root className="shadow-sm border border-outline-variant/25">
          <Card.Header withDivider>
            <Card.Title as="h3">Quick Actions</Card.Title>
          </Card.Header>
          <Card.Body>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {QUICK_ACTIONS.map((action) => (
                <Link key={action.label} to={action.href} className="block">
                  <div className="group flex items-center gap-3 rounded-lg border border-outline-variant p-4 transition-colors hover:border-primary hover:bg-primary/5">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors ${action.iconBg} ${action.iconColor}`}
                    >
                      {action.icon}
                    </div>
                    <div>
                      <p className="font-medium text-on-surface">
                        {action.label}
                      </p>
                      <p className="text-body-sm text-on-surface-variant">
                        {action.description}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </Card.Body>
        </Card.Root>
      </div>
    </>
  )
}
