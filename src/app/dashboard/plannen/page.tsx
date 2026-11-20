import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { createServerSupabase } from '@/lib/supabase/server'
import { PlanWorkoutClient } from '@/components/planworkoutclient'

type SearchParams = Promise<{
  date?: string
}>

function isValidDateString(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
}

export default async function PlannenPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const supabase = await createServerSupabase()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const resolvedSearchParams = await searchParams
  const todayStr = new Date().toISOString().slice(0, 10)
  const initialDate = isValidDateString(resolvedSearchParams?.date)
    ? resolvedSearchParams.date
    : todayStr

  const [{ data: muscleGroups }, { data: workouts }, { data: recentSessions }] =
    await Promise.all([
      supabase
        .from('muscle_groups')
        .select('id, name, allows_frequent_repeat, sort_order')
        .order('sort_order', { ascending: true }),
      supabase
        .from('workouts')
        .select(
          `
          id,
          name,
          estimated_duration_min,
          estimated_kcal,
          default_sets,
          muscle_group_id,
          muscle_groups ( id, name )
        `
        )
        .order('name', { ascending: true }),
      supabase
        .from('training_sessions')
        .select(
          `
          id,
          scheduled_date,
          status,
          session_workouts (
            workout_id,
            workouts (
              muscle_group_id
            )
          )
        `
        )
        .order('scheduled_date', { ascending: false })
        .limit(10),
    ])

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 py-5 pb-24 sm:px-6">
      <div className="flex items-center justify-between gap-3 rounded-3xl border border-zinc-800 bg-zinc-900 p-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-400">
            nieuwe sessie
          </p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-white">
            training plannen
          </h1>
          <p className="mt-1 text-sm text-zinc-400 tabular-nums">
            gekozen datum: <span className="font-semibold text-emerald-300">{initialDate}</span>
          </p>
        </div>

        <Link
          href="/dashboard/week"
          className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-2xl border border-zinc-700 bg-zinc-800 px-3.5 py-2.5 text-xs font-bold text-zinc-200 transition-colors hover:border-zinc-600"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>week</span>
        </Link>
      </div>

      <PlanWorkoutClient
        todayStr={todayStr}
        initialDate={initialDate}
        muscleGroups={(muscleGroups ?? []) as never}
        workouts={(workouts ?? []) as never}
        recentSessions={(recentSessions ?? []) as never}
      />
    </div>
  )
}