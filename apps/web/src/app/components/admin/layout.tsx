import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Navbar from '@/app/components/admin/Navbar'
import Sidebar from '@/app/components/admin/Sidebar'

/**
 * Admin Dashboard Shell — /admin/dashboard/*
 *
 * Next.js App Router layout.tsx replaces the reference pattern's
 * top-level <Sidebar>/<Navbar> wrapper component (which react-router
 * apps mount once around their router). Scoped to app/admin/dashboard
 * rather than app/admin so the login page at /admin keeps its own
 * centered, chrome-free layout.
 *
 * min-w-0 on both the content column and <main> mirrors the reference
 * DashboardLayout: flex children default to min-width: auto, which
 * blocks horizontal overflow-x scrolling in wide descendants (tables,
 * wide cards) unless explicitly overridden here.
 */
export default function AdminDashboardLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      {/* min-h-0 overrides this flex item's default min-height: auto —
          without it, tall page content (e.g. the dashboard's stat grid +
          activity list) grows this column past h-screen, which forces the
          parent row to shrink its children (Navbar) instead of letting
          this column scroll internally via overflow-y-auto */}
      <div className="flex min-w-0 min-h-0 flex-1 flex-col overflow-y-auto">
        <Navbar onMenuClick={() => setIsSidebarOpen(true)} />
        {/* main is intentionally NOT display:flex. The inner div
            is the single shared content slot: mx-auto/min-w-0 live here
            once so page-views (dashboard-view.tsx etc.) never repeat
            them; mx-auto is a no-op today with no max-w-* set, kept as
            a ready hook if a centered reading-width column is wanted. */}
        <main className="min-w-0 flex-1 p-4 lg:p-6">
          <div className="mx-auto min-w-0">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
