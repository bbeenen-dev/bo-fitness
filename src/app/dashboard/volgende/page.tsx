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

  // Zoek de eerstvolgende geplande training
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
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-bold">eerst volgende training</h1>
          <p className="text-sm text-neutral-500">
            er staat op dit moment nog geen training gepland.
          </p>
        </div>

        <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-8 text-center">
          <p className="text-sm text-neutral-600">
            plan direct een nieuwe training (automatisch of zelf samengesteld).
          </p>
          <Link
            href="/dashboard/plannen"
            className="mt-4 inline-block rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700"
          >
            training plannen
          </Link>
        </div>
      </div>
    )
  }

  const rawItems = (session.session_workouts ?? []) as unknown as SessionWorkoutItem[]
  const sortedItems = [...rawItems].sort((a, b) => a.sort_order - b.sort_order)

  const estimatedTotal = sortedItems.reduce(
    (sum, item) => sum + (item.workouts?.estimated_duration_min ?? 0),
    0
  )

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">eerst volgende training</h1>
          <p className="text-sm text-neutral-500">
            gepland op <span className="font-semibold text-neutral-800">{session.scheduled_date}</span>{' '}
            · geschatte duur: {estimatedTotal} min
          </p>
        </div>

        <Link
          href="/dashboard/week"
          className="rounded-lg border border-neutral-300 bg-white px-3.5 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
        >
          bekijk in weekplanner
        </Link>
      </div>

      <NextSessionList initialItems={sortedItems} />
    </div>
  )
}