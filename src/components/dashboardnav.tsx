'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { ArrowLeft, Home } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export function DashboardNav({ userEmail }: { userEmail?: string | null }) {
  const pathname = usePathname()
  const router = useRouter()
  const [loggingOut, setLoggingOut] = useState(false)

  const isHomeActive = pathname === '/dashboard'
  const isStatsActive = pathname?.startsWith('/dashboard/statistieken')

  async function handleLogout() {
    if (loggingOut) return
    setLoggingOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <nav
      aria-label="Hoofdnavigatie"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-zinc-800 bg-zinc-900/95 backdrop-blur-md"
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-1.5 px-3 sm:px-6">
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <Link
            href="/dashboard"
            title={userEmail ? `Home (${userEmail})` : 'Home'}
            className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors ${
              isHomeActive
                ? 'border-emerald-400 bg-emerald-500 text-zinc-950'
                : 'border-zinc-700 bg-zinc-800 text-zinc-200 hover:border-zinc-600 hover:bg-zinc-700 hover:text-white'
            }`}
          >
            <Home className="h-3.5 w-3.5 shrink-0" />
            <span>home</span>
          </Link>

          <Link
            href="/dashboard/statistieken"
            className={`shrink-0 whitespace-nowrap rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors ${
              isStatsActive
                ? 'border-emerald-400 bg-emerald-500 text-zinc-950'
                : 'border-zinc-700 bg-zinc-800 text-zinc-200 hover:border-zinc-600 hover:bg-zinc-700 hover:text-white'
            }`}
          >
            statistieken
          </Link>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          {userEmail && (
            <span className="hidden max-w-44 truncate text-xs text-zinc-400 lg:inline">
              {userEmail}
            </span>
          )}

          <button
            type="button"
            disabled={loggingOut}
            onClick={() => void handleLogout()}
            className="shrink-0 whitespace-nowrap rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-200 transition-colors hover:border-zinc-600 hover:bg-zinc-700 hover:text-white disabled:opacity-40"
          >
            {loggingOut ? 'uitloggen...' : 'uitloggen'}
          </button>

          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Ga terug"
            className="flex shrink-0 items-center gap-1 whitespace-nowrap rounded-xl border border-zinc-700 bg-zinc-800 px-2.5 py-1.5 text-xs font-semibold text-zinc-200 transition-colors hover:border-zinc-600 hover:bg-zinc-700 hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5 shrink-0" />
            <span>terug</span>
          </button>
        </div>
      </div>
    </nav>
  )
}