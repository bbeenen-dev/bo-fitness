export interface Workout {
  id: string
  user_id: string
  title: string
  workout_date: string
  notes: string | null
  created_at: string
}

export interface WorkoutSet {
  id: string
  workout_id: string
  user_id: string
  exercise_name: string
  set_number: number
  reps: number
  weight_kg: number
  created_at: string
}

export interface WorkoutWithSets extends Workout {
  workout_sets: WorkoutSet[]
}