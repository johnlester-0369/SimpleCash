import { useState } from 'react'
import { Helmet } from '@dr.pogodin/react-helmet'
import { useForm, Controller, useWatch } from 'react-hook-form'
import type { Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { format } from 'date-fns'
import {
  Plus,
  Pencil,
  Trash2,
  Ban,
  RotateCcw,
  Receipt,
  Search,
} from 'lucide-react'
import { useExpensesQuery } from '@/app/features/expenses/expense.queries'
import {
  useCreateExpenseMutation,
  useUpdateExpenseMutation,
  useDeleteExpenseMutation,
  useCancelExpenseMutation,
  useReactivateExpenseMutation,
} from '@/app/features/expenses/expense.mutations'
import {
  expenseFormSchema,
  editExpenseFormSchema,
  type ExpenseFormValues,
  type EditExpenseFormValues,
} from '@/app/features/expenses/expense.schema'
import type {
  Expense,
  ExpenseType,
} from '@/app/features/expenses/expense.types'
import Button from '@/app/components/ui/buttons/Button'
import Input from '@/app/components/ui/forms/Input'
import Select from '@/app/components/ui/forms/Select'
import DatePicker from '@/app/components/ui/picker/DatePicker'
import { Field } from '@/app/components/ui/forms/Field'
import Card from '@/app/components/ui/data-display/Card'
import Table from '@/app/components/ui/data-display/Table'
import Badge from '@/app/components/ui/data-display/Badge'
import EmptyState from '@/app/components/ui/data-display/EmptyState'
import Alert from '@/app/components/ui/feedback/Alert'
import Dialog from '@/app/components/ui/overlay/Dialog'

const TYPE_OPTIONS = [
  { value: 'one_time', label: 'One-time' },
  { value: 'recurring', label: 'Recurring' },
]

// Select lacks a clearable prop, so we add an explicit 'All types' option for the filter
const FILTER_TYPE_OPTIONS = [{ value: '', label: 'All types' }, ...TYPE_OPTIONS]

const FREQUENCY_LABEL: Record<string, string> = {
  minute: 'Every minute',
  hour: 'Hourly',
  day: 'Daily',
  month: 'Monthly',
  year: 'Yearly',
}

export default function ExpensesView() {
  const [search, setSearch] = useState('')
  const [type, setType] = useState<ExpenseType | ''>('')

  const { data, isLoading, isError } = useExpensesQuery({
    search: search || undefined,
    type: type || undefined,
  })

  const createExpense = useCreateExpenseMutation()
  const updateExpense = useUpdateExpenseMutation()
  const deleteExpense = useDeleteExpenseMutation()
  const cancelExpense = useCancelExpenseMutation()
  const reactivateExpense = useReactivateExpenseMutation()

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null)
  const [cancellingExpense, setCancellingExpense] = useState<Expense | null>(
    null,
  )
  const [reactivatingExpense, setReactivatingExpense] =
    useState<Expense | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  // Add form — full discriminated-union schema (type toggle drives which
  // conditional fields validate), matching expense.schema.ts's create shape
  const addForm = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema) as Resolver<ExpenseFormValues>,
    defaultValues: {
      type: 'one_time',
      name: '',
      amount: 0,
      // Today's date, so the Add dialog opens pre-filled instead of empty
      purchasedAt: format(new Date(), 'yyyy-MM-dd'),
    },
  })

  // Edit form — only used for one-time entries; recurring entries render
  // amount/frequency as read-only text per SPEC.md's write-once rule
  const editForm = useForm<EditExpenseFormValues>({
    resolver: zodResolver(
      editExpenseFormSchema,
    ) as Resolver<EditExpenseFormValues>,
    defaultValues: { name: '', amount: 0 },
  })

  // useWatch isolates re-renders to just the hook, avoiding React Compiler memoization warnings from watch()
  const addType = useWatch({ control: addForm.control, name: 'type' })

  function openCreateForm() {
    setFormError(null)
    addForm.reset({
      type: 'one_time',
      name: '',
      amount: 0,
      purchasedAt: format(new Date(), 'yyyy-MM-dd'),
    })
    setIsFormOpen(true)
  }

  function openEditForm(entry: Expense) {
    setEditingExpense(entry)
    setFormError(null)
    editForm.reset({
      name: entry.name,
      amount: Number(entry.amount),
      purchasedAt: entry.purchasedAt ?? undefined,
    })
  }

  async function onAddSubmit(values: ExpenseFormValues) {
    setFormError(null)
    try {
      if (values.type === 'one_time') {
        await createExpense.mutateAsync({
          type: 'one_time',
          name: values.name,
          amount: values.amount,
          purchasedAt: values.purchasedAt,
        })
      } else {
        await createExpense.mutateAsync({
          type: 'recurring',
          name: values.name,
          amount: values.amount,
          frequency: values.frequency,
        })
      }
      setIsFormOpen(false)
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Failed to save expense entry',
      )
    }
  }

  async function onEditSubmit(values: EditExpenseFormValues) {
    if (!editingExpense) return
    setFormError(null)
    try {
      // Recurring entries only ever send `name` — the form itself only
      // exposes name for recurring rows (amount/purchasedAt are disabled
      // inputs in the JSX below), so this payload is already safe, but
      // the branch keeps intent explicit and mirrors the server contract.
      const payload =
        editingExpense.type === 'recurring'
          ? { name: values.name }
          : {
              name: values.name,
              amount: values.amount,
              purchasedAt: values.purchasedAt,
            }
      await updateExpense.mutateAsync({
        id: editingExpense.id,
        input: payload,
      })
      setEditingExpense(null)
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Failed to update expense entry',
      )
    }
  }

  async function confirmDelete() {
    if (!deletingExpense) return
    try {
      await deleteExpense.mutateAsync(deletingExpense.id)
      setDeletingExpense(null)
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Failed to delete expense entry',
      )
    }
  }

  async function confirmCancel() {
    if (!cancellingExpense) return
    try {
      await cancelExpense.mutateAsync(cancellingExpense.id)
      setCancellingExpense(null)
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Failed to cancel expense entry',
      )
    }
  }

  async function confirmReactivate() {
    if (!reactivatingExpense) return
    try {
      await reactivateExpense.mutateAsync(reactivatingExpense.id)
      setReactivatingExpense(null)
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : 'Failed to reactivate expense entry',
      )
    }
  }

  const items = data?.data ?? []
  const hasActiveFilters = !!(search || type)
  const isGenuinelyEmpty = !isLoading && items.length === 0 && !hasActiveFilters

  function clearFilters() {
    setSearch('')
    setType('')
  }

  return (
    <>
      <Helmet>
        <title>Expenses | SimpleCash</title>
        <meta
          name="description"
          content="Track every subscription and purchase that spends your money."
        />
      </Helmet>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-headline">Expenses</h1>
            <p className="mt-1 text-muted">
              Everything spending your money, one-time or recurring.
            </p>
          </div>
          {!isGenuinelyEmpty && (
            <Button
              variant="filled"
              color="primary"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={openCreateForm}
            >
              Add Expense
            </Button>
          )}
        </div>

        {isError && (
          <Alert
            variant="tonal"
            color="error"
            title="Error"
            message="Failed to load expense entries. Please try again."
          />
        )}

        {!isGenuinelyEmpty && (
          <Card.Root>
            <Card.Body>
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <div className="relative min-w-[200px] flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search expenses..."
                    className="pl-9"
                  />
                </div>
                <Select
                  options={FILTER_TYPE_OPTIONS}
                  value={type}
                  onChange={(value) => setType(value as ExpenseType | '')}
                  fullWidth={false}
                  className="w-full sm:w-44"
                />
              </div>
            </Card.Body>
          </Card.Root>
        )}

        <Card.Root>
          <Card.Body>
            {isLoading ? (
              <Table.ScrollArea>
                <Table.Root variant="bordered" size="md">
                  <Table.Header>
                    <Table.Row>
                      <Table.Head>Name</Table.Head>
                      <Table.Head>Amount</Table.Head>
                      <Table.Head>Type</Table.Head>
                      <Table.Head>Frequency</Table.Head>
                      <Table.Head>Status</Table.Head>
                      <Table.Head align="right">Actions</Table.Head>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    <Table.Loading colSpan={6} rows={5} />
                  </Table.Body>
                </Table.Root>
              </Table.ScrollArea>
            ) : items.length === 0 ? (
              hasActiveFilters ? (
                <EmptyState
                  icon={Search}
                  title="No results found"
                  description="No expense entries match your search or filters. Try adjusting them."
                  action={{
                    label: 'Clear filters',
                    onClick: clearFilters,
                    icon: <Search className="h-4 w-4" />,
                  }}
                />
              ) : (
                <EmptyState
                  icon={Receipt}
                  title="No expenses yet"
                  description="Add your first subscription or purchase to start tracking spending."
                  action={{
                    label: 'Add Expense',
                    onClick: openCreateForm,
                    icon: <Plus className="h-4 w-4" />,
                  }}
                />
              )
            ) : (
              <Table.ScrollArea>
                <Table.Root variant="bordered" size="md">
                  <Table.Header>
                    <Table.Row>
                      <Table.Head>Name</Table.Head>
                      <Table.Head>Amount</Table.Head>
                      <Table.Head>Type</Table.Head>
                      <Table.Head>Frequency</Table.Head>
                      <Table.Head>Status</Table.Head>
                      <Table.Head align="right">Actions</Table.Head>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {items.map((entry) => (
                      <Table.Row key={entry.id}>
                        <Table.Cell className="font-medium">
                          {entry.name}
                        </Table.Cell>
                        <Table.Cell className="font-medium">
                          -₱{Number(entry.amount).toFixed(2)}
                        </Table.Cell>
                        <Table.Cell>
                          {entry.type === 'one_time' ? 'One-time' : 'Recurring'}
                        </Table.Cell>
                        <Table.Cell>
                          {entry.frequency
                            ? FREQUENCY_LABEL[entry.frequency]
                            : '—'}
                        </Table.Cell>
                        <Table.Cell>
                          {entry.status === 'n/a' ? (
                            '—'
                          ) : (
                            <Badge
                              variant="tonal"
                              color={
                                entry.status === 'active'
                                  ? 'success'
                                  : 'warning'
                              }
                            >
                              {entry.status === 'active'
                                ? 'Active'
                                : 'Cancelled'}
                            </Badge>
                          )}
                        </Table.Cell>
                        <Table.Cell align="right">
                          <div className="flex justify-end gap-2">
                            {entry.type === 'recurring' &&
                              entry.status === 'active' && (
                                <Button
                                  variant="text"
                                  color="neutral"
                                  size="sm"
                                  iconOnly
                                  leftIcon={<Ban className="h-4 w-4" />}
                                  onClick={() => setCancellingExpense(entry)}
                                  aria-label={`Cancel ${entry.name}`}
                                />
                              )}
                            {entry.type === 'recurring' &&
                              entry.status === 'cancelled' && (
                                <Button
                                  variant="text"
                                  color="neutral"
                                  size="sm"
                                  iconOnly
                                  leftIcon={<RotateCcw className="h-4 w-4" />}
                                  onClick={() => setReactivatingExpense(entry)}
                                  aria-label={`Reactivate ${entry.name}`}
                                />
                              )}
                            <Button
                              variant="text"
                              color="neutral"
                              size="sm"
                              iconOnly
                              leftIcon={<Pencil className="h-4 w-4" />}
                              onClick={() => openEditForm(entry)}
                              aria-label={`Edit ${entry.name}`}
                            />
                            {entry.type === 'one_time' && (
                              <Button
                                variant="text"
                                color="error"
                                size="sm"
                                iconOnly
                                leftIcon={<Trash2 className="h-4 w-4" />}
                                onClick={() => setDeletingExpense(entry)}
                                aria-label={`Delete ${entry.name}`}
                              />
                            )}
                          </div>
                        </Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table.Root>
              </Table.ScrollArea>
            )}
          </Card.Body>
        </Card.Root>
      </div>

      {/* Add dialog — type toggle drives conditional fields */}
      <Dialog.Root open={isFormOpen} onOpenChange={setIsFormOpen}>
        <Dialog.Positioner position="center">
          <Dialog.Backdrop />
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>Add Expense</Dialog.Title>
              <Dialog.CloseTrigger />
            </Dialog.Header>
            <form onSubmit={addForm.handleSubmit(onAddSubmit)} noValidate>
              <Dialog.Body>
                <div className="flex flex-col gap-4">
                  {formError && (
                    <Alert
                      variant="tonal"
                      color="error"
                      title="Error"
                      message={formError}
                    />
                  )}
                  <Field.Root required>
                    <Field.Label>Type</Field.Label>
                    <Controller
                      name="type"
                      control={addForm.control}
                      render={({ field }) => (
                        <Select
                          options={TYPE_OPTIONS}
                          value={field.value}
                          onChange={(value) =>
                            field.onChange(value as 'one_time' | 'recurring')
                          }
                        />
                      )}
                    />
                  </Field.Root>
                  <Field.Root
                    required
                    invalid={!!addForm.formState.errors.name}
                  >
                    <Field.Label>Name</Field.Label>
                    <Input {...addForm.register('name')} />
                    {addForm.formState.errors.name && (
                      <p className="text-body-sm text-error">
                        {addForm.formState.errors.name.message}
                      </p>
                    )}
                  </Field.Root>
                  <Field.Root
                    required
                    invalid={!!addForm.formState.errors.amount}
                  >
                    <Field.Label>Amount</Field.Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      {...addForm.register('amount')}
                    />
                    {addForm.formState.errors.amount && (
                      <p className="text-body-sm text-error">
                        {addForm.formState.errors.amount.message}
                      </p>
                    )}
                  </Field.Root>
                  {addType === 'recurring' ? (
                    <Field.Root required>
                      <Field.Label>Frequency</Field.Label>
                      <Controller
                        name="frequency"
                        control={addForm.control}
                        render={({ field }) => (
                          <Select
                            options={Object.entries(FREQUENCY_LABEL).map(
                              ([value, label]) => ({ value, label }),
                            )}
                            value={field.value ?? ''}
                            onChange={field.onChange}
                          />
                        )}
                      />
                    </Field.Root>
                  ) : (
                    <Controller
                      name="purchasedAt"
                      control={addForm.control}
                      render={({ field }) => (
                        <DatePicker
                          label="Date (optional, defaults to now)"
                          value={field.value ?? ''}
                          onChange={field.onChange}
                        />
                      )}
                    />
                  )}
                </div>
              </Dialog.Body>
              <Dialog.Footer>
                <Button
                  type="button"
                  variant="text"
                  color="neutral"
                  onClick={() => setIsFormOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="filled"
                  color="primary"
                  isLoading={addForm.formState.isSubmitting}
                >
                  Add Expense
                </Button>
              </Dialog.Footer>
            </form>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>

      {/* Edit dialog — one-time: all fields editable; recurring: name only */}
      <Dialog.Root
        open={!!editingExpense}
        onOpenChange={(open) => !open && setEditingExpense(null)}
      >
        <Dialog.Positioner position="center">
          <Dialog.Backdrop />
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>Edit {editingExpense?.name}</Dialog.Title>
              <Dialog.CloseTrigger />
            </Dialog.Header>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} noValidate>
              <Dialog.Body>
                <div className="flex flex-col gap-4">
                  {formError && (
                    <Alert
                      variant="tonal"
                      color="error"
                      title="Error"
                      message={formError}
                    />
                  )}
                  <Field.Root
                    required
                    invalid={!!editForm.formState.errors.name}
                  >
                    <Field.Label>Name</Field.Label>
                    <Input {...editForm.register('name')} />
                    {editForm.formState.errors.name && (
                      <p className="text-body-sm text-error">
                        {editForm.formState.errors.name.message}
                      </p>
                    )}
                  </Field.Root>
                  <Field.Root disabled={editingExpense?.type === 'recurring'}>
                    <Field.Label>Amount</Field.Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      disabled={editingExpense?.type === 'recurring'}
                      {...editForm.register('amount')}
                    />
                  </Field.Root>
                  {editingExpense?.type === 'recurring' && (
                    <p className="text-body-sm text-on-surface-variant">
                      Amount and frequency are locked for recurring entries.
                      Cancel this entry and add a new one to change the rate.
                    </p>
                  )}
                </div>
              </Dialog.Body>
              <Dialog.Footer>
                <Button
                  type="button"
                  variant="text"
                  color="neutral"
                  onClick={() => setEditingExpense(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="filled"
                  color="primary"
                  isLoading={editForm.formState.isSubmitting}
                >
                  Save Changes
                </Button>
              </Dialog.Footer>
            </form>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>

      {/* Cancel confirm dialog (recurring, active only) */}
      <Dialog.Root
        open={!!cancellingExpense}
        onOpenChange={(open) => !open && setCancellingExpense(null)}
      >
        <Dialog.Positioner position="center">
          <Dialog.Backdrop />
          <Dialog.Content size="sm">
            <Dialog.Header>
              <Dialog.Title>Cancel Expense</Dialog.Title>
              <Dialog.CloseTrigger />
            </Dialog.Header>
            <Dialog.Body>
              {formError && (
                <Alert
                  variant="tonal"
                  color="error"
                  title="Error"
                  message={formError}
                  className="mb-4"
                />
              )}
              <p>
                Stop future deductions for{' '}
                <span className="font-semibold">{cancellingExpense?.name}</span>
                ? Its history is kept and it can be reactivated later.
              </p>
            </Dialog.Body>
            <Dialog.Footer>
              <Button
                variant="text"
                color="neutral"
                onClick={() => setCancellingExpense(null)}
              >
                Back
              </Button>
              <Button
                variant="filled"
                color="error"
                onClick={confirmCancel}
                isLoading={cancelExpense.isPending}
              >
                Cancel Entry
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>

      {/* Reactivate confirm dialog (recurring, cancelled only) */}
      <Dialog.Root
        open={!!reactivatingExpense}
        onOpenChange={(open) => !open && setReactivatingExpense(null)}
      >
        <Dialog.Positioner position="center">
          <Dialog.Backdrop />
          <Dialog.Content size="sm">
            <Dialog.Header>
              <Dialog.Title>Reactivate Expense</Dialog.Title>
              <Dialog.CloseTrigger />
            </Dialog.Header>
            <Dialog.Body>
              {formError && (
                <Alert
                  variant="tonal"
                  color="error"
                  title="Error"
                  message={formError}
                  className="mb-4"
                />
              )}
              <p>
                Resume deductions for{' '}
                <span className="font-semibold">
                  {reactivatingExpense?.name}
                </span>
                ? A new active period starts now.
              </p>
            </Dialog.Body>
            <Dialog.Footer>
              <Button
                variant="text"
                color="neutral"
                onClick={() => setReactivatingExpense(null)}
              >
                Back
              </Button>
              <Button
                variant="filled"
                color="primary"
                onClick={confirmReactivate}
                isLoading={reactivateExpense.isPending}
              >
                Reactivate
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>

      {/* Delete confirmation dialog (one-time only) */}
      <Dialog.Root
        open={!!deletingExpense}
        onOpenChange={(open) => !open && setDeletingExpense(null)}
      >
        <Dialog.Positioner position="center">
          <Dialog.Backdrop />
          <Dialog.Content size="sm">
            <Dialog.Header>
              <Dialog.Title>Delete Expense</Dialog.Title>
              <Dialog.CloseTrigger />
            </Dialog.Header>
            <Dialog.Body>
              {formError && (
                <Alert
                  variant="tonal"
                  color="error"
                  title="Error"
                  message={formError}
                  className="mb-4"
                />
              )}
              <p>
                Are you sure you want to delete{' '}
                <span className="font-semibold">{deletingExpense?.name}</span>?
                This cannot be undone.
              </p>
            </Dialog.Body>
            <Dialog.Footer>
              <Button
                variant="text"
                color="neutral"
                onClick={() => setDeletingExpense(null)}
              >
                Cancel
              </Button>
              <Button
                variant="filled"
                color="error"
                onClick={confirmDelete}
                isLoading={deleteExpense.isPending}
              >
                Delete
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>
    </>
  )
}
