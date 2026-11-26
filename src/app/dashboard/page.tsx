import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase/server'

// Vervang dit pad door jouw eigen fitnessfoto in /public/images/...
const HERO_FITNESS_IMAGE = '/images/hero-fitness.jpg'

type TodaySession = {
  id: string
  scheduled_date: string
  status: string
}

function getLocalTodayStr(): string {
  const now = new Date()
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Amsterdam',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)

  const year = parts.find((p) => p.type === 'year')?.value ?? '1970'
  const month = parts.find((p) => p.type === 'month')?.value ?? '01'
  const day = parts.find((p) => p.type === 'day')?.value ?? '01'

  return `${year}-${month}-${day}`
}

export default async function DashboardHomePage() {
  const supabase = await createServerSupabase()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const todayStr = getLocalTodayStr()

  const { data: todaySession } = await supabase
    .from('training_sessions')
    .select('id, scheduled_date, status')
    .eq('scheduled_date', todayStr)
    .maybeSingle()

  const hasTodaySession = Boolean((todaySession as TodaySession | null)?.id)

  const tiles = [
    {
      label: 'TRAINING VANDAAG',
      href: hasTodaySession ? `/dashboard/training?date=${todayStr}` : null,
    },
    { label: 'WEEKPLANNING', href: '/dashboard/week' },
    { label: 'WORKOUT HISTORIE', href: '/dashboard/workout-historie' },
    { label: 'TRAINING HISTORIE', href: '/dashboard/historie' },
    { label: 'BIBLIOTHEEK', href: '/dashboard/bibliotheek' },
  ]

  return (
    <div className="min-h-screen bg-zinc-950 pb-24 text-white">
      <div className="mx-auto max-w-2xl">
        {/* Blok strak tegen boven- en zijkanten met fitnessfoto + titel eroverheen */}
        <header className="relative h-48 w-full overflow-hidden bg-zinc-900 sm:h-56">
          <img
            src={HERO_FITNESS_IMAGE}
            alt="Bo-fitness App"
            className="h-full w-full object-cover object-center"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/55 to-zinc-950/25"
          />
          <div className="relative z-10 flex h-full flex-col justify-end px-4 pb-4 sm:px-6">
            <h1 className="text-3xl font-black tracking-tight text-white drop-shadow sm:text-4xl">
              Bo-fitness App
            </h1>
          </div>
        </header>

        <nav
          aria-label="Dashboard menu"
          className="space-y-3.5 px-4 pt-4 sm:px-6"
        >
          {tiles.map((tile) =>
            tile.href ? (
              <Link
                key={tile.label}
                href={tile.href}
                className="flex min-h-20 w-full items-center rounded-3xl border border-zinc-800 bg-zinc-900 px-6 py-5 text-xl font-black tracking-wide text-white transition-colors hover:border-emerald-400 hover:bg-zinc-800/90 active:scale-[0.99] sm:text-2xl"
              >
                <span>{tile.label}</span>
              </Link>
            ) : (
              <div
                key={tile.label}
                aria-disabled="true"
                className="flex min-h-20 w-full items-center rounded-3xl border border-zinc-800 bg-zinc-900 px-6 py-5 text-xl font-black tracking-wide text-white sm:text-2xl"
              >
                <span>{tile.label}</span>
              </div>
            )
          )}
        </nav>
      </div>
    </div>
  )
}