import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase/server'
import { PlanWorkoutClient } from '@/components/planworkoutclient'
import { generateAutoPlan } from '@/lib/autoplanner'

export default async function PlannenPage() {
  const supabase = await createServerSupabase()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const [{ data: muscleGroups }, { data: workouts }, { data: recentSessions }] =
    await Promise.all([
      supabase
        .from('muscle_groups')
        .select('*')
        .order('sort_order', { ascending: true }),
      supabase.from('workouts').select('*').order('name', { ascending: true }),
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
        .limit(14),
    ])

  const todayStr = new Date().toISOString().slice(0, 10)
  const safeMuscleGroups = muscleGroups ?? []
  const safeWorkouts = workouts ?? []

  const autoSuggestion = generateAutoPlan({
    todayStr,
    muscleGroups: safeMuscleGroups,
    workouts: safeWorkouts,
    sessions: (recentSessions ?? []) as never,
    maxMinutes: 75,
  })

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400">
          sessie samenstellen
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-white">
          training plannen
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          kies handmatig workouts of laat een voorstel samenstellen tot maximaal 75 minuten.
        </p>
      </div>

      <PlanWorkoutClient
        userId={user.id}
        muscleGroups={safeMuscleGroups}
        workouts={safeWorkouts}
        autoSuggestion={autoSuggestion}
      />
    </div>
  )
}