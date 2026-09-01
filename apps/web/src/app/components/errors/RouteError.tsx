import { useEffect } from 'react'
import { isRouteErrorResponse, useRouteError } from 'react-router-dom'
import { AlertTriangle, RotateCw } from 'lucide-react'
import EmptyState from '@/app/components/ui/data-display/EmptyState'
import GoBackButton from '@/app/components/GoBackButton'
import NotFoundPage from '@/app/components/errors/NotFoundPage'

/**
 * errorElement for each top-level branch in router.tsx — catches render/
 * loader/action errors thrown anywhere in that branch's subtree. This is
 * the React Router data-router equivalent of Next.js's per-segment
 * error.tsx; a thrown 404 ErrorResponse (e.g. from a future loader)
 * reuses NotFoundPage instead of duplicating its markup here.
 */
export default function RouteError() {
  const error = useRouteError()

  useEffect(() => {
    // Logged client-side so a crashed route segment is visible in the
    // console (and, once wired to a provider, an error-tracking service)
    // instead of silently disappearing behind the fallback UI below
    console.error('Route segment error:', error)
  }, [error])

  if (isRouteErrorResponse(error) && error.status === 404) {
    return <NotFoundPage />
  }

  // React Router route errors aren't always Error instances (loaders/
  // actions can throw Response objects) — narrow before reading .message
  // the way error.message was read directly in the Next.js version
  const message = isRouteErrorResponse(error)
    ? error.statusText
    : error instanceof Error
      ? error.message
      : undefined

  // React Router has no per-segment reset() like Next's error.tsx —
  // a full reload is the closest equivalent that reliably clears
  // whatever loader/render state caused the crash
  const reset = () => window.location.reload()

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-md">
        <EmptyState
          icon={AlertTriangle}
          title="Something went wrong"
          description={
            message || 'An unexpected error occurred while loading this page.'
          }
          action={{
            label: 'Try again',
            onClick: reset,
            icon: <RotateCw className="h-4 w-4" />,
          }}
        />
        <div className="mt-4 flex justify-center">
          <GoBackButton />
        </div>
      </div>
    </div>
  )
}
