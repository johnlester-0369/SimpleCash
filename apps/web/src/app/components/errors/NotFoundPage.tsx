import { FileQuestion } from 'lucide-react'
import EmptyState from '@/app/components/ui/data-display/EmptyState'
import GoBackButton from '@/app/components/GoBackButton'

/**
 * Rendered by the router's wildcard "*" route (router.tsx) for any path
 * that doesn't match a defined route. Distinct from RouteError.tsx, which
 * catches thrown render/loader errors on paths that DO match — React
 * Router has no single file-based "not-found.tsx" convention like Next.js,
 * React Router has no single file-based "not-found.tsx" convention like Next.js,
 * so this is wired explicitly as a catch-all route element instead.
 */
export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-md text-center">
        <EmptyState
          icon={FileQuestion}
          title="Page not found"
          description="The page you're looking for doesn't exist or may have been moved."
          className="bg-transparent"
        />
        <div className="mt-4 flex justify-center">
          <GoBackButton />
        </div>
      </div>
    </div>
  )
}
