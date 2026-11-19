import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase/server'
import { generateAutoPlan, HistorySession } from '@/lib/autoplanner'
import { PlanWorkoutClient } from '@/components/planworkoutclient'

export default async function TrainingPlannenPage() {
  const supabase = await createServerSupabase()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const [{ data: muscleGroups }, { data: workouts }, { data: sessions }] = await Promise.all([
    supabase.from('muscle_groups').select('*').order('sort_order', { ascending: true }),
    supabase.from('workouts').select('*').order('name', { ascending: true }),
    supabase
      .from('training_sessions')
      .select('id, scheduled_date, status, session_workouts(workout_id, workouts(id, muscle_group_id))')
      .order('scheduled_date', { ascending: true }),
  ])

  const todayStr = new Date().toISOString().slice(0, 10)

  const autoSuggestion = generateAutoPlan({
    todayStr,
    muscleGroups: muscleGroups ?? [],
    workouts: workouts ?? [],
    sessions: (sessions ?? []) as unknown as HistorySession[],
    maxMinutes: 75,
  })

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">training plannen</h1>
        <p className="text-sm text-neutral-500">
          laat de app automatisch een training samenstellen of kies zelf je spiergroepen en workouts.
        </p>
      </div>

      <PlanWorkoutClient
        userId={user.id}
        muscleGroups={muscleGroups ?? []}
        workouts={workouts ?? []}
        autoSuggestion={autoSuggestion}
      />
    </div>
  )
}