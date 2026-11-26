'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { generateAutoPlan } from '@/lib/autoplanner'

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

  const filteredWorkouts = useMemo(() => {
    if (!selectedMuscleId) return workouts
    return workouts.filter((w) => w.muscle_group_id === selectedMuscleId)
  }, [workouts, selectedMuscleId])

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
    if (!scheduledDate || workoutIds.length === 0 || saving) return

    setSaving(true)
    setErrorMsg(null)

    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setSaving(false)
      setErrorMsg('JE BENT NIET INGELOGD.')
      return
    }

    const totalDuration = workoutIds.reduce((sum, id) => {
      const w = workouts.find((item) => item.id === id)
      return sum + (w?.estimated_duration_min ?? 0)
    }, 0)

    const { data: existingSession, error: existingErr } = await supabase
      .from('training_sessions')
      .select('id, total_duration_min')
      .eq('user_id', user.id)
      .eq('scheduled_date', scheduledDate)
      .maybeSingle()

    if (existingErr) {
      setSaving(false)
      setErrorMsg(existingErr.message)
      return
    }

    let sessionId: string
    let startSortOrder = 1

    if (existingSession) {
      sessionId = existingSession.id
      const updatedDuration =
        (existingSession.total_duration_min ?? 0) + totalDuration

      const { error: updateErr } = await supabase
        .from('training_sessions')
        .update({ total_duration_min: updatedDuration })
        .eq('id', sessionId)

      if (updateErr) {
        setSaving(false)
        setErrorMsg(updateErr.message)
        return
      }

      const { data: existingSw } = await supabase
        .from('session_workouts')
        .select('sort_order')
        .eq('training_session_id', sessionId)
        .order('sort_order', { ascending: false })
        .limit(1)

      const maxSort = existingSw?.[0]?.sort_order ?? 0
      startSortOrder = maxSort + 1
    } else {
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
        setErrorMsg(sessionError?.message ?? 'OPSLAAN MISLUKT.')
        return
      }

      sessionId = createdSession.id
    }

    const rows = workoutIds.map((workoutId, index) => ({
      user_id: user.id,
      training_session_id: sessionId,
      workout_id: workoutId,
      sort_order: startSortOrder + index,
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

    router.push(`/dashboard/training?date=${scheduledDate}`)
    router.refresh()
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setMode('auto')}
          className={`flex min-h-16 items-center justify-center rounded-3xl px-4 py-4 text-lg font-black tracking-wide text-white transition-colors sm:text-xl ${
            mode === 'auto'
              ? 'border-2 border-white bg-zinc-800'
              : 'border border-zinc-800 bg-zinc-900 hover:border-zinc-600'
          }`}
        >
          AUTOMATISCH
        </button>

        <button
          type="button"
          onClick={() => setMode('manual')}
          className={`flex min-h-16 items-center justify-center rounded-3xl px-4 py-4 text-lg font-black tracking-wide text-white transition-colors sm:text-xl ${
            mode === 'manual'
              ? 'border-2 border-white bg-zinc-800'
              : 'border border-zinc-800 bg-zinc-900 hover:border-zinc-600'
          }`}
        >
          HANDMATIG
        </button>
      </div>

      {errorMsg && (
        <div className="rounded-3xl border border-rose-500/50 bg-zinc-900 px-5 py-4 text-base font-black tracking-wide text-white">
          {errorMsg}
        </div>
      )}

      {mode === 'auto' ? (
        <div className="space-y-3.5">
          {autoWorkouts.length === 0 ? (
            <div className="rounded-3xl border border-zinc-800 bg-zinc-900 px-6 py-5 text-xl font-black tracking-wide text-white">
              GEEN WORKOUTS BESCHIKBAAR
            </div>
          ) : (
            autoWorkouts.map((w) => (
              <div
                key={w.id}
                className="flex min-h-20 w-full items-center rounded-3xl border border-zinc-800 bg-zinc-900 px-6 py-4 text-xl font-black tracking-wide text-white sm:text-2xl"
              >
                <span>{w.name.toUpperCase()}</span>
              </div>
            ))
          )}

          <button
            type="button"
            disabled={saving || autoWorkoutIds.length === 0}
            onClick={() =>
              void saveSession(initialDate, autoWorkoutIds, 'auto_planned')
            }
            className="flex min-h-20 w-full items-center justify-center rounded-3xl border-2 border-white bg-zinc-900 px-6 py-5 text-xl font-black tracking-wide text-white transition-colors hover:bg-zinc-800 disabled:opacity-40 sm:text-2xl"
          >
            <span>{saving ? 'OPSLAAN...' : 'TRAINING VASTLEGGEN'}</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2.5">
            {muscleGroups.map((mg) => {
              const active = mg.id === selectedMuscleId
              return (
                <button
                  key={mg.id}
                  type="button"
                  onClick={() => setSelectedMuscleId(mg.id)}
                  className={`rounded-2xl px-4 py-3 text-base font-black tracking-wide text-white transition-colors ${
                    active
                      ? 'border-2 border-white bg-zinc-800'
                      : 'border border-zinc-800 bg-zinc-900 hover:border-zinc-600'
                  }`}
                >
                  {mg.name.toUpperCase()}
                </button>
              )
            })}
          </div>

          <div className="space-y-3.5">
            {filteredWorkouts.map((w) => {
              const checked = selectedWorkoutIds.includes(w.id)
              return (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => toggleWorkout(w.id)}
                  className={`flex min-h-20 w-full items-center rounded-3xl px-6 py-4 text-left text-xl font-black tracking-wide text-white transition-colors sm:text-2xl ${
                    checked
                      ? 'border-2 border-white bg-zinc-800'
                      : 'border border-zinc-800 bg-zinc-900 hover:border-zinc-600'
                  }`}
                >
                  <span>{w.name.toUpperCase()}</span>
                </button>
              )
            })}
          </div>

          <button
            type="button"
            disabled={saving || selectedWorkoutIds.length === 0}
            onClick={() =>
              void saveSession(initialDate, selectedWorkoutIds, 'manual')
            }
            className="flex min-h-20 w-full items-center justify-center rounded-3xl border-2 border-white bg-zinc-900 px-6 py-5 text-xl font-black tracking-wide text-white transition-colors hover:bg-zinc-800 disabled:opacity-40 sm:text-2xl"
          >
            <span>{saving ? 'OPSLAAN...' : 'TRAINING VASTLEGGEN'}</span>
          </button>
        </div>
      )}
    </div>
  )
}