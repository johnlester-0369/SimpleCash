import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  LogOut,
  ChevronRight,
  User,
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

/**
 * NavItem is a discriminated union on `children`: a leaf item (no children)
 * must carry its own path/icon for the Link it renders; a group item is
 * a clickable label above its children and carries neither — this is what
 * lets `Settings` below drop `icon`/`path` without losing type safety on
 * the leaf-item Link `to`/icon usage further down.
 */
interface NavLeafItem {
  label: string
  path: string
  icon: React.ReactNode
  children?: undefined
}

interface NavGroupItem {
  label: string
  children: NavChildItem[]
}

type NavItem = NavLeafItem | NavGroupItem

/**
 * Extend this array (with `children` where needed) as more admin routes
 * ship. Group entries intentionally omit `icon`/`path` — they render as
 * a section label, not a route.
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
    // Group header only — not a route, so no icon/path here. Rendered as
    // a clickable muted/semibold label that toggles its children.
    label: 'Settings',
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
 */
export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  // Track which group labels are expanded. Groups start expanded by
  // default so their children are visible on first load.
  const [expandedItems, setExpandedItems] = useState<string[]>(() =>
    navItems.filter((item) => item.children?.length).map((item) => item.label),
  )

  function toggleExpand(label: string) {
    setExpandedItems((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label],
    )
  }

  function isExpanded(label: string) {
    return expandedItems.includes(label)
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
    // Type narrowing fixes TS2339: isolate NavGroupItem strictly before leaf logic
    if (item.children) {
      if (item.children.length === 0) return null
      const expanded = isExpanded(item.label)

      return (
        <li key={item.label}>
          {/* Clickable section label — muted + semibold, toggles its
              children. Chevron rotates 90deg (right → down) rather than
              swapping icons, so the direction reads as a natural
              disclosure affordance instead of an unrelated glyph swap. */}
          <button
            onClick={() => toggleExpand(item.label)}
            className="flex w-full cursor-pointer items-center justify-between rounded-lg px-3 pt-3 pb-1 text-label-lg font-semibold text-on-surface-variant transition-colors"
            aria-expanded={expanded}
            aria-controls={`submenu-${item.label.toLowerCase()}`}
          >
            <span>{item.label}</span>
            <ChevronRight
              className={cn(
                'h-4 w-4 shrink-0 transition-transform duration-200',
                expanded && 'rotate-90',
              )}
            />
          </button>

          <ul
            id={`submenu-${item.label.toLowerCase()}`}
            className={cn(
              'mt-1 space-y-1 overflow-hidden transition-all duration-200',
              expanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0',
            )}
          >
            {item.children.map((child) => {
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
