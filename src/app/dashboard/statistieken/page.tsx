import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft, BarChart3 } from 'lucide-react'
import { createServerSupabase } from '@/lib/supabase/server'
import { buildDashboardStats, RawStatSession } from '@/lib/stats'
import { StatsDashboardClient } from '@/components/statsdashboardclient'

export default async function StatistiekenPage() {
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
    <div className="mx-auto max-w-4xl space-y-5 px-4 py-5 pb-24 sm:px-6">
      <div className="flex items-center justify-between gap-3 rounded-3xl border border-zinc-800 bg-zinc-900 p-5">
        <div>
          
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-green">
            statistieken laatste 5 weken
          </h1>
          
        </div>
       
      </div>

      <StatsDashboardClient stats={stats} />
    </div>
  )
}