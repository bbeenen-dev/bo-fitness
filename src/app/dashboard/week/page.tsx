import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase/server'
import { PlannerSessionRow } from '@/lib/chainshift'
import { WeekPlannerClient } from '@/components/weekplannerclient'

export default async function WeekPlannerPage() {
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
      total_duration_min,
      session_workouts (
        id,
        sort_order,
        is_completed,
        started_at,
        ended_at,
        workouts (
          id,
          name,
          estimated_duration_min,
          muscle_groups ( name )
        )
      )
    `
    )
    .order('scheduled_date', { ascending: true })

  const todayStr = new Date().toISOString().slice(0, 10)

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">weekplanner</h1>
        <p className="text-sm text-neutral-500">
          overzicht van je trainingen per dag, inclusief drag-and-drop met ketting-verschuiving en sessieduur.
        </p>
      </div>

      <WeekPlannerClient
        initialSessions={(sessions ?? []) as unknown as PlannerSessionRow[]}
        todayStr={todayStr}
      />
    </div>
  )
}