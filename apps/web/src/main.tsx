import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { HelmetProvider } from '@dr.pogodin/react-helmet'
import { ToastProvider } from '@/app/contexts/ToastContext'
import { ErrorBoundary } from 'react-error-boundary'
import GlobalErrorFallback from '@/app/components/errors/GlobalErrorFallback'
import '@/app/styles/app.css'
import App from '@/app/App'

// Singleton created once at module scope (not inside a component) so the
// cache survives re-renders. items.queries.ts/items.mutations.ts and
// customer.queries.ts/customer.mutations.ts call useQuery/useMutation —
// those hooks throw "No QueryClient set" without this provider ancestor.
const queryClient = new QueryClient()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary FallbackComponent={GlobalErrorFallback}>
      <QueryClientProvider client={queryClient}>
        <HelmetProvider>
          <ToastProvider position="top-right" maxToasts={5}>
            <App />
          </ToastProvider>
        </HelmetProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
)
