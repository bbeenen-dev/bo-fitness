import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase/server'
import type { Workout } from '@/lib/supabase/database'
import CalendarView from './calendarview'

export default async function KalenderPage() {
  const supabase = await createServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: workouts, error } = await supabase
    .from('workouts')
    .select('id, title, workout_date, notes')
    .order('workout_date', { ascending: false })

  const items = (workouts as Workout[] | null) ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Kalender</h1>
        <p className="text-sm text-slate-400">
          Overzicht van al je geplande en uitgevoerde trainingssessies.
        </p>
      </div>

      {error && (
        <p className="rounded-xl border border-red-800 bg-red-950/60 p-4 text-sm text-red-300">
          Kon workouts niet inladen: {error.message}
        </p>
      )}

      <CalendarView workouts={items} />
    </div>
  )
}