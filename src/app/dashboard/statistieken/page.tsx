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
          <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-emerald-400">
            <BarChart3 className="h-3.5 w-3.5" />
            <span>analyse • laatste 5 weken</span>
          </div>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-white">
            statistieken
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            weekvolume in kilo&apos;s en workout-progressie per spiergroep.
          </p>
        </div>

        <Link
          href="/dashboard"
          className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-2xl border border-zinc-700 bg-zinc-800 px-3.5 py-2.5 text-xs font-bold text-zinc-200 transition-colors hover:border-zinc-600"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>overzicht</span>
        </Link>
      </div>

      <StatsDashboardClient stats={stats} />
    </div>
  )
}