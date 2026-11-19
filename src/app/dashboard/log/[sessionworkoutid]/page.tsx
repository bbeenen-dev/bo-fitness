import { notFound, redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase/server'
import { WorkoutLoggerClient } from '@/components/workoutloggerclient'

type LogPageProps = {
  params: Promise<{ sessionworkoutid: string }>
}

export default async function LogWorkoutPage({ params }: LogPageProps) {
  const { sessionworkoutid } = await params
  const supabase = await createServerSupabase()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Haal de gekozen session_workout op inclusief workout-info en eventuele huidige sets
  const { data: sw } = await supabase
    .from('session_workouts')
    .select(
      `
      id,
      training_session_id,
      workout_id,
      started_at,
      ended_at,
      perceived_effort,
      workouts (
        id,
        name,
        default_sets,
        muscle_groups ( name )
      ),
      workout_sets (
        set_number,
        weight_kg,
        reps
      )
    `
    )
    .eq('id', sessionworkoutid)
    .maybeSingle()

  if (!sw) {
    notFound()
  }

  // Zoek de laatst afgeronde uitvoering van DEZELFDE workout voor de grijze prefill
  const { data: previousSw } = await supabase
    .from('session_workouts')
    .select(
      `
      id,
      ended_at,
      workout_sets (
        set_number,
        weight_kg,
        reps
      )
    `
    )
    .eq('workout_id', sw.workout_id)
    .eq('is_completed', true)
    .neq('id', sw.id)
    .order('ended_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const workoutInfo = sw.workouts as unknown as {
    id: string
    name: string
    default_sets: number
    muscle_groups: { name: string } | null
  } | null

  return (
    <div className="p-6">
      <WorkoutLoggerClient
        userId={user.id}
        sessionWorkoutId={sw.id}
        trainingSessionId={sw.training_session_id}
        workoutName={workoutInfo?.name ?? 'workout'}
        muscleGroupName={workoutInfo?.muscle_groups?.name ?? ''}
        defaultSets={workoutInfo?.default_sets ?? 3}
        initialStartedAt={sw.started_at}
        initialEndedAt={sw.ended_at}
        initialEffort={sw.perceived_effort}
        existingSets={sw.workout_sets ?? []}
        previousSets={previousSw?.workout_sets ?? []}
      />
    </div>
  )
}