import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Menu, LogOut, ChevronDown } from 'lucide-react'
import {
  useSession,
  signOut,
} from '@/infra/modules/auth/lib/admin-auth-client.lib'
import IconButton from '@/app/components/ui/buttons/IconButton'
import { cn } from '@/infra/core/utils/cn.util'
import { ROUTES } from '@/app/routes/routes.constants'

interface NavbarProps {
  onMenuClick: () => void
}

/**
 * Route-to-title map — covers every route in routes.constants.ts
 * (Dashboard, Income, Expenses, Account Settings) so
 * Navbar's heading always resolves to a real page name instead of
 * falling back to the generic 'Admin' label in getPageTitle below.
 */
const routeTitles: Record<string, string> = {
  [ROUTES.ADMIN.DASHBOARD]: 'Dashboard',
  [ROUTES.ADMIN.INCOME]: 'Income',
  [ROUTES.ADMIN.EXPENSES]: 'Expenses',
  [ROUTES.ADMIN.ACCOUNT_SETTINGS]: 'Account Settings',
}

function getPageTitle(pathname: string): string {
  if (routeTitles[pathname]) return routeTitles[pathname]
  const matchingRoute = Object.keys(routeTitles)
    .sort((a, b) => b.length - a.length)
    .find((route) => pathname.startsWith(route))
  return matchingRoute ? routeTitles[matchingRoute] : 'Admin'
}

/**
 * Navbar — Admin Portal
 *
 * Vite + React Router conversion: next/navigation's usePathname/
 * useRouter are replaced with react-router-dom's useLocation/
 * useNavigate — this app has no Next.js runtime, so those hooks
 * would throw. Better Auth's useSession/signOut and this design
 * system's IconButton/token classes are unchanged from the source.
 */
export default function Navbar({ onMenuClick }: NavbarProps) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const pageTitle = getPageTitle(pathname)

  // useSession returns { data, isPending, error, refetch } per Better
  // Auth's React client — NOT a flat { user } shape, so display values
  // below read session?.user rather than a top-level user field
  const { data: session } = useSession()

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target as Node)
      ) {
        setIsUserMenuOpen(false)
      }
    }
    if (isUserMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isUserMenuOpen])

  useEffect(() => {
    function handleEscKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsUserMenuOpen(false)
    }
    if (isUserMenuOpen) {
      document.addEventListener('keydown', handleEscKey)
      return () => document.removeEventListener('keydown', handleEscKey)
    }
  }, [isUserMenuOpen])

  function toggleUserMenu() {
    setIsUserMenuOpen((prev) => !prev)
  }

  /**
   * signOut is a standalone client function (not part of useSession's
   * return value) — Better Auth's React client exposes auth actions
   * and reactive hooks as separate exports, unlike the reference
   * UserAuthContext which bundled logout into the same hook as user data
   */
  async function handleLogout() {
    setIsUserMenuOpen(false)
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

  const displayName = session?.user?.name || 'Admin'
  const displayEmail = session?.user?.email || ''

  return (
    // shrink-0 is required alongside h-16: flex-shrink defaults to 1 on
    // flex children, so without it this header still compresses below
    // 64px whenever sibling <main> content is tall enough to overflow
    // the parent's h-screen bound — exactly the collapsed-navbar bug on
    // tall pages (dashboard) that never appears on short pages (customer list)
    <header className="sticky top-0 z-sticky flex h-16 shrink-0 items-center justify-between bg-surface px-4 lg:px-6 border-b border-outline-variant">
      <div className="flex items-center gap-4">
        <IconButton
          icon={<Menu />}
          variant="text"
          size="sm"
          className="lg:hidden"
          onClick={onMenuClick}
          aria-label="Toggle sidebar"
        />
        <h1 className="hidden text-title-lg text-on-surface sm:block">
          {pageTitle}
        </h1>
      </div>

      <div className="relative" ref={userMenuRef}>
        <button
          onClick={toggleUserMenu}
          disabled={isLoggingOut}
          className={cn(
            'flex items-center gap-2 rounded-lg px-3 py-2 transition-colors',
            'hover:bg-on-surface/[var(--state-hover-opacity)] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
            'disabled:cursor-not-allowed disabled:opacity-state-disabled',
            isUserMenuOpen && 'bg-on-surface/[var(--state-hover-opacity)]',
          )}
          aria-expanded={isUserMenuOpen}
          aria-haspopup="true"
          aria-label="User menu"
        >
          <span className="max-w-[120px] truncate text-label-lg font-medium text-on-surface">
            {isLoggingOut ? 'Signing out...' : displayName}
          </span>
          <ChevronDown
            className={cn(
              'h-4 w-4 shrink-0 text-on-surface-variant transition-transform duration-fast',
              isUserMenuOpen && 'rotate-180',
            )}
          />
        </button>

        {isUserMenuOpen && !isLoggingOut && (
          <div
            className="absolute right-0 z-dropdown mt-2 w-64 rounded-lg border-2 border-outline-variant shadow-sm bg-surface"
            role="menu"
            aria-orientation="vertical"
          >
            <div className="border-b border-outline-variant px-4 py-3">
              <p className="truncate text-label-lg font-semibold text-on-surface">
                {displayName}
              </p>
              {displayEmail && (
                <p className="mt-0.5 truncate text-body-sm text-on-surface-variant">
                  {displayEmail}
                </p>
              )}
            </div>
            <div className="py-2">
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-body-sm text-on-surface transition-colors hover:bg-on-surface/[var(--state-hover-opacity)]"
                role="menuitem"
              >
                <LogOut className="h-4 w-4 shrink-0" />
                <span>Log out</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
