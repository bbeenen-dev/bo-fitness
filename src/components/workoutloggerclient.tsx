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
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 sm:p-6">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">
            {muscleGroupName}
          </span>
          <span className="rounded-full border border-zinc-700 bg-zinc-800 px-3 py-0.5 text-xs font-medium text-zinc-300 tabular-nums">
            {totalSets} sets
          </span>
        </div>

        <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-white">
          {workoutName}
        </h1>

        {/* Timer & Start / Gereed-knoppen */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-zinc-800 bg-zinc-950 p-4">
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleStart}
              disabled={Boolean(startedAt && !endedAt)}
              className="rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 transition-colors hover:bg-emerald-400 disabled:opacity-40"
            >
              {startedAt ? 'gestart' : 'start'}
            </button>

            <button
              type="button"
              onClick={handleStop}
              disabled={!startedAt || Boolean(endedAt)}
              className="rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-700 disabled:opacity-35"
            >
              gereed / stop
            </button>
          </div>

          <div className="text-right">
            <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
              klok
            </p>
            <p className="font-mono text-xl font-bold text-emerald-400 tabular-nums">
              {formatDuration(elapsedSeconds)}
            </p>
          </div>
        </div>

        {/* Sets met grijze prefill */}
        <div className="mt-6 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              setregistratie
            </h2>
            {previousSets.length > 0 && (
              <button
                type="button"
                onClick={applyPrefillToAll}
                className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 hover:underline"
              >
                vorige waarden invullen
              </button>
            )}
          </div>

          <div className="space-y-2.5">
            {rows.map((row, idx) => (
              <div
                key={row.set_number}
                className="grid grid-cols-12 items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950/80 p-3.5"
              >
                <div className="col-span-3 flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-800 text-xs font-bold text-zinc-200 tabular-nums">
                    {row.set_number}
                  </span>
                  <span className="text-xs font-medium text-zinc-400">set</span>
                </div>

                <div className="col-span-5">
                  <label className="block text-[11px] font-medium text-zinc-400">
                    gewicht (kg)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    inputMode="decimal"
                    value={row.weight_kg}
                    placeholder={row.prefillWeight || '0'}
                    onChange={(e) => updateRow(idx, 'weight_kg', e.target.value)}
                    className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm font-semibold text-white tabular-nums placeholder:font-normal placeholder:text-zinc-500 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="col-span-4">
                  <label className="block text-[11px] font-medium text-zinc-400">
                    herhalingen
                  </label>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={row.reps}
                    placeholder={row.prefillReps || '0'}
                    onChange={(e) => updateRow(idx, 'reps', e.target.value)}
                    className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm font-semibold text-white tabular-nums placeholder:font-normal placeholder:text-zinc-500 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>
            ))}
          </div>

          <p className="text-xs text-zinc-500">
            grijze waarden tonen je vorige keer; leeg gelaten velden nemen die waarde automatisch over bij opslaan.
          </p>
        </div>

        {/* Ervaren zwaarte */}
        <div className="mt-6">
          <h2 className="mb-2.5 text-xs font-bold uppercase tracking-wider text-zinc-400">
            ervaren zwaarte
          </h2>
          <div className="grid grid-cols-3 gap-2.5">
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
                className={`rounded-xl border py-2.5 text-sm font-semibold transition-colors ${
                  effort === opt.value
                    ? 'border-emerald-500 bg-emerald-500 text-zinc-950'
                    : 'border-zinc-700 bg-zinc-950 text-zinc-300 hover:border-zinc-600 hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {errorMsg && (
          <div className="mt-4 rounded-xl border border-red-500/40 bg-red-950/40 px-4 py-3 text-sm text-red-300">
            {errorMsg}
          </div>
        )}

        {/* Opslaan & terug */}
        <div className="mt-7 flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="flex-1 rounded-xl bg-emerald-500 px-6 py-3 text-sm font-bold text-zinc-950 transition-colors hover:bg-emerald-400 disabled:opacity-50 sm:flex-none"
          >
            {saving ? 'opslaan...' : 'opslaan'}
          </button>

          <button
            type="button"
            onClick={() => router.push('/dashboard/volgende')}
            className="rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm font-semibold text-zinc-300 transition-colors hover:bg-zinc-700 hover:text-white"
          >
            annuleren
          </button>
        </div>
      </div>
    </div>
  )
}