import { useEffect } from 'react'
import type { FallbackProps } from 'react-error-boundary'
import { AlertOctagon, RotateCw } from 'lucide-react'
import Button from '@/app/components/ui/buttons/Button'

/**
 * FallbackComponent for the app-root <ErrorBoundary> in main.tsx. Catches
 * errors RouteError.tsx (this component's per-branch analog) cannot —
 * specifically, errors thrown by providers ABOVE the router itself
 * (ThemeProvider, QueryClientProvider, HelmetProvider, ...). No <html>/
 * <body> wrapper here, unlike the Next.js global-error.tsx original,
 * since Vite's static index.html already owns those elements.
 */
export default function GlobalErrorFallback({
  error,
  resetErrorBoundary,
}: FallbackProps) {
  useEffect(() => {
    // Only fires for errors thrown above the router — everything else is
    // already caught by RouteError.tsx's per-branch errorElement
    console.error('Root application error:', error)
  }, [error])

  const message =
    error instanceof Error
      ? error.message
      : 'A critical error occurred and the application could not recover automatically.'

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <div className="w-full max-w-md">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-error-container">
          <AlertOctagon className="h-8 w-8 text-on-error-container" />
        </div>
        <h1 className="text-title-lg font-semibold text-on-surface">
          Application error
        </h1>
        <p className="mt-2 text-body-md text-on-surface-variant">{message}</p>
        <div className="mt-6 flex justify-center">
          <Button
            variant="filled"
            color="primary"
            leftIcon={<RotateCw className="h-4 w-4" />}
            onClick={resetErrorBoundary}
          >
            Try again
          </Button>
        </div>
      </div>
    </div>
  )
}
