'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const navItems = [
  { href: '/dashboard/volgende', label: 'eerst volgende training' },
  { href: '/dashboard/plannen', label: 'training plannen' },
  { href: '/dashboard/week', label: 'weekplanner' },
  { href: '/dashboard', label: 'statistieken', exact: true },
]

export function DashboardNav({ userEmail }: { userEmail?: string }) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="border-b border-neutral-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-2 text-sm font-bold tracking-tight text-neutral-900">
            bo-fitness
          </span>

          <nav aria-label="hoofdmenu" className="flex flex-wrap items-center gap-1.5">
            {navItems.map((item) => {
              const isActive = item.exact
                ? pathname === item.href
                : pathname === item.href || pathname.startsWith(`${item.href}/`)

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-emerald-600 text-white'
                      : 'text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900'
                  }`}
                >
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </div>

        <div className="flex items-center justify-between gap-3 text-xs text-neutral-500 md:justify-end">
          {userEmail && <span className="truncate">{userEmail}</span>}
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-md border border-neutral-300 px-2.5 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
          >
            uitloggen
          </button>
        </div>
      </div>
    </header>
  )
}