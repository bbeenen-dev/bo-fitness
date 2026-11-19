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

  async function saveSession(
    scheduledDate: string,
    workoutIds: string[],
    source: 'auto_planned' | 'manual'
  ) {
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
      setErrorMsg(
        `de totale duur is ${totalMin} min. maximaal 75 minuten per training is toegestaan.`
      )
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
      <div className="flex flex-wrap gap-2.5">
        <button
          type="button"
          onClick={() => setMode('auto')}
          className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
            mode === 'auto'
              ? 'bg-emerald-500 text-zinc-950'
              : 'border border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-zinc-600 hover:text-white'
          }`}
        >
          automatisch laten plannen
        </button>

        <button
          type="button"
          onClick={() => setMode('manual')}
          className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
            mode === 'manual'
              ? 'bg-emerald-500 text-zinc-950'
              : 'border border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-zinc-600 hover:text-white'
          }`}
        >
          zelf samenstellen
        </button>
      </div>

      {errorMsg && (
        <div className="rounded-xl border border-red-500/40 bg-red-950/40 px-4 py-3 text-sm text-red-300">
          {errorMsg}
        </div>
      )}

      {/* MODUS 1: AUTOMATISCH PLANNEN */}
      {mode === 'auto' && (
        <div className="space-y-5 rounded-2xl border border-zinc-800 bg-zinc-900 p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-white">automatisch voorstel</h2>
              <p className="text-sm text-zinc-400">
                gebaseerd op je afgelopen 7 dagen, rustdagen en spiergroepen met voorrang.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-sm font-medium text-zinc-300">
                <span>datum</span>
                <input
                  type="date"
                  value={autoDate}
                  onChange={(e) => setAutoDate(e.target.value)}
                  className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-sm font-semibold text-white tabular-nums focus:border-emerald-500 focus:outline-none"
                />
              </label>

              <span
                className={`rounded-full px-3 py-1 text-xs font-bold tabular-nums ${
                  autoTotalMinutes > 75
                    ? 'bg-red-500/20 text-red-300'
                    : 'bg-emerald-500/15 text-emerald-400'
                }`}
              >
                {autoTotalMinutes} / 75 min
              </span>
            </div>
          </div>

          {/* Uitleg waarom deze spiergroepen zijn gekozen */}
          {autoSuggestion.reasonSummary.length > 0 && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-4 text-xs text-zinc-300">
              <p className="mb-1.5 font-bold uppercase tracking-wider text-emerald-400">
                onderbouwing
              </p>
              <ul className="list-inside list-disc space-y-1 text-zinc-400">
                {autoSuggestion.reasonSummary.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Voorgestelde workouts */}
          <div className="space-y-2.5">
            {autoWorkoutIds.map((id) => {
              const w = workoutsById.get(id)
              if (!w) return null
              const mg = mgById.get(w.muscle_group_id)
              return (
                <div
                  key={id}
                  className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950/70 px-4 py-3"
                >
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                      {mg?.name}
                    </span>
                    <p className="font-bold text-white">{w.name}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="rounded-lg bg-zinc-800 px-2.5 py-1 text-xs font-semibold text-zinc-300 tabular-nums">
                      {w.estimated_duration_min} min
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setAutoWorkoutIds((prev) => prev.filter((item) => item !== id))
                      }
                      className="text-xs font-medium text-zinc-400 transition-colors hover:text-red-400"
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
            onClick={() => saveSession(autoDate, autoWorkoutIds, 'auto_planned')}
            className="rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-bold text-zinc-950 transition-colors hover:bg-emerald-400 disabled:opacity-40"
          >
            {saving ? 'opslaan...' : 'training inplannen'}
          </button>
        </div>
      )}

      {/* MODUS 2: ZELF SAMENSTELLEN */}
      {mode === 'manual' && (
        <div className="space-y-6 rounded-2xl border border-zinc-800 bg-zinc-900 p-5 sm:p-6">
          {/* Stap 1: Spiergroepen kiezen */}
          <div>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-bold text-white">
                  {isMgConfirmed ? 'gekozen spiergroepen' : '1. selecteer spiergroepen'}
                </h2>
                <p className="text-sm text-zinc-400">
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
                  className="text-xs font-semibold text-emerald-400 underline hover:text-emerald-300"
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
                      className={`rounded-xl border px-4 py-2 text-sm font-semibold transition-colors ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-500 text-zinc-950'
                          : 'border-zinc-700 bg-zinc-950 text-zinc-300 hover:border-zinc-600 hover:text-white'
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
                className="mt-4 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-bold text-zinc-950 transition-colors hover:bg-emerald-400 disabled:opacity-40"
              >
                selecteren
              </button>
            )}
          </div>

          {/* Stap 2: Workouts per geselecteerde spiergroep kiezen */}
          {isMgConfirmed && (
            <div className="space-y-5 border-t border-zinc-800 pt-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="font-bold text-white">2. kies workouts &amp; datum</h3>

                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-2 text-sm font-medium text-zinc-300">
                    <span>datum</span>
                    <input
                      type="date"
                      value={manualDate}
                      onChange={(e) => setManualDate(e.target.value)}
                      className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-sm font-semibold text-white tabular-nums focus:border-emerald-500 focus:outline-none"
                    />
                  </label>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold tabular-nums ${
                      manualTotalMinutes > 75
                        ? 'bg-red-500/20 text-red-300'
                        : 'bg-emerald-500/15 text-emerald-400'
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
                      <div
                        key={mg.id}
                        className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4"
                      >
                        <p className="mb-2.5 text-xs font-bold uppercase tracking-wider text-emerald-400">
                          {mg.name}
                        </p>
                        <div className="grid gap-2.5 sm:grid-cols-2">
                          {mgWorkouts.map((w) => {
                            const checked = chosenManualWorkoutIds.includes(w.id)
                            return (
                              <button
                                key={w.id}
                                type="button"
                                onClick={() => toggleManualWorkout(w.id)}
                                className={`flex items-center justify-between rounded-xl border px-3.5 py-2.5 text-left text-sm transition-colors ${
                                  checked
                                    ? 'border-emerald-500 bg-emerald-950/45 font-semibold text-white'
                                    : 'border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-zinc-700 hover:text-white'
                                }`}
                              >
                                <span>{w.name}</span>
                                <span className="rounded-md bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400 tabular-nums">
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
                disabled={
                  saving || chosenManualWorkoutIds.length === 0 || manualTotalMinutes > 75
                }
                onClick={() => saveSession(manualDate, chosenManualWorkoutIds, 'manual')}
                className="rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-bold text-zinc-950 transition-colors hover:bg-emerald-400 disabled:opacity-40"
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