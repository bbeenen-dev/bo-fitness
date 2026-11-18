import { createServerSupabase } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, Dumbbell, Calendar, ChevronRight } from 'lucide-react'
import type { Workout } from '@/lib/supabase/database'

export default async function WorkoutsPage() {
  const supabase = await createServerSupabase()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Haal alle workouts van de ingelogde gebruiker op uit Supabase
  const { data: workouts, error } = await supabase
    .from('workouts')
    .select('*')
    .order('workout_date', { ascending: false })

  const items = (workouts as Workout[] | null) ?? []

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-4 sm:p-6">
      {/* Header met knop */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">Mijn Workouts</h1>
          <p className="text-sm text-slate-400">
            Beheer en bekijk al je uitgevoerde trainingen.
          </p>
        </div>
        <Link
          href="/dashboard/workouts/nieuw"
          className="inline-flex items-center justify-center bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-4 py-2.5 rounded-xl shadow-lg transition-colors text-sm"
        >
          <Plus className="w-4 h-4 mr-2" /> Nieuwe Training Toevoegen
        </Link>
      </div>

      {error && (
        <p className="rounded-xl border border-red-800 bg-red-950/60 p-4 text-sm text-red-300">
          Kon workouts niet inladen: {error.message}
        </p>
      )}

      {/* Lijst van workouts */}
      {items.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-12 text-center space-y-4 shadow-xl">
          <Dumbbell className="w-12 h-12 mx-auto text-slate-600" />
          <h3 className="text-lg font-medium text-slate-200">Nog geen workouts</h3>
          <p className="text-sm text-slate-400 max-w-sm mx-auto">
            Je hebt nog geen trainingen geregistreerd. Klik hieronder om je eerste training toe te voegen!
          </p>
          <Link
            href="/dashboard/workouts/nieuw"
            className="inline-flex items-center bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-4 py-2 rounded-xl text-sm transition-colors"
          >
            <Plus className="w-4 h-4 mr-1.5" /> Start je eerste training
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {items.map((workout) => (
            <Link
              key={workout.id}
              href={`/dashboard/log/${workout.id}`}
              className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-sm hover:border-slate-700 hover:bg-slate-850 transition-all group"
            >
              <div className="space-y-1">
                <h3 className="font-semibold text-slate-100 group-hover:text-emerald-400 transition-colors">
                  {workout.title}
                </h3>
                <div className="flex items-center text-xs text-slate-400">
                  <Calendar className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />
                  {new Date(workout.workout_date).toLocaleDateString('nl-NL', {
                    weekday: 'short',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </div>
              </div>
              <div className="flex items-center text-slate-500 group-hover:text-slate-300 transition-colors">
                <span className="text-xs mr-1 hidden sm:inline">Bekijk sets</span>
                <ChevronRight className="w-5 h-5" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}