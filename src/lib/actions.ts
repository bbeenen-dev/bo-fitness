'use server'

import { createServerSupabase } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createWorkout(formData: FormData) {
  const supabase = await createServerSupabase()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const title = formData.get('title') as string
  const workout_date = formData.get('workout_date') as string
  const notes = formData.get('notes') as string

  // 1. Maak de workout aan
  const { data: workout, error: workoutError } = await supabase
    .from('workouts')
    .insert([
      {
        user_id: user.id,
        title,
        workout_date,
        notes: notes || null,
      },
    ])
    .select()
    .single()

  if (workoutError || !workout) {
    throw new Error('Kon workout niet opslaan: ' + workoutError?.message)
  }

  // 2. Haal alle sets op uit de form data
  const exercisesJson = formData.get('exercises') as string
  if (exercisesJson) {
    const exercises = JSON.parse(exercisesJson)
    
    const setsToInsert = exercises.map((item: { exercise_name: string; set_number: number; weight_kg: number; reps: number }, index: number) => ({
      workout_id: workout.id,
      user_id: user.id,
      exercise_name: item.exercise_name,
      set_number: item.set_number || index + 1,
      weight_kg: Number(item.weight_kg) || 0,
      reps: Number(item.reps) || 0,
    }))

    if (setsToInsert.length > 0) {
      const { error: setsError } = await supabase
        .from('workout_sets')
        .insert(setsToInsert)

      if (setsError) {
        throw new Error('Kon sets niet opslaan: ' + setsError.message)
      }
    }
  }

  revalidatePath('/dashboard')
  revalidatePath('/dashboard')
  redirect('/dashboard')
}