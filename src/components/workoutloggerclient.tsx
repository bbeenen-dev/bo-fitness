'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type SetPrefill = {
  set_number: number
  weight_kg: number | null
  reps: number | null
}

type SetInputRow = {
  set_number: number
  weight_kg: string
  reps: string
  prefillWeight: string
  prefillReps: string
}

type Props = {
  userId: string
  sessionWorkoutId: string
  trainingSessionId: string
  workoutName: string
  muscleGroupName: string
  defaultSets: number
  initialStartedAt: string | null
  initialEndedAt: string | null
  initialEffort: 'light' | 'neutral' | 'heavy' | null
  existingSets: SetPrefill[]
  previousSets: SetPrefill[]
}

export function WorkoutLoggerClient({
  userId,
  sessionWorkoutId,
  trainingSessionId,
  workoutName,
  muscleGroupName,
  defaultSets,
  initialStartedAt,
  initialEndedAt,
  initialEffort,
  existingSets,
  previousSets,
}: Props) {
  const router = useRouter()
  const [startedAt, setStartedAt] = useState<string | null>(initialStartedAt)
  const [endedAt, setEndedAt] = useState<string | null>(initialEndedAt)
  const [effort, setEffort] = useState<'light' | 'neutral' | 'heavy'>(
    initialEffort ?? 'neutral'
  )
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0)

  const totalSets = Math.max(defaultSets || 3, 3)

  const [rows, setRows] = useState<SetInputRow[]>(() =>
    Array.from({ length: totalSets }, (_, idx) => {
      const setNum = idx + 1
      const current = existingSets.find((s) => s.set_number === setNum)
      const prev = previousSets.find((s) => s.set_number === setNum)

      return {
        set_number: setNum,
        weight_kg: current?.weight_kg != null ? String(current.weight_kg) : '',
        reps: current?.reps != null ? String(current.reps) : '',
        prefillWeight: prev?.weight_kg != null ? String(prev.weight_kg) : '',
        prefillReps: prev?.reps != null ? String(prev.reps) : '',
      }
    })
  )

  useEffect(() => {
    if (!startedAt) {
      setElapsedSeconds(0)
      return
    }
    const startMs = new Date(startedAt).getTime()
    if (endedAt) {
      const endMs = new Date(endedAt).getTime()
      setElapsedSeconds(Math.max(0, Math.floor((endMs - startMs) / 1000)))
      return
    }

    const update = () => {
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - startMs) / 1000)))
    }
    update()
    const timer = setInterval(update, 1000)
    return () => clearInterval(timer)
  }, [startedAt, endedAt])

  function formatDuration(sec: number) {
    const mins = Math.floor(sec / 60)
    const rem = sec % 60
    return `${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`
  }

  async function handleStart() {
    const now = new Date().toISOString()
    setStartedAt(now)
    setEndedAt(null)
    const supabase = createClient()
    await supabase
      .from('session_workouts')
      .update({ started_at: now, ended_at: null })
      .eq('id', sessionWorkoutId)
  }

  async function handleStop() {
    const now = new Date().toISOString()
    setEndedAt(now)
    const supabase = createClient()
    await supabase
      .from('session_workouts')
      .update({ ended_at: now })
      .eq('id', sessionWorkoutId)
  }

  function updateRow(index: number, field: 'weight_kg' | 'reps', value: string) {
    setRows((prev) =>
      prev.map((r, i) => (i === index ? { ...r, [field]: value } : r))
    )
  }

  function applyPrefillToAll() {
    setRows((prev) =>
      prev.map((r) => ({
        ...r,
        weight_kg: r.weight_kg || r.prefillWeight,
        reps: r.reps || r.prefillReps,
      }))
    )
  }

  async function handleSave() {
    setErrorMsg(null)
    setSaving(true)
    const supabase = createClient()

    const now = new Date().toISOString()
    const finalStart = startedAt ?? now
    const finalEnd = endedAt ?? now

    // 1. Verwijder eventuele eerdere sets van deze session_workout en schrijf de nieuwe 3 sets weg
    await supabase
      .from('workout_sets')
      .delete()
      .eq('session_workout_id', sessionWorkoutId)

    const setsPayload = rows.map((r) => {
      const rawWeight = r.weight_kg !== '' ? r.weight_kg : r.prefillWeight
      const rawReps = r.reps !== '' ? r.reps : r.prefillReps
      return {
        session_workout_id: sessionWorkoutId,
        user_id: userId,
        set_number: r.set_number,
        weight_kg: rawWeight !== '' ? Number(rawWeight) : 0,
        reps: rawReps !== '' ? Number(rawReps) : 0,
        completed_at: finalEnd,
      }
    })

    const { error: setsErr } = await supabase.from('workout_sets').insert(setsPayload)
    if (setsErr) {
      setSaving(false)
      setErrorMsg(setsErr.message)
      return
    }

    // 2. Markeer deze workout als afgerond (groen in het overzicht)
    const { error: swErr } = await supabase
      .from('session_workouts')
      .update({
        started_at: finalStart,
        ended_at: finalEnd,
        perceived_effort: effort,
        is_completed: true,
      })
      .eq('id', sessionWorkoutId)

    if (swErr) {
      setSaving(false)
      setErrorMsg(swErr.message)
      return
    }

    // 3. Check of alle workouts van deze trainingssessie nu zijn afgerond
    const { data: siblingWorkouts } = await supabase
      .from('session_workouts')
      .select('is_completed')
      .eq('training_session_id', trainingSessionId)

    const allDone =
      siblingWorkouts &&
      siblingWorkouts.length > 0 &&
      siblingWorkouts.every((sw) => sw.is_completed)

    if (allDone) {
      await supabase
        .from('training_sessions')
        .update({ status: 'completed' })
        .eq('id', trainingSessionId)
    }

    setSaving(false)
    router.push('/dashboard/volgende')
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-neutral-200 bg-white p-6">
        <span className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
          {muscleGroupName}
        </span>
        <h1 className="mt-1 text-2xl font-bold">{workoutName}</h1>

        {/* Start / Gereed-knoppen en timer */}
        <div className="mt-5 flex flex-wrap items-center gap-3 rounded-lg bg-neutral-50 p-4">
          <button
            type="button"
            onClick={handleStart}
            disabled={Boolean(startedAt && !endedAt)}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {startedAt ? 'gestart' : 'start'}
          </button>

          <button
            type="button"
            onClick={handleStop}
            disabled={!startedAt || Boolean(endedAt)}
            className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-40"
          >
            gereed / stop
          </button>

          <div className="ml-auto text-right">
            <p className="text-xs text-neutral-500">tijd</p>
            <p className="font-mono text-lg font-semibold text-neutral-900">
              {formatDuration(elapsedSeconds)}
            </p>
          </div>
        </div>

        {/* 3 sets met grijze prefill */}
        <div className="mt-6 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-neutral-800">sets (3 sets)</h2>
            {previousSets.length > 0 && (
              <button
                type="button"
                onClick={applyPrefillToAll}
                className="text-xs font-medium text-emerald-700 hover:underline"
              >
                vorige waarden overnemen
              </button>
            )}
          </div>

          <div className="space-y-2.5">
            {rows.map((row, idx) => (
              <div
                key={row.set_number}
                className="grid grid-cols-12 items-center gap-3 rounded-lg border border-neutral-200 p-3"
              >
                <span className="col-span-3 text-sm font-medium text-neutral-700">
                  set {row.set_number}
                </span>

                <div className="col-span-5">
                  <label className="block text-[11px] text-neutral-500">gewicht (kg)</label>
                  <input
                    type="number"
                    step="0.5"
                    inputMode="decimal"
                    value={row.weight_kg}
                    placeholder={row.prefillWeight || '0'}
                    onChange={(e) => updateRow(idx, 'weight_kg', e.target.value)}
                    className="mt-0.5 w-full rounded-md border border-neutral-300 px-2.5 py-1.5 text-sm placeholder:text-neutral-400"
                  />
                </div>

                <div className="col-span-4">
                  <label className="block text-[11px] text-neutral-500">herhalingen</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={row.reps}
                    placeholder={row.prefillReps || '0'}
                    onChange={(e) => updateRow(idx, 'reps', e.target.value)}
                    className="mt-0.5 w-full rounded-md border border-neutral-300 px-2.5 py-1.5 text-sm placeholder:text-neutral-400"
                  />
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-neutral-400">
            grijze waarden tonen je vorige keer; als je ze niet wijzigt worden deze bij opslaan overgenomen.
          </p>
        </div>

        {/* Moeilijkheidsgraad: Licht / Neutraal / Zwaar */}
        <div className="mt-6">
          <h2 className="mb-2 text-sm font-semibold text-neutral-800">hoe zwaar voelde het?</h2>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { value: 'light', label: 'licht' },
                { value: 'neutral', label: 'neutraal' },
                { value: 'heavy', label: 'zwaar' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setEffort(opt.value)}
                className={`rounded-lg border py-2.5 text-sm font-medium transition-colors ${
                  effort === opt.value
                    ? 'border-emerald-600 bg-emerald-600 text-white'
                    : 'border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {errorMsg && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
            {errorMsg}
          </div>
        )}

        {/* Opslaan & terug naar trainingsoverzicht */}
        <div className="mt-6 flex items-center gap-3">
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {saving ? 'opslaan...' : 'opslaan'}
          </button>

          <button
            type="button"
            onClick={() => router.push('/dashboard/volgende')}
            className="rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            annuleren
          </button>
        </div>
      </div>
    </div>
  )
}