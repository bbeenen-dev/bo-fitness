import { notFound, redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase/server'
import type { WorkoutWithSets } from '@/lib/supabase/database'
import Link from 'next/link'
import { ArrowLeft, Calendar, Dumbbell, FileText } from 'lucide-react'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function WorkoutDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createServerSupabase()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Haal de workout op inclusief de bijbehorende sets
  const { data: workout, error } = await supabase
    .from('workouts')
    .select(`
      *,
      workout_sets (*)
    `)
    .eq('id', id)
    .single()

  if (error || !workout) {
    notFound()
  }

  const typedWorkout = workout as WorkoutWithSets

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Terugknop */}
      <div>
        <Link
          href="/dashboard/kalender"
          className="inline-flex items-center text-sm text-slate-400 hover:text-slate-100 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Terug naar kalender
        </Link>
      </div>

      {/* Header kaart */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">
            {typedWorkout.title}
          </h1>
          <div className="flex items-center text-sm text-slate-400 bg-slate-800/60 px-3 py-1.5 rounded-xl w-fit">
            <Calendar className="w-4 h-4 mr-2 text-emerald-400" />
            {new Date(typedWorkout.workout_date).toLocaleDateString('nl-NL', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </div>
        </div>

        {typedWorkout.notes && (
          <div className="flex items-start text-sm text-slate-300 bg-slate-950/40 p-4 rounded-xl border border-slate-800/60">
            <FileText className="w-4 h-4 mr-2 mt-0.5 text-slate-400 shrink-0" />
            <p>{typedWorkout.notes}</p>
          </div>
        )}
      </div>

      {/* Oefeningen & Sets overzicht */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-100 flex items-center">
            <Dumbbell className="w-5 h-5 mr-2 text-emerald-400" />
            Uitgevoerde Oefeningen & Sets
          </h2>
          <span className="text-xs text-slate-400 bg-slate-800 px-2.5 py-1 rounded-full">
            {typedWorkout.workout_sets?.length ?? 0} sets totaal
          </span>
        </div>

        {!typedWorkout.workout_sets || typedWorkout.workout_sets.length === 0 ? (
          <p className="text-sm text-slate-400 py-6 text-center">
            Geen sets geregistreerd voor deze training.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider">
                <tr>
                  <th className="pb-3 font-medium">Oefening</th>
                  <th className="pb-3 font-medium text-center">Set</th>
                  <th className="pb-3 font-medium text-right">Gewicht (kg)</th>
                  <th className="pb-3 font-medium text-right">Reps</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {typedWorkout.workout_sets.map((set) => (
                  <tr key={set.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 font-medium text-slate-100">{set.exercise_name}</td>
                    <td className="py-3 text-center text-slate-400">{set.set_number}</td>
                    <td className="py-3 text-right font-mono">{set.weight_kg} kg</td>
                    <td className="py-3 text-right font-mono">{set.reps}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}