'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const navItems = [
  { href: '/dashboard/volgende', label: 'volgende' },
  { href: '/dashboard/plannen', label: 'plannen' },
  { href: '/dashboard/week', label: 'week' },
  { href: '/dashboard', label: 'statistieken' },
]

export function DashboardNav({ userEmail }: { userEmail?: string | null }) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="sticky top-0 z-30 border-b border-zinc-800 bg-zinc-900/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-6">
          <Link
            href="/dashboard/volgende"
            className="flex items-center gap-2 text-base font-extrabold tracking-tight text-white"
          >
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-400" />
            <span>BO-FITNESS</span>
          </Link>

          <nav className="flex flex-wrap items-center gap-1 sm:gap-1.5">
            {navItems.map((item) => {
              const isActive =
                item.href === '/dashboard'
                  ? pathname === '/dashboard'
                  : pathname?.startsWith(item.href)

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors sm:text-sm ${
                    isActive
                      ? 'bg-emerald-500 text-zinc-950'
                      : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                  }`}
                >
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {userEmail && (
            <span className="hidden text-xs text-zinc-400 md:inline">
              {userEmail}
            </span>
          )}
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-200 transition-colors hover:border-zinc-600 hover:bg-zinc-700 hover:text-white"
          >
            uitloggen
          </button>
        </div>
      </div>
    </header>
  )
}