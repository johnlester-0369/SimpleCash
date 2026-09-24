import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Helmet } from '@dr.pogodin/react-helmet'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { LogOut } from 'lucide-react'
import {
  useSession,
  signOut,
} from '@/infra/modules/auth/lib/admin-auth-client.lib'
import {
  useUpdateNameMutation,
  useChangePasswordMutation,
} from '@/app/features/settings/account/account.mutations'
import {
  updateNameSchema,
  changePasswordSchema,
  type UpdateNameFormValues,
  type ChangePasswordFormValues,
} from '@/app/features/settings/account/account.schema'
import Button from '@/app/components/ui/buttons/Button'
import Input from '@/app/components/ui/forms/Input'
import PasswordInput from '@/app/components/ui/forms/PasswordInput'
import { Field } from '@/app/components/ui/forms/Field'
import Card from '@/app/components/ui/data-display/Card'
import Alert from '@/app/components/ui/feedback/Alert'
import { ROUTES } from '@/app/routes/routes.constants'

/**
 * Account Settings — /settings/account
 *
 * Name/password changes call better-auth's own client methods (see
 * account.mutations.ts) rather than a custom REST mutation — this page
 * only reads through account.queries.ts for the createdAt field, which
 * useSession()'s reactive session object doesn't carry.
 *
 * Email is intentionally display-only: admin email changes are disabled,
 * so there is no form, mutation call, or edit affordance for it here —
 * changeEmailSchema/useChangeEmailMutation remain exported from their
 * respective modules for any other consumer, they are simply not wired
 * up in this component.
 */
export default function AccountSettingsView() {
  const navigate = useNavigate()
  const { data: session, refetch: refetchSession } = useSession()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  // ---- Name ----
  const [nameSuccess, setNameSuccess] = useState<string | null>(null)
  const [nameError, setNameError] = useState<string | null>(null)
  const updateName = useUpdateNameMutation()
  const {
    register: registerName,
    handleSubmit: handleNameSubmit,
    formState: { errors: nameErrors, isSubmitting: isNameSubmitting },
  } = useForm<UpdateNameFormValues>({
    resolver: zodResolver(updateNameSchema),
    values: { name: session?.user?.name ?? '' },
  })

  async function onNameSubmit(values: UpdateNameFormValues) {
    setNameSuccess(null)
    setNameError(null)
    try {
      await updateName.mutateAsync(values.name)
      await refetchSession()
      setNameSuccess('Name updated successfully.')
    } catch (err) {
      setNameError(err instanceof Error ? err.message : 'Failed to update name')
    }
  }

  // ---- Password ----
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const changePassword = useChangePasswordMutation()
  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    reset: resetPasswordForm,
    formState: { errors: passwordErrors, isSubmitting: isPasswordSubmitting },
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
  })

  async function onPasswordSubmit(values: ChangePasswordFormValues) {
    setPasswordSuccess(null)
    setPasswordError(null)
    try {
      await changePassword.mutateAsync({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      })
      resetPasswordForm()
      setPasswordSuccess('Password updated. Other sessions were signed out.')
    } catch (err) {
      setPasswordError(
        err instanceof Error ? err.message : 'Failed to update password',
      )
    }
  }

  async function handleLogout() {
    setIsLoggingOut(true)
    try {
      await signOut()
      navigate(ROUTES.ADMIN.ROOT)
    } catch (error) {
      console.error('Logout failed:', error)
      navigate(ROUTES.ADMIN.ROOT)
    } finally {
      setIsLoggingOut(false)
    }
  }

  return (
    <>
      <Helmet>
        <title>Account Settings | SimpleStock V2</title>
        <meta
          name="description"
          content="Manage your admin account profile and password."
        />
      </Helmet>
      <div className="flex flex-col gap-6 max-w-2xl mx-auto pb-12">
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-headline">
              Account Settings
            </h1>
            <p className="mt-1 text-muted">Manage your profile and password.</p>
          </div>

          <Card.Root>
            <Card.Header withDivider>
              <Card.Title as="h3">Profile</Card.Title>
            </Card.Header>
            <Card.Body>
              <form
                onSubmit={handleNameSubmit(onNameSubmit)}
                className="flex flex-col gap-4"
                noValidate
              >
                {nameSuccess && (
                  <Alert
                    variant="tonal"
                    color="success"
                    title="Success"
                    message={nameSuccess}
                  />
                )}
                {nameError && (
                  <Alert
                    variant="tonal"
                    color="error"
                    title="Error"
                    message={nameError}
                  />
                )}
                <Field.Root required invalid={!!nameErrors.name}>
                  <Field.Label>Name</Field.Label>
                  <Input {...registerName('name')} />
                  {nameErrors.name && (
                    <p className="text-body-sm text-error">
                      {nameErrors.name.message}
                    </p>
                  )}
                </Field.Root>
                {/* Display-only — email changes are disabled for admin accounts,
                so this is a plain read-only field with no submit affordance */}
                <Field.Root disabled>
                  <Field.Label>Email</Field.Label>
                  <Input value={session?.user?.email ?? ''} disabled readOnly />
                </Field.Root>
                <div className="flex justify-end">
                  <Button
                    type="submit"
                    variant="filled"
                    color="primary"
                    isLoading={isNameSubmitting}
                  >
                    Save
                  </Button>
                </div>
              </form>
            </Card.Body>
          </Card.Root>

          <Card.Root>
            <Card.Header withDivider>
              <Card.Title as="h3">Password</Card.Title>
            </Card.Header>
            <Card.Body>
              <form
                onSubmit={handlePasswordSubmit(onPasswordSubmit)}
                className="flex flex-col gap-4"
                noValidate
              >
                {passwordSuccess && (
                  <Alert
                    variant="tonal"
                    color="success"
                    title="Success"
                    message={passwordSuccess}
                  />
                )}
                {passwordError && (
                  <Alert
                    variant="tonal"
                    color="error"
                    title="Error"
                    message={passwordError}
                  />
                )}
                <Field.Root required invalid={!!passwordErrors.currentPassword}>
                  <Field.Label>Current password</Field.Label>
                  <PasswordInput {...registerPassword('currentPassword')} />
                  {passwordErrors.currentPassword && (
                    <p className="text-body-sm text-error">
                      {passwordErrors.currentPassword.message}
                    </p>
                  )}
                </Field.Root>
                <Field.Root required invalid={!!passwordErrors.newPassword}>
                  <Field.Label>New password</Field.Label>
                  <PasswordInput {...registerPassword('newPassword')} />
                  {passwordErrors.newPassword && (
                    <p className="text-body-sm text-error">
                      {passwordErrors.newPassword.message}
                    </p>
                  )}
                </Field.Root>
                <Field.Root required invalid={!!passwordErrors.confirmPassword}>
                  <Field.Label>Confirm new password</Field.Label>
                  <PasswordInput {...registerPassword('confirmPassword')} />
                  {passwordErrors.confirmPassword && (
                    <p className="text-body-sm text-error">
                      {passwordErrors.confirmPassword.message}
                    </p>
                  )}
                </Field.Root>
                <div className="flex justify-end">
                  <Button
                    type="submit"
                    variant="filled"
                    color="primary"
                    isLoading={isPasswordSubmitting}
                  >
                    Update Password
                  </Button>
                </div>
              </form>
            </Card.Body>
          </Card.Root>

          <Card.Root>
            <Card.Header withDivider>
              <Card.Title as="h3">Session</Card.Title>
            </Card.Header>
            <Card.Body>
              {/* Stacks vertically on phones (description above button, full
                width) and switches to a horizontal row from sm (tablet) up —
                the previous fixed row crowded the description against the
                outline button under narrow widths. */}
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-body-sm text-on-surface-variant">
                  Sign out of your admin session on this device.
                </p>
                <Button
                  variant="outline"
                  color="error"
                  leftIcon={<LogOut className="h-4 w-4" />}
                  onClick={handleLogout}
                  isLoading={isLoggingOut}
                >
                  Log out
                </Button>
              </div>
            </Card.Body>
          </Card.Root>
        </div>
      </div>
    </>
  )
}
