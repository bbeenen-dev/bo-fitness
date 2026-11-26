import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase/server'

const DUTCH_WEEKDAYS = [
  'ZONDAG',
  'MAANDAG',
  'DINSDAG',
  'WOENSDAG',
  'DONDERDAG',
  'VRIJDAG',
  'ZATERDAG',
]

type SessionWorkoutRow = {
  id: string
  sort_order: number | null
  is_completed: boolean | null
  workouts: {
    id: string
    name: string
    muscle_groups: {
      name: string
    } | null
  } | null
}

type TrainingSessionRow = {
  id: string
  scheduled_date: string
  status: string | null
  session_workouts: SessionWorkoutRow[] | null
}

function formatDayHeader(dateStr: string): { dayName: string; shortDate: string } {
  const [y, m, d] = dateStr.split('-').map(Number)
  if (!y || !m || !d) {
    return { dayName: 'TRAINING', shortDate: dateStr }
  }
  const dt = new Date(Date.UTC(y, m - 1, d))
  return {
    dayName: DUTCH_WEEKDAYS[dt.getUTCDay()] ?? 'TRAINING',
    shortDate: `${d}/${m}/${y}`,
  }
}

export default async function TrainingDayPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>
}) {
  const supabase = await createServerSupabase()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const resolvedParams = await searchParams
  const rawDate = resolvedParams?.date ?? ''
  const dateStr = /^\d{4}-\d{2}-\d{2}$/.test(rawDate)
    ? rawDate
    : new Date().toISOString().slice(0, 10)

  const { data: sessions } = await supabase
    .from('training_sessions')
    .select(
      `
      id,
      scheduled_date,
      status,
      session_workouts (
        id,
        sort_order,
        is_completed,
        workouts (
          id,
          name,
          muscle_groups ( name )
        )
      )
    `
    )
    .eq('scheduled_date', dateStr)
    .order('id', { ascending: true })

  const sessionList = (sessions ?? []) as unknown as TrainingSessionRow[]

  const workoutsForDay = sessionList.flatMap((session) =>
    [...(session.session_workouts ?? [])]
      .sort((a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999))
      .map((sw) => ({
        sessionWorkoutId: sw.id,
        workoutName: sw.workouts?.name ?? 'WORKOUT',
        muscleGroupName: sw.workouts?.muscle_groups?.name ?? null,
        isCompleted: Boolean(sw.is_completed),
      }))
  )

  const { dayName, shortDate } = formatDayHeader(dateStr)

  return (
    <div className="min-h-screen bg-zinc-950 pb-24 text-white">
      <div className="mx-auto max-w-2xl space-y-4 px-4 pt-5 sm:px-6">
        <header className="space-y-1">
          <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
            TRAINING
          </h1>
          <p className="text-sm font-extrabold tracking-wider text-zinc-400">
            {dayName} • {shortDate}
          </p>
        </header>

        {workoutsForDay.length === 0 ? (
          <div className="space-y-4">
            <div className="rounded-3xl border border-zinc-800 bg-zinc-900 px-6 py-6">
              <p className="text-xl font-black tracking-wide text-white">
                GEEN TRAINING GEPLAND
              </p>
            </div>

            <Link
              href={`/dashboard/plannen?date=${dateStr}`}
              className="flex min-h-20 w-full items-center rounded-3xl border border-emerald-500/40 bg-zinc-900 px-6 py-5 text-xl font-black tracking-wide text-white transition-colors hover:border-emerald-400 hover:bg-zinc-800/90 active:scale-[0.99] sm:text-2xl"
            >
              <span>TRAINING PLANNEN</span>
            </Link>
          </div>
        ) : (
          <nav aria-label="Workouts van deze dag" className="space-y-3.5">
            {workoutsForDay.map((item) => (
              <Link
                key={item.sessionWorkoutId}
                href={`/dashboard/log/${item.sessionWorkoutId}`}
                className="flex min-h-20 w-full flex-col justify-center rounded-3xl border border-zinc-800 bg-zinc-900 px-6 py-4 text-white transition-colors hover:border-emerald-400 hover:bg-zinc-800/90 active:scale-[0.99]"
              >
                <span className="text-xl font-black tracking-wide text-white sm:text-2xl">
                  {item.workoutName}
                </span>

                <div className="mt-1 flex items-center gap-3 text-sm font-extrabold tracking-wider">
                  {item.muscleGroupName && (
                    <span className="text-zinc-400">
                      {item.muscleGroupName.toUpperCase()}
                    </span>
                  )}
                  {item.isCompleted && (
                    <span className="text-emerald-400">AFGEROND</span>
                  )}
                </div>
              </Link>
            ))}

            <Link
              href={`/dashboard/plannen?date=${dateStr}`}
              className="flex min-h-20 w-full items-center rounded-3xl border border-zinc-800 bg-zinc-900/70 px-6 py-5 text-lg font-black tracking-wide text-zinc-200 transition-colors hover:border-emerald-400 hover:bg-zinc-800/90 active:scale-[0.99]"
            >
              <span>+ WORKOUT TOEVOEGEN</span>
            </Link>
          </nav>
        )}
      </div>
    </div>
  )
}