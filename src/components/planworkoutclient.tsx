'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  AutoPlanSuggestion,
  MuscleGroupRow,
  WorkoutRow,
} from '@/lib/autoplanner'

type Props = {
  userId: string
  muscleGroups: MuscleGroupRow[]
  workouts: WorkoutRow[]
  autoSuggestion: AutoPlanSuggestion
}

export function PlanWorkoutClient({
  userId,
  muscleGroups,
  workouts,
  autoSuggestion,
}: Props) {
  const router = useRouter()
  const [mode, setMode] = useState<'auto' | 'manual'>('auto')
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // --- State voor AUTOMATISCH ---
  const [autoDate, setAutoDate] = useState(autoSuggestion.suggestedDate)
  const [autoWorkoutIds, setAutoWorkoutIds] = useState<string[]>(
    autoSuggestion.workouts.map((w) => w.id)
  )

  // --- State voor ZELF SAMENSTELLEN ---
  const [selectedMgIds, setSelectedMgIds] = useState<string[]>([])
  const [isMgConfirmed, setIsMgConfirmed] = useState(false)
  const [chosenManualWorkoutIds, setChosenManualWorkoutIds] = useState<string[]>([])
  const [manualDate, setManualDate] = useState(autoSuggestion.suggestedDate)

  const workoutsById = useMemo(
    () => new Map(workouts.map((w) => [w.id, w])),
    [workouts]
  )
  const mgById = useMemo(
    () => new Map(muscleGroups.map((m) => [m.id, m])),
    [muscleGroups]
  )

  const autoTotalMinutes = autoWorkoutIds.reduce(
    (sum, id) => sum + (workoutsById.get(id)?.estimated_duration_min ?? 0),
    0
  )

  const manualTotalMinutes = chosenManualWorkoutIds.reduce(
    (sum, id) => sum + (workoutsById.get(id)?.estimated_duration_min ?? 0),
    0
  )

  function toggleMuscleGroup(mgId: string) {
    setSelectedMgIds((prev) =>
      prev.includes(mgId) ? prev.filter((id) => id !== mgId) : [...prev, mgId]
    )
  }

  function toggleManualWorkout(workoutId: string) {
    setChosenManualWorkoutIds((prev) =>
      prev.includes(workoutId)
        ? prev.filter((id) => id !== workoutId)
        : [...prev, workoutId]
    )
  }

  async function saveSession(scheduledDate: string, workoutIds: string[], source: 'auto_plan' | 'manual') {
    setErrorMsg(null)
    if (workoutIds.length === 0) {
      setErrorMsg('selecteer minimaal één workout.')
      return
    }

    const totalMin = workoutIds.reduce(
      (sum, id) => sum + (workoutsById.get(id)?.estimated_duration_min ?? 0),
      0
    )
    if (totalMin > 75) {
      setErrorMsg(`de totale duur is ${totalMin} min. maximaal 75 minuten per training is toegestaan.`)
      return
    }

    setSaving(true)
    const supabase = createClient()

    const { data: session, error: sessionErr } = await supabase
      .from('training_sessions')
      .insert({
        user_id: userId,
        scheduled_date: scheduledDate,
        status: 'planned',
        source,
      })
      .select('id')
      .single()

    if (sessionErr || !session) {
      setSaving(false)
      setErrorMsg(sessionErr?.message ?? 'kon training niet opslaan.')
      return
    }

    const rows = workoutIds.map((workoutId, idx) => ({
      training_session_id: session.id,
      user_id: userId,
      workout_id: workoutId,
      sort_order: idx + 1,
      is_completed: false,
    }))

    const { error: swErr } = await supabase.from('session_workouts').insert(rows)

    setSaving(false)
    if (swErr) {
      setErrorMsg(swErr.message)
      return
    }

    router.push('/dashboard/volgende')
    router.refresh()
  }

  return (
    <div className="space-y-6">
      {/* Keuze tussen automatisch en zelf samenstellen */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setMode('auto')}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            mode === 'auto'
              ? 'bg-emerald-600 text-white'
              : 'border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50'
          }`}
        >
          automatisch laten plannen
        </button>

        <button
          type="button"
          onClick={() => setMode('manual')}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            mode === 'manual'
              ? 'bg-emerald-600 text-white'
              : 'border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50'
          }`}
        >
          zelf samenstellen
        </button>
      </div>

      {errorMsg && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMsg}
        </div>
      )}

      {/* MODUS 1: AUTOMATISCH PLANNEN */}
      {mode === 'auto' && (
        <div className="space-y-5 rounded-xl border border-neutral-200 bg-white p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">automatisch voorstel</h2>
              <p className="text-sm text-neutral-500">
                gebaseerd op je afgelopen 7 dagen, rustdagen en spiergroepen met voorrang.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-neutral-700">
                datum:{' '}
                <input
                  type="date"
                  value={autoDate}
                  onChange={(e) => setAutoDate(e.target.value)}
                  className="ml-1 rounded-md border border-neutral-300 px-2.5 py-1.5 text-sm"
                />
              </label>

              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  autoTotalMinutes > 75
                    ? 'bg-red-100 text-red-700'
                    : 'bg-emerald-50 text-emerald-700'
                }`}
              >
                {autoTotalMinutes} / 75 min
              </span>
            </div>
          </div>

          {/* Uitleg waarom deze spiergroepen zijn gekozen */}
          {autoSuggestion.reasonSummary.length > 0 && (
            <div className="rounded-lg bg-neutral-50 p-3.5 text-xs text-neutral-600">
              <p className="mb-1 font-semibold text-neutral-800">onderbouwing:</p>
              <ul className="list-inside list-disc space-y-0.5">
                {autoSuggestion.reasonSummary.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Voorgestelde workouts */}
          <div className="space-y-2">
            {autoWorkoutIds.map((id) => {
              const w = workoutsById.get(id)
              if (!w) return null
              const mg = mgById.get(w.muscle_group_id)
              return (
                <div
                  key={id}
                  className="flex items-center justify-between rounded-lg border border-neutral-200 px-4 py-3"
                >
                  <div>
                    <span className="text-xs font-medium uppercase tracking-wide text-emerald-700">
                      {mg?.name}
                    </span>
                    <p className="font-medium text-neutral-900">{w.name}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-neutral-500">{w.estimated_duration_min} min</span>
                    <button
                      type="button"
                      onClick={() =>
                        setAutoWorkoutIds((prev) => prev.filter((item) => item !== id))
                      }
                      className="text-xs text-neutral-400 hover:text-red-600"
                    >
                      verwijder
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          <button
            type="button"
            disabled={saving || autoWorkoutIds.length === 0 || autoTotalMinutes > 75}
            onClick={() => saveSession(autoDate, autoWorkoutIds, 'auto_plan')}
            className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {saving ? 'opslaan...' : 'training inplannen'}
          </button>
        </div>
      )}

      {/* MODUS 2: ZELF SAMENSTELLEN */}
      {mode === 'manual' && (
        <div className="space-y-6 rounded-xl border border-neutral-200 bg-white p-6">
          {/* Stap 1: Spiergroepen kiezen */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">
                  {isMgConfirmed ? 'gekozen spiergroepen' : '1. selecteer spiergroepen'}
                </h2>
                <p className="text-sm text-neutral-500">
                  {isMgConfirmed
                    ? 'kies hieronder de gewenste workouts per spiergroep.'
                    : 'klik de gewenste spiergroepen aan (worden groen) en klik op selecteren.'}
                </p>
              </div>

              {isMgConfirmed && (
                <button
                  type="button"
                  onClick={() => {
                    setIsMgConfirmed(false)
                    setChosenManualWorkoutIds([])
                  }}
                  className="text-xs font-medium text-neutral-600 underline hover:text-neutral-900"
                >
                  spiergroepen wijzigen
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {muscleGroups
                .filter((mg) => !isMgConfirmed || selectedMgIds.includes(mg.id))
                .map((mg) => {
                  const isSelected = selectedMgIds.includes(mg.id)
                  return (
                    <button
                      key={mg.id}
                      type="button"
                      disabled={isMgConfirmed}
                      onClick={() => toggleMuscleGroup(mg.id)}
                      className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                        isSelected
                          ? 'border-emerald-600 bg-emerald-600 text-white'
                          : 'border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50'
                      }`}
                    >
                      {mg.name}
                    </button>
                  )
                })}
            </div>

            {!isMgConfirmed && (
              <button
                type="button"
                disabled={selectedMgIds.length === 0}
                onClick={() => setIsMgConfirmed(true)}
                className="mt-4 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-40"
              >
                selecteren
              </button>
            )}
          </div>

          {/* Stap 2: Workouts per geselecteerde spiergroep kiezen */}
          {isMgConfirmed && (
            <div className="space-y-5 border-t border-neutral-200 pt-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="font-semibold">2. kies workouts &amp; datum</h3>

                <div className="flex items-center gap-3">
                  <label className="text-sm font-medium text-neutral-700">
                    datum:{' '}
                    <input
                      type="date"
                      value={manualDate}
                      onChange={(e) => setManualDate(e.target.value)}
                      className="ml-1 rounded-md border border-neutral-300 px-2.5 py-1.5 text-sm"
                    />
                  </label>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      manualTotalMinutes > 75
                        ? 'bg-red-100 text-red-700'
                        : 'bg-emerald-50 text-emerald-700'
                    }`}
                  >
                    {manualTotalMinutes} / 75 min
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                {muscleGroups
                  .filter((mg) => selectedMgIds.includes(mg.id))
                  .map((mg) => {
                    const mgWorkouts = workouts.filter((w) => w.muscle_group_id === mg.id)
                    return (
                      <div key={mg.id} className="rounded-lg border border-neutral-200 p-4">
                        <p className="mb-2.5 text-sm font-semibold text-emerald-700">{mg.name}</p>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {mgWorkouts.map((w) => {
                            const checked = chosenManualWorkoutIds.includes(w.id)
                            return (
                              <button
                                key={w.id}
                                type="button"
                                onClick={() => toggleManualWorkout(w.id)}
                                className={`flex items-center justify-between rounded-lg border px-3.5 py-2.5 text-left text-sm transition-colors ${
                                  checked
                                    ? 'border-emerald-600 bg-emerald-50 font-medium text-emerald-900'
                                    : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50'
                                }`}
                              >
                                <span>{w.name}</span>
                                <span className="text-xs text-neutral-500">
                                  {w.estimated_duration_min} min
                                </span>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
              </div>

              <button
                type="button"
                disabled={saving || chosenManualWorkoutIds.length === 0 || manualTotalMinutes > 75}
                onClick={() => saveSession(manualDate, chosenManualWorkoutIds, 'manual')}
                className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {saving ? 'opslaan...' : 'training opslaan in weekplanner'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}