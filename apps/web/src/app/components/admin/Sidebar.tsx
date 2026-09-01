import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  LogOut,
  ChevronDown,
  User,
  Settings,
  Wallet,
  Receipt,
} from 'lucide-react'
import { BrandLogo, BrandName } from '@/app/components/brand/Brand'
import CloseButton from '@/app/components/ui/buttons/CloseButton'
import { signOut } from '@/infra/modules/auth/lib/admin-auth-client.lib'
import { cn } from '@/infra/core/utils/cn.util'
import { ROUTES } from '@/app/routes/routes.constants'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

interface NavChildItem {
  label: string
  path: string
  icon: React.ReactNode
}

interface NavItem {
  label: string
  path: string
  icon: React.ReactNode
  children?: NavChildItem[]
}

/**
 * Two entries now that customer management has moved to its own
 * /admin/customer route — Dashboard shows aggregate mock stats,
 * Customers links to the dedicated customer page. Extend this array
 * (with `children` where needed) as more admin routes ship.
 */
const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    path: ROUTES.ADMIN.DASHBOARD,
    icon: <LayoutDashboard className="h-5 w-5" />,
  },
  {
    label: 'Income',
    path: ROUTES.ADMIN.INCOME,
    icon: <Wallet className="h-5 w-5" />,
  },
  {
    label: 'Expenses',
    path: ROUTES.ADMIN.EXPENSES,
    icon: <Receipt className="h-5 w-5" />,
  },
  {
    label: 'Settings',
    icon: <Settings className="h-5 w-5" />,
    path: ROUTES.ADMIN.ACCOUNT_SETTINGS,
    children: [
      {
        label: 'Account',
        icon: <User className="h-5 w-5" />,
        path: ROUTES.ADMIN.ACCOUNT_SETTINGS,
      },
    ],
  },
]

/**
 * Sidebar — Admin Portal
 *
 * Vite + React Router conversion: next/link's Link and next/navigation's
 * usePathname/useRouter are replaced with react-router-dom's Link (href
 * -> to), useLocation, and useNavigate — this app has no Next.js runtime.
 * No admin route currently has children — see navItems comment above —
 * but the expand/collapse logic from the source is kept intact so it
 * activates as soon as a NavItem defines `children`.
 */
export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  // Track which parent items are expanded.
  // Any parent that has children starts expanded (always open by default).
  const [expandedItems, setExpandedItems] = useState<string[]>(() =>
    navItems.filter((item) => item.children?.length).map((item) => item.path),
  )

  function toggleExpand(path: string) {
    setExpandedItems((prev) =>
      prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path],
    )
  }

  function isExpanded(path: string) {
    return expandedItems.includes(path)
  }

  function hasActiveChild(children: NavChildItem[] | undefined) {
    if (!children) return false
    return children.some((child) => pathname.startsWith(child.path))
  }

  async function handleLogout() {
    setIsLoggingOut(true)
    try {
      await signOut()
      onClose()
      navigate(ROUTES.ADMIN.ROOT)
    } catch (error) {
      console.error('Logout failed:', error)
      onClose()
      navigate(ROUTES.ADMIN.ROOT)
    } finally {
      setIsLoggingOut(false)
    }
  }

  function renderNavItem(item: NavItem) {
    const hasChildren = item.children && item.children.length > 0
    const isParentActive = hasActiveChild(item.children)
    const expanded = isExpanded(item.path) || isParentActive

    if (hasChildren) {
      return (
        <li key={item.path}>
          <button
            onClick={() => toggleExpand(item.path)}
            className={cn(
              'flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-label-lg font-medium transition-colors',
              isParentActive
                ? 'bg-primary/10 text-primary'
                : 'text-on-surface hover:bg-on-surface/[var(--state-hover-opacity)]',
            )}
            aria-expanded={expanded}
            aria-controls={`submenu-${item.path.replace('/', '')}`}
          >
            <span className="flex items-center gap-3">
              {item.icon}
              <span>{item.label}</span>
            </span>
            <ChevronDown
              className={cn(
                'h-4 w-4 transition-transform duration-200',
                expanded && 'rotate-180',
              )}
            />
          </button>

          <ul
            id={`submenu-${item.path.replace('/', '')}`}
            className={cn(
              'mt-1 ml-4 space-y-1 overflow-hidden border-l border-outline-variant pl-3 transition-all duration-200',
              expanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0',
            )}
          >
            {item.children?.map((child) => {
              const isChildActive = pathname.startsWith(child.path)
              return (
                <li key={child.path}>
                  <Link
                    to={child.path}
                    onClick={onClose}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-label-lg font-medium transition-colors',
                      isChildActive
                        ? 'bg-primary text-on-primary hover:bg-primary/90'
                        : 'text-on-surface hover:bg-on-surface/[var(--state-hover-opacity)]',
                    )}
                  >
                    {child.icon}
                    <span>{child.label}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </li>
      )
    }

    const isActive = pathname.startsWith(item.path)
    return (
      <li key={item.path}>
        <Link
          to={item.path}
          onClick={onClose}
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2.5 text-label-lg font-medium transition-colors',
            isActive
              ? 'bg-primary text-on-primary hover:bg-primary/90'
              : 'text-on-surface hover:bg-on-surface/[var(--state-hover-opacity)]',
          )}
        >
          {item.icon}
          <span>{item.label}</span>
        </Link>
      </li>
    )
  }

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-drawer bg-scrim/50 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          'fixed top-0 left-0 z-modal flex h-full w-64 flex-col bg-surface transition-transform duration-normal ease-standard border-r border-outline-variant',
          'lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-16 shrink-0 items-center justify-between px-4 border-b border-outline-variant">
          <div className="flex items-center gap-3">
            <BrandLogo size="md" />
            <BrandName className="whitespace-nowrap font-semibold text-xl text-headline" />
          </div>
          <CloseButton
            onClick={onClose}
            size="sm"
            variant="text"
            className="lg:hidden"
            aria-label="Close sidebar"
          />
        </div>

        <nav className="scrollbar flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-1">{navItems.map(renderNavItem)}</ul>
        </nav>

        <div className="border-t border-outline-variant p-3 shrink-0">
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className={cn(
              'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-label-lg font-medium transition-colors',
              'text-on-surface hover:bg-on-surface/[var(--state-hover-opacity)]',
              'disabled:cursor-not-allowed disabled:opacity-state-disabled',
            )}
            aria-label="Log out"
          >
            <LogOut className="h-5 w-5" />
            <span>{isLoggingOut ? 'Signing out...' : 'Log out'}</span>
          </button>
        </div>
      </aside>
    </>
  )
}
