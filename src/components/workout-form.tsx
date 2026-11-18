'use client'

import { useState } from 'react'
import { createWorkout } from '@/lib/actions'
import { Plus, Trash2, Dumbbell, Calendar, FileText, Save } from 'lucide-react'

interface ExerciseSetInput {
  exercise_name: string
  set_number: number
  weight_kg: number | ''
  reps: number | ''
}

export default function WorkoutForm() {
  const [sets, setSets] = useState<ExerciseSetInput[]>([
    { exercise_name: '', set_number: 1, weight_kg: '', reps: '' },
  ])

  function addSet() {
    setSets([
      ...sets,
      {
        exercise_name: sets[sets.length - 1]?.exercise_name || '',
        set_number: sets.filter(s => s.exercise_name === (sets[sets.length - 1]?.exercise_name || '')).length + 1,
        weight_kg: '',
        reps: '',
      },
    ])
  }

  function removeSet(index: number) {
    setSets(sets.filter((_, i) => i !== index))
  }

  function updateSet(index: number, field: keyof ExerciseSetInput, value: string | number) {
    const newSets = [...sets]
    newSets[index] = { ...newSets[index], [field]: value }
    setSets(newSets)
  }

  return (
    <form action={createWorkout} className="space-y-6 max-w-2xl mx-auto">
      {/* Verborgen veld om de sets als JSON mee te sturen naar de Server Action */}
      <input type="hidden" name="exercises" value={JSON.stringify(sets)} />

      {/* Algemene info */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl space-y-4">
        <h2 className="text-xl font-bold text-slate-100 flex items-center">
          <Dumbbell className="w-5 h-5 mr-2 text-emerald-400" />
          Nieuwe Training Loggen
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Titel van de training
            </label>
            <input
              type="text"
              name="title"
              required
              placeholder="Bijv. Borst & Triceps"
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-slate-100 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Datum
              </label>
              <input
                type="date"
                name="workout_date"
                required
                defaultValue={new Date().toISOString().split('T')[0]}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-slate-100 focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Notities (optioneel)
            </label>
            <textarea
              name="notes"
              rows={2}
              placeholder="Hoe ging de training? Energieniveau, opmerkingen..."
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-slate-100 focus:border-emerald-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Sets / Oefeningen toevoegen */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-100">Oefeningen & Sets</h3>
          <button
            type="button"
            onClick={addSet}
            className="inline-flex items-center text-xs bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg transition-colors font-medium"
          >
            <Plus className="w-4 h-4 mr-1" /> Set toevoegen
          </button>
        </div>

        <div className="space-y-3">
          {sets.map((set, index) => (
            <div key={index} className="flex items-center gap-2 bg-slate-950/50 p-3 rounded-xl border border-slate-800/60">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Oefening (bijv. Bankdrukken)"
                  value={set.exercise_name}
                  onChange={(e) => updateSet(index, 'exercise_name', e.target.value)}
                  required
                  className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div className="w-20">
                <input
                  type="number"
                  placeholder="kg"
                  value={set.weight_kg}
                  onChange={(e) => updateSet(index, 'weight_kg', e.target.value)}
                  required
                  className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div className="w-20">
                <input
                  type="number"
                  placeholder="reps"
                  value={set.reps}
                  onChange={(e) => updateSet(index, 'reps', e.target.value)}
                  required
                  className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <button
                type="button"
                onClick={() => removeSet(index)}
                disabled={sets.length === 1}
                className="text-slate-500 hover:text-red-400 p-2 disabled:opacity-30 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          className="inline-flex items-center bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-6 py-3 rounded-xl shadow-lg transition-colors"
        >
          <Save className="w-5 h-5 mr-2" /> Training Opslaan
        </button>
      </div>
    </form>
  )
}