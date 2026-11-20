'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles, SlidersHorizontal, Calendar } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { generateAutoPlan } from '@/lib/autoplanner'
import { MuscleBodyDiagram } from '@/components/musclebodydiagram'

type MuscleGroup = {
  id: string
  name: string
  allows_frequent_repeat: boolean
  sort_order: number
}

type WorkoutItem = {
  id: string
  name: string
  estimated_duration_min: number
  estimated_kcal: number | null
  default_sets: number
  muscle_group_id: string
  muscle_groups: { id: string; name: string } | null
}

type RecentSession = {
  id: string
  scheduled_date: string
  status: string
  session_workouts: {
    workout_id: string
    workouts: { muscle_group_id: string } | null
  }[]
}

type Props = {
  todayStr: string
  initialDate: string
  muscleGroups: MuscleGroup[]
  workouts: WorkoutItem[]
  recentSessions: RecentSession[]
}

export function PlanWorkoutClient({
  todayStr,
  initialDate,
  muscleGroups,
  workouts,
  recentSessions,
}: Props) {
  const router = useRouter()
  const [mode, setMode] = useState<'auto' | 'manual'>('auto')

  // Automatisch plannen state
  const [autoDate, setAutoDate] = useState<string>(initialDate)

  // Zelf samenstellen state
  const [manualDate, setManualDate] = useState<string>(initialDate)
  const [selectedMuscleId, setSelectedMuscleId] = useState<string>(
    muscleGroups[0]?.id ?? ''
  )
  const [selectedWorkoutIds, setSelectedWorkoutIds] = useState<string[]>([])

  const [saving, setSaving] = useState<boolean>(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const autoSuggestion = useMemo(() => {
    const plannerSessions = recentSessions.map((s) => ({
      id: s.id,
      scheduled_date: s.scheduled_date,
      status: s.status,
      session_workouts: (s.session_workouts ?? []).map((sw) => ({
        workout_id: sw.workout_id,
        workouts: sw.workouts?.muscle_group_id
          ? { id: sw.workout_id, muscle_group_id: sw.workouts.muscle_group_id }
          : null,
      })),
    }))

    return generateAutoPlan({
      todayStr,
      muscleGroups,
      workouts,
      sessions: plannerSessions,
    })
  }, [todayStr, muscleGroups, workouts, recentSessions])

  const autoWorkouts = useMemo(() => {
    return autoSuggestion.workouts
      .map((aw) => workouts.find((w) => w.id === aw.id))
      .filter((w): w is WorkoutItem => Boolean(w))
  }, [autoSuggestion, workouts])

  const autoWorkoutIds = useMemo(
    () => autoWorkouts.map((w) => w.id),
    [autoWorkouts]
  )

  const autoTotalMinutes = useMemo(
    () =>
      autoWorkouts.reduce(
        (sum, w) => sum + (w.estimated_duration_min ?? 0),
        0
      ),
    [autoWorkouts]
  )

  const activeMuscleGroupName = useMemo(() => {
    if (mode === 'auto') {
      return autoWorkouts[0]?.muscle_groups?.name ?? null
    }
    return muscleGroups.find((m) => m.id === selectedMuscleId)?.name ?? null
  }, [mode, autoWorkouts, muscleGroups, selectedMuscleId])

  const filteredWorkouts = useMemo(() => {
    if (!selectedMuscleId) return workouts
    return workouts.filter((w) => w.muscle_group_id === selectedMuscleId)
  }, [workouts, selectedMuscleId])

  const manualTotalMinutes = useMemo(() => {
    return selectedWorkoutIds.reduce((sum, id) => {
      const found = workouts.find((w) => w.id === id)
      return sum + (found?.estimated_duration_min ?? 0)
    }, 0)
  }, [selectedWorkoutIds, workouts])

  function toggleWorkout(workoutId: string) {
    setSelectedWorkoutIds((prev) =>
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
    if (!scheduledDate || workoutIds.length === 0) return

    setSaving(true)
    setErrorMsg(null)

    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setSaving(false)
      setErrorMsg('je bent niet ingelogd.')
      return
    }

    const totalDuration = workoutIds.reduce((sum, id) => {
      const w = workouts.find((item) => item.id === id)
      return sum + (w?.estimated_duration_min ?? 0)
    }, 0)

    const { data: createdSession, error: sessionError } = await supabase
      .from('training_sessions')
      .insert({
        user_id: user.id,
        scheduled_date: scheduledDate,
        status: 'planned',
        source,
        total_duration_min: totalDuration,
      })
      .select('id')
      .single()

    if (sessionError || !createdSession) {
      setSaving(false)
      setErrorMsg(sessionError?.message ?? 'kon trainingssessie niet opslaan.')
      return
    }

    const rows = workoutIds.map((workoutId, index) => ({
      user_id: user.id,
      session_id: createdSession.id,
      workout_id: workoutId,
      sort_order: index + 1,
      is_completed: false,
    }))

    const { error: swError } = await supabase
      .from('session_workouts')
      .insert(rows)

    setSaving(false)

    if (swError) {
      setErrorMsg(swError.message)
      return
    }

    router.push('/dashboard/week')
    router.refresh()
  }

  return (
    <div className="space-y-5">
      {/* Modus-schakelaar */}
      <div className="grid grid-cols-2 gap-2.5 rounded-3xl border border-zinc-800 bg-zinc-900 p-2">
        <button
          type="button"
          onClick={() => setMode('auto')}
          className={`flex min-h-12 items-center justify-center gap-2 rounded-2xl text-sm font-bold transition-all ${
            mode === 'auto'
              ? 'bg-emerald-500 text-zinc-950 shadow'
              : 'text-zinc-300 hover:bg-zinc-800'
          }`}
        >
          <Sparkles className="h-4 w-4" />
          <span>automatisch</span>
        </button>

        <button
          type="button"
          onClick={() => setMode('manual')}
          className={`flex min-h-12 items-center justify-center gap-2 rounded-2xl text-sm font-bold transition-all ${
            mode === 'manual'
              ? 'bg-emerald-500 text-zinc-950 shadow'
              : 'text-zinc-300 hover:bg-zinc-800'
          }`}
        >
          <SlidersHorizontal className="h-4 w-4" />
          <span>zelf samenstellen</span>
        </button>
      </div>

      {errorMsg && (
        <div className="rounded-2xl border border-red-500/40 bg-red-950/40 px-4 py-3 text-sm font-medium text-red-200">
          {errorMsg}
        </div>
      )}

      {mode === 'auto' ? (
        <section className="space-y-5 rounded-3xl border border-zinc-800 bg-zinc-900 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-white">
                slim voorstel op basis van je historie
              </h2>
              <p className="mt-0.5 text-sm text-zinc-400">
                maximaal 75 minuten • gericht op spiergroepen die het langst geleden zijn getraind.
              </p>
            </div>
            <MuscleBodyDiagram activeMuscleGroup={activeMuscleGroupName} compact />
          </div>

          <label className="block space-y-1.5">
            <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-zinc-400">
              <Calendar className="h-3.5 w-3.5 text-emerald-400" />
              <span>datum</span>
            </span>
            <input
              type="date"
              value={autoDate}
              onChange={(e) => setAutoDate(e.target.value)}
              className="min-h-12 w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 text-sm font-semibold text-white tabular-nums focus:border-emerald-400 focus:outline-none"
            />
          </label>

          <div className="space-y-2.5">
            {autoWorkouts.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/60 p-4 text-sm text-zinc-400">
                geen workouts beschikbaar om automatisch een voorstel te maken.
              </p>
            ) : (
              autoWorkouts.map((w) => (
                <div
                  key={w.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-bold text-white">{w.name}</p>
                    <p className="text-xs text-emerald-400">
                      {w.muscle_groups?.name ?? 'spiergroep'}
                    </p>
                  </div>
                  <span className="rounded-xl bg-zinc-900 px-3 py-1.5 text-xs font-bold text-zinc-200 tabular-nums">
                    {w.estimated_duration_min} min
                  </span>
                </div>
              ))
            )}
          </div>

          <div className="flex items-center justify-between border-t border-zinc-800 pt-4 text-sm">
            <span className="text-zinc-400">geschatte totale duur</span>
            <span
              className={`font-extrabold tabular-nums ${
                autoTotalMinutes > 75 ? 'text-red-400' : 'text-emerald-400'
              }`}
            >
              {autoTotalMinutes} / 75 min
            </span>
          </div>

          <button
            type="button"
            disabled={
              saving ||
              !autoDate ||
              autoWorkoutIds.length === 0 ||
              autoTotalMinutes > 75
            }
            onClick={() => void saveSession(autoDate, autoWorkoutIds, 'auto_planned')}
            className="min-h-12 w-full rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-extrabold text-zinc-950 transition-all active:scale-[0.99] hover:bg-emerald-400 disabled:opacity-40"
          >
            {saving ? 'training inplannen...' : 'training inplannen'}
          </button>
        </section>
      ) : (
        <section className="space-y-5 rounded-3xl border border-zinc-800 bg-zinc-900 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-white">
                zelf training samenstellen
              </h2>
              <p className="mt-0.5 text-sm text-zinc-400">
                kies een datum, spiergroep en één of meerdere workouts.
              </p>
            </div>
            <MuscleBodyDiagram activeMuscleGroup={activeMuscleGroupName} compact />
          </div>

          <label className="block space-y-1.5">
            <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-zinc-400">
              <Calendar className="h-3.5 w-3.5 text-emerald-400" />
              <span>datum</span>
            </span>
            <input
              type="date"
              value={manualDate}
              onChange={(e) => setManualDate(e.target.value)}
              className="min-h-12 w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 text-sm font-semibold text-white tabular-nums focus:border-emerald-400 focus:outline-none"
            />
          </label>

          {/* Spiergroepen selecteren */}
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              1. kies spiergroep
            </p>
            <div className="flex flex-wrap gap-2">
              {muscleGroups.map((mg) => {
                const active = mg.id === selectedMuscleId
                return (
                  <button
                    key={mg.id}
                    type="button"
                    onClick={() => setSelectedMuscleId(mg.id)}
                    className={`min-h-11 rounded-2xl border px-4 py-2 text-xs font-bold transition-all ${
                      active
                        ? 'border-emerald-400 bg-emerald-500 text-zinc-950'
                        : 'border-zinc-700 bg-zinc-950 text-zinc-200 hover:border-zinc-600'
                    }`}
                  >
                    {mg.name}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Workouts binnen gekozen spiergroep */}
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              2. selecteer workouts ({selectedWorkoutIds.length} gekozen)
            </p>
            <div className="space-y-2">
              {filteredWorkouts.map((w) => {
                const checked = selectedWorkoutIds.includes(w.id)
                return (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => toggleWorkout(w.id)}
                    className={`flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition-all ${
                      checked
                        ? 'border-emerald-400 bg-emerald-950/40 text-white'
                        : 'border-zinc-800 bg-zinc-950 text-zinc-200 hover:border-zinc-700'
                    }`}
                  >
                    <span className="text-sm font-bold">{w.name}</span>
                    <span className="rounded-xl bg-zinc-900 px-3 py-1 text-xs font-semibold text-emerald-400 tabular-nums">
                      {checked ? '✓ ' : ''}
                      {w.estimated_duration_min} min
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-zinc-800 pt-4 text-sm">
            <span className="text-zinc-400">geselecteerde duur</span>
            <span className="font-extrabold text-emerald-400 tabular-nums">
              {manualTotalMinutes} min
            </span>
          </div>

          <button
            type="button"
            disabled={saving || !manualDate || selectedWorkoutIds.length === 0}
            onClick={() => void saveSession(manualDate, selectedWorkoutIds, 'manual')}
            className="min-h-12 w-full rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-extrabold text-zinc-950 transition-all active:scale-[0.99] hover:bg-emerald-400 disabled:opacity-40"
          >
            {saving ? 'opslaan...' : 'training opslaan'}
          </button>
        </section>
      )}
    </div>
  )
}