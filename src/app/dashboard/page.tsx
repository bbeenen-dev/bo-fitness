import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase/server'
import { buildDashboardStats, RawStatSession } from '@/lib/stats'
import { StatsDashboardClient } from '@/components/statsdashboardclient'

export default async function DashboardPage() {
  const supabase = await createServerSupabase()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: sessions } = await supabase
    .from('training_sessions')
    .select(
      `
      id,
      scheduled_date,
      status,
      session_workouts (
        id,
        perceived_effort,
        workouts (
          id,
          name,
          muscle_groups (
            id,
            name,
            sort_order
          )
        ),
        workout_sets (
          weight_kg,
          reps
        )
      )
    `
    )
    .order('scheduled_date', { ascending: true })

  const stats = buildDashboardStats(
    (sessions ?? []) as unknown as RawStatSession[]
  )

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">statistieken</h1>
        <p className="text-sm text-neutral-500">
          totaal getrainde kilo&apos;s per week, per spiergroep en je progressie per spiergroep.
        </p>
      </div>

      <StatsDashboardClient stats={stats} />
    </div>
  )
}