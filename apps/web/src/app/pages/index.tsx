import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Helmet } from '@dr.pogodin/react-helmet'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { signIn } from '@/infra/modules/auth/lib/admin-auth-client.lib'
import {
  loginSchema,
  type LoginFormValues,
} from '@/infra/modules/auth/auth.schema'
import Button from '@/app/components/ui/buttons/Button'
import Input from '@/app/components/ui/forms/Input'
import PasswordInput from '@/app/components/ui/forms/PasswordInput'
import Checkbox from '@/app/components/ui/forms/Checkbox'
import { Field } from '@/app/components/ui/forms/Field'
import Alert from '@/app/components/ui/feedback/Alert'
import { ROUTES } from '@/app/routes/routes.constants'
import { BrandLogo, BrandName } from '@/app/components/brand/Brand'
import Card from '@/app/components/ui/data-display/Card'
import { env } from '@/infra/core/config/env.config'
import { DEMO_ADMIN_CREDENTIALS } from '@/infra/modules/auth/demo/demo-auth.lib'

/**
 * Login page — Vite conversion of the former Next.js Client Component.
 * Reuses loginSchema from the customer login (same email/password shape).
 * Admin/customer role differentiation still only happens server-side —
 * this file changes navigation/import/copy only, not the auth boundary.
 *
 * min-h-screen on the root wrapper (rather than relying on an inherited
 * flex-1 from AdminAuthLayout/Outlet) guarantees the card centers
 * vertically in the viewport regardless of ancestor height. Brand row
 * and header text are centered per design request; copy is deliberately
 * generic ("Login" / "Welcome back") since this page also serves as the
 * only entry point a first-time admin sees — "Admin Login" reads as
 * internal/technical jargon that isn't necessary here.
 */
export default function AdminLoginPage() {
  const navigate = useNavigate()
  const [serverError, setServerError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      rememberMe: true,
      // Demo mode never talks to a real backend — pre-filling here saves
      // a copy/paste round trip through the note box below on every visit.
      ...(env.isDemoMode && {
        email: DEMO_ADMIN_CREDENTIALS.email,
        password: DEMO_ADMIN_CREDENTIALS.password,
      }),
    },
  })

  async function onSubmit(values: LoginFormValues) {
    setServerError(null)
    const { error: signInError } = await signIn.email(values)

    if (signInError) {
      setServerError(signInError.message ?? 'Invalid email or password')
      return
    }

    navigate(ROUTES.ADMIN.DASHBOARD)
  }

  return (
    <>
      <Helmet>
        <title>Login | SimpleCash</title>
        <meta
          name="description"
          content="Sign in to your SimpleCash account."
        />
      </Helmet>
      {/* min-h-screen guarantees vertical centering of the card even if a
          future layout change removes the ancestor flex-1 chain — the
          previous version depended entirely on inherited height. */}
      <div className="flex min-h-screen flex-1 flex-col items-center justify-center px-4 py-12 sm:px-6 sm:py-16">
        {/* shadowElevation=2 + surfaceLevel="low" gives the card visible
            separation from the page background (already surface-container-low
            per base.css) without relying on a border, matching the elevated
            variant used elsewhere in the admin shell (e.g. dashboard cards). */}
        <Card.Root
          as="section"
          padding="lg"
          className="w-full max-w-sm shadow-sm"
        >
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
            noValidate
          >
            <Card.Header withDivider>
              <div className="flex w-full flex-col gap-4">
                {/* justify-center (in addition to items-center) centers the
                    logo+name row horizontally within the card, not just
                    vertically within its own row height. */}
                <div className="flex items-center justify-center gap-3 pb-4">
                  <BrandLogo size="md" />
                  <BrandName className="whitespace-nowrap text-title-lg font-semibold text-on-surface" />
                </div>

                {/* text-center applies to both Title and Description since
                    they share this wrapper — avoids repeating the class on
                    each child. */}
                <div className="flex flex-col gap-1 text-center">
                  <Card.Title as="h1">Welcome Back</Card.Title>
                  <Card.Description>
                    Sign in to your account to continue
                  </Card.Description>
                </div>
              </div>
            </Card.Header>

            <Card.Body className="flex flex-col gap-4">
              {serverError && (
                <Alert
                  variant="tonal"
                  color="error"
                  title="Error"
                  message={serverError}
                />
              )}

              {/* Demo mode note — Alert renders title/message only (no
                  children), so credentials get their own tonal block
                  right below rather than being crammed into one message
                  string. Both are gated on env.isDemoMode so none of this
                  renders (or ships meaningfully) in a real deployment. */}
              {env.isDemoMode && (
                <>
                  <Alert
                    variant="tonal"
                    color="info"
                    title="Demo Mode"
                    message="This is a demo. Data is stored on your device only nothing is sent to or processed by a server."
                  />
                  <div className="rounded-lg border border-info/20 bg-info-container/40 px-4 py-3 text-body-sm text-on-info-container">
                    <p className="font-semibold">Demo credentials</p>
                    <p className="mt-1">
                      Email:{' '}
                      <span className="font-mono">
                        {DEMO_ADMIN_CREDENTIALS.email}
                      </span>
                    </p>
                    <p>
                      Password:{' '}
                      <span className="font-mono">
                        {DEMO_ADMIN_CREDENTIALS.password}
                      </span>
                    </p>
                  </div>
                </>
              )}

              <Field.Root required>
                <Field.Label>Email</Field.Label>
                <Input
                  type="email"
                  placeholder="Your email"
                  {...register('email')}
                />
                {errors.email && (
                  <p className="text-body-sm text-error">
                    {errors.email.message}
                  </p>
                )}
              </Field.Root>

              <Field.Root required>
                <Field.Label>Password</Field.Label>
                <PasswordInput
                  placeholder="Your password"
                  {...register('password')}
                />
                {errors.password && (
                  <p className="text-body-sm text-error">
                    {errors.password.message}
                  </p>
                )}
              </Field.Root>

              <Controller
                name="rememberMe"
                control={control}
                render={({ field }) => (
                  <Checkbox
                    checked={field.value ?? true}
                    onChange={field.onChange}
                    label="Remember me"
                  />
                )}
              />
            </Card.Body>

            <Card.Footer align="left" className="mt-0">
              <Button
                type="submit"
                variant="filled"
                color="primary"
                isLoading={isSubmitting}
                fullWidth
              >
                Log In
              </Button>
            </Card.Footer>
          </form>
        </Card.Root>
      </div>
    </>
  )
}
