import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase/server'
import {
  WorkoutHistorieClient,
  type MuscleGroupHistory,
} from './workout-historie-client'

type RawMuscleGroup = {
  id: string
  name: string
  sort_order: number | null
  workouts: {
    id: string
    name: string
  }[]
}

type RawWorkoutSet = {
  id: string
  session_workout_id: string
  set_number: number | null
  weight_kg: number | string | null
  reps: number | null
  completed_at: string | null
  created_at: string | null
}

type RawSessionWorkout = {
  id: string
  workout_id: string
  training_sessions: {
    scheduled_date: string | null
  } | null
  workout_sets: RawWorkoutSet[]
}

export default async function WorkoutHistoriePage() {
  const supabase = await createServerSupabase()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const [{ data: muscleGroupsData }, { data: sessionWorkoutsData }] =
    await Promise.all([
      supabase
        .from('muscle_groups')
        .select(
          `
          id,
          name,
          sort_order,
          workouts (
            id,
            name
          )
        `
        )
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true }),
      supabase
        .from('session_workouts')
        .select(
          `
          id,
          workout_id,
          training_sessions (
            scheduled_date
          ),
          workout_sets (
            id,
            session_workout_id,
            set_number,
            weight_kg,
            reps,
            completed_at,
            created_at
          )
        `
        ),
    ])

  const muscleGroups = (muscleGroupsData ?? []) as unknown as RawMuscleGroup[]
  const sessionWorkouts =
    (sessionWorkoutsData ?? []) as unknown as RawSessionWorkout[]

  // Groepeer sets per workout_id en datum (scheduled_date bij voorkeur, anders completed_at/created_at)
  const setsByWorkout = new Map<
    string,
    {
      date: string
      setNumber: number
      reps: number
      weightKg: number
    }[]
  >()

  for (const sw of sessionWorkouts) {
    if (!sw.workout_id) continue

    const fallbackDate =
      sw.training_sessions?.scheduled_date ??
      sw.workout_sets?.[0]?.completed_at?.slice(0, 10) ??
      sw.workout_sets?.[0]?.created_at?.slice(0, 10) ??
      ''

    const sortedSets = [...(sw.workout_sets ?? [])].sort(
      (a, b) => (a.set_number ?? 999) - (b.set_number ?? 999)
    )

    sortedSets.forEach((set, index) => {
      const setDate =
        set.completed_at?.slice(0, 10) ||
        sw.training_sessions?.scheduled_date ||
        set.created_at?.slice(0, 10) ||
        fallbackDate

      if (!setDate) return

      const reps = Number(set.reps ?? 0)
      const weightKg = Number(set.weight_kg ?? 0)
      const setNumber = set.set_number ?? index + 1

      if (!setsByWorkout.has(sw.workout_id)) {
        setsByWorkout.set(sw.workout_id, [])
      }

      setsByWorkout.get(sw.workout_id)!.push({
        date: setDate,
        setNumber,
        reps,
        weightKg,
      })
    })
  }

  const groups: MuscleGroupHistory[] = muscleGroups.map((mg) => {
    const sortedWorkouts = [...(mg.workouts ?? [])].sort((a, b) =>
      a.name.localeCompare(b.name, 'nl')
    )

    return {
      id: mg.id,
      name: mg.name,
      sortOrder: mg.sort_order ?? 999,
      workouts: sortedWorkouts.map((w) => ({
        id: w.id,
        name: w.name,
        sets: setsByWorkout.get(w.id) ?? [],
      })),
    }
  })

  return <WorkoutHistorieClient groups={groups} />
}