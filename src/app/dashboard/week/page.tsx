import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase/server'

const DAY_NAMES = [
  'MAANDAG',
  'DINSDAG',
  'WOENSDAG',
  'DONDERDAG',
  'VRIJDAG',
  'ZATERDAG',
  'ZONDAG',
]

type SessionRow = {
  id: string
  scheduled_date: string
  status: string | null
  session_workouts: {
    id: string
    is_completed: boolean | null
  }[] | null
}

function getIsoWeekNumber(date: Date): number {
  const d = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  )
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

function getDayStatusLabel(
  sessionsForDay: SessionRow[]
): 'GEPLAND' | 'AFGEROND' | null {
  if (sessionsForDay.length === 0) return null

  const hasCompleted = sessionsForDay.some(
    (s) =>
      s.status === 'completed' ||
      s.status === 'afgerond' ||
      (s.session_workouts &&
        s.session_workouts.length > 0 &&
        s.session_workouts.every((w) => Boolean(w.is_completed)))
  )

  if (hasCompleted) return 'AFGEROND'
  return 'GEPLAND'
}

export default async function WeekPage({
  searchParams,
}: {
  searchParams: Promise<{ offset?: string }>
}) {
  const supabase = await createServerSupabase()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const resolvedParams = await searchParams
  const parsedOffset = Number(resolvedParams?.offset ?? '0')
  const weekOffset = Number.isFinite(parsedOffset)
    ? Math.trunc(parsedOffset)
    : 0

  const now = new Date()
  const dayOfWeek = now.getUTCDay()
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek

  const monday = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + diffToMonday + weekOffset * 7
    )
  )

  const weekNumber = getIsoWeekNumber(monday)

  const days = Array.from({ length: 7 }, (_, idx) => {
    const dt = new Date(
      Date.UTC(
        monday.getUTCFullYear(),
        monday.getUTCMonth(),
        monday.getUTCDate() + idx
      )
    )
    return {
      dateStr: dt.toISOString().slice(0, 10),
      dayName: DAY_NAMES[idx],
      dayNumber: `${dt.getUTCDate()}/${dt.getUTCMonth() + 1}`,
    }
  })

  const startStr = days[0].dateStr
  const endStr = days[6].dateStr

  const { data: sessions } = await supabase
    .from('training_sessions')
    .select(
      `
      id,
      scheduled_date,
      status,
      session_workouts (
        id,
        is_completed
      )
    `
    )
    .gte('scheduled_date', startStr)
    .lte('scheduled_date', endStr)
    .order('scheduled_date', { ascending: true })

  const sessionList = (sessions ?? []) as unknown as SessionRow[]

  return (
    <div className="min-h-screen bg-zinc-950 pb-24 text-white">
      <div className="mx-auto max-w-2xl space-y-4 px-4 pt-5 sm:px-6">
        <header className="space-y-3">
          <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
            WEEKPLANNING
          </h1>

          <div className="flex items-center justify-between rounded-3xl border border-zinc-800 bg-zinc-900 px-4 py-3">
            <Link
              href={`/dashboard/week?offset=${weekOffset - 1}`}
              aria-label="Vorige week"
              className="flex h-12 w-14 items-center justify-center rounded-2xl border border-zinc-700 bg-zinc-800 text-2xl font-black text-white transition-colors hover:border-emerald-400 hover:bg-zinc-700"
            >
              &lt;
            </Link>

            <span className="text-lg font-extrabold tracking-wide text-white">
              WEEK {weekNumber}
            </span>

            <Link
              href={`/dashboard/week?offset=${weekOffset + 1}`} aria-label="Volgende week" className="flex h-12 w-14 items-center justify-center rounded-2xl border border-zinc-700 bg-zinc-800 text-2xl font-black text-white transition-colors hover:border-emerald-400 hover:bg-zinc-700" > &gt; </Link> </div> </header>  <nav aria-label="Dagen van de week" className="space-y-3.5"> {days.map((day) => { const daySessions = sessionList.filter( (s) => s.scheduled_date === day.dateStr ) const statusLabel = getDayStatusLabel(daySessions)  return ( <Link key={day.dateStr} href={`/dashboard/training?date=${day.dateStr}`}
                className="flex min-h-20 w-full flex-col justify-center rounded-3xl border border-zinc-800 bg-zinc-900 px-6 py-4 text-white transition-colors hover:border-emerald-400 hover:bg-zinc-800/90 active:scale-[0.99]"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-xl font-black tracking-wide text-white sm:text-2xl">
                    {day.dayName}
                  </span>
                  <span className="text-sm font-bold text-zinc-400">
                    {day.dayNumber}
                  </span>
                </div>

                {statusLabel && (
                  <span
                    className={`mt-1 text-sm font-extrabold tracking-wider ${ statusLabel === 'AFGEROND' ? 'text-emerald-400' : 'text-amber-300' }`} > {statusLabel} </span> )} </Link> ) })} </nav> </div> </div> ) } ```  ---  ### 2. `src/app/dashboard/training/page.tsx`  Maak de map `src/app/dashboard/training` aan met daarin `page.tsx`:  ```tsx import Link from 'next/link' import { redirect } from 'next/navigation' import { createServerSupabase } from '@/lib/supabase/server'  const DUTCH_WEEKDAYS = [ 'ZONDAG', 'MAANDAG', 'DINSDAG', 'WOENSDAG', 'DONDERDAG', 'VRIJDAG', 'ZATERDAG', ]  type SessionWorkoutRow = { id: string sort_order: number \vert{} null is_completed: boolean \vert{} null workouts: { id: string name: string muscle_groups: { name: string } \vert{} null } \vert{} null }  type TrainingSessionRow = { id: string scheduled_date: string status: string \vert{} null session_workouts: SessionWorkoutRow[] \vert{} null }  function formatDayHeader(dateStr: string): { dayName: string; shortDate: string } { const [y, m, d] = dateStr.split('-').map(Number) if (!y \vert{}\vert{} !m \vert{}\vert{} !d) { return { dayName: 'TRAINING', shortDate: dateStr } } const dt = new Date(Date.UTC(y, m - 1, d)) return { dayName: DUTCH_WEEKDAYS[dt.getUTCDay()] ?? 'TRAINING', shortDate: `${d}/${m}/${y}`,
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
                href={`/dashboard/log/${item.sessionWorkoutId}`} className="flex min-h-20 w-full flex-col justify-center rounded-3xl border border-zinc-800 bg-zinc-900 px-6 py-4 text-white transition-colors hover:border-emerald-400 hover:bg-zinc-800/90 active:scale-[0.99]" > <span className="text-xl font-black tracking-wide text-white sm:text-2xl"> {item.workoutName} </span>  <div className="mt-1 flex items-center gap-3 text-sm font-extrabold tracking-wider"> {item.muscleGroupName && ( <span className="text-zinc-400"> {item.muscleGroupName.toUpperCase()} </span> )} {item.isCompleted && ( <span className="text-emerald-400">AFGEROND</span> )} </div> </Link> ))}  <Link href={`/dashboard/plannen?date=${dateStr}`}
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