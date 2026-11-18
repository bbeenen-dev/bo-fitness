import { createServerSupabase } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Dumbbell, Calendar, Plus, ChevronRight } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createServerSupabase()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Haal eventueel de laatste 3 workouts op als preview
  const { data: recentWorkouts } = await supabase
    .from('workouts')
    .select('*')
    .order('workout_date', { ascending: false })
    .limit(3)

  return (
    <div className="space-y-8 max-w-4xl mx-auto p-4 sm:p-6">
      {/* Welkomstsectie */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 sm:p-8 shadow-xl space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-100">
          Welkom terug bij BO Fitness 💪
        </h1>
        <p className="text-sm text-slate-400">
          Klaar om vorderingen te maken? Bekijk je schema of registreer direct een nieuwe training.
        </p>
        <div className="pt-4 flex flex-wrap gap-3">
          <Link
            href="/dashboard/workouts/nieuw"
            className="inline-flex items-center bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-4 py-2.5 rounded-xl text-sm transition-colors shadow-lg"
          >
            <Plus className="w-4 h-4 mr-2" /> Nieuwe Training Loggen
          </Link>
          <Link
            href="/dashboard/kalender"
            className="inline-flex items-center bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium px-4 py-2.5 rounded-xl text-sm transition-colors border border-slate-700"
          >
            <Calendar className="w-4 h-4 mr-2 text-emerald-400" /> Bekijk Kalender
          </Link>
        </div>
      </div>

      {/* Snelle navigatie / cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          href="/dashboard/workouts"
          className="group rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl hover:border-slate-700 transition-all flex items-center justify-between"
        >
          <div className="space-y-1">
            <div className="w-10 h-10 rounded-xl bg-emerald-950/60 border border-emerald-800/60 flex items-center justify-center text-emerald-400 mb-3">
              <Dumbbell className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-semibold text-slate-100 group-hover:text-emerald-400 transition-colors">
              Alle Workouts
            </h2>
            <p className="text-xs text-slate-400">Beheer en bekijk al je trainingen en sets.</p>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-slate-300 transition-colors" />
        </Link>

        <Link
          href="/dashboard/kalender"
          className="group rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl hover:border-slate-700 transition-all flex items-center justify-between"
        >
          <div className="space-y-1">
            <div className="w-10 h-10 rounded-xl bg-emerald-950/60 border border-emerald-800/60 flex items-center justify-center text-emerald-400 mb-3">
              <Calendar className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-semibold text-slate-100 group-hover:text-emerald-400 transition-colors">
              Kalender Overzicht
            </h2>
            <p className="text-xs text-slate-400">Zie in één oogopslag wanneer je hebt getraind.</p>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-slate-300 transition-colors" />
        </Link>
      </div>

      {/* Recente trainingen preview */}
      {recentWorkouts && recentWorkouts.length > 0 && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-100">Recente Trainingen</h3>
            <Link href="/dashboard/workouts" className="text-xs text-emerald-400 hover:underline">
              Alles bekijken
            </Link>
          </div>
          <div className="space-y-2">
            {recentWorkouts.map((w) => (
              <Link
                key={w.id}
                href={`/dashboard/log/${w.id}`}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-950/40 border border-slate-800/60 hover:bg-slate-800/40 transition-colors text-sm"
              >
                <span className="font-medium text-slate-200">{w.title}</span>
                <span className="text-xs text-slate-400">
                  {new Date(w.workout_date).toLocaleDateString('nl-NL')}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}