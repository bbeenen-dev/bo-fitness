import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase/server'
import { NextSessionList, SessionWorkoutItem } from '@/components/nextsessionlist'

export default async function VolgendeTrainingPage() {
  const supabase = await createServerSupabase()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: session } = await supabase
    .from('training_sessions')
    .select(
      `
      id,
      scheduled_date,
      status,
      total_duration_min,
      session_workouts (
        id,
        sort_order,
        is_completed,
        started_at,
        ended_at,
        perceived_effort,
        workouts (
          id,
          name,
          estimated_duration_min,
          muscle_groups ( name )
        )
      )
    `
    )
    .eq('status', 'planned')
    .order('scheduled_date', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (!session) {
    return (
      <div className="space-y-6 p-4 sm:p-6">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400">
            volgende sessie
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-white">
            eerst volgende training
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            er staat op dit moment nog geen training gepland.
          </p>

          <Link
            href="/dashboard/plannen"
            className="mt-5 inline-flex items-center justify-center rounded-xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-zinc-950 transition-colors hover:bg-emerald-400"
          >
            training plannen
          </Link>
        </div>
      </div>
    )
  }

  const rawItems = (session.session_workouts ?? []) as unknown as SessionWorkoutItem[]
  const sortedItems = [...rawItems].sort((a, b) => a.sort_order - b.sort_order)

  const completedCount = sortedItems.filter((item) => item.is_completed).length
  const estimatedTotal = sortedItems.reduce(
    (sum, item) => sum + (item.workouts?.estimated_duration_min ?? 0),
    0
  )
  const progressPct =
    sortedItems.length > 0 ? Math.round((completedCount / sortedItems.length) * 100) : 0

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Sessie-header in Gymverse-stijl */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400">
              actieve planning
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-white">
              eerst volgende training
            </h1>
            <p className="mt-1 text-sm text-zinc-400">
              gepland op{' '}
              <span className="font-semibold text-zinc-200 tabular-nums">
                {session.scheduled_date}
              </span>{' '}
              · geschat{' '}
              <span className="font-semibold text-zinc-200 tabular-nums">
                {estimatedTotal} min
              </span>
            </p>
          </div>

          <Link
            href="/dashboard/week"
            className="rounded-xl border border-zinc-700 bg-zinc-800/80 px-4 py-2.5 text-xs font-semibold text-zinc-200 transition-colors hover:border-zinc-600 hover:bg-zinc-800"
          >
            weekplanner
          </Link>
        </div>

        {/* Voortgangsbalk */}
        <div className="mt-5 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-zinc-400">
              voortgang:{' '}
              <span className="font-semibold text-white tabular-nums">
                {completedCount}/{sortedItems.length}
              </span>{' '}
              workouts klaar
            </span>
            <span className="font-semibold text-emerald-400 tabular-nums">{progressPct}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </div>

      <NextSessionList initialItems={sortedItems} />
    </div>
  )
}