import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase/server'

type LoggedSetRow = {
  id: string
  set_number: number
  weight_kg: number | null
  reps: number | null
  completed_at: string | null
  session_workouts: {
    id: string
    training_sessions: {
      id: string
      scheduled_date: string
      status: string
    } | null
    workouts: {
      id: string
      name: string
      muscle_groups: {
        id: string
        name: string
        sort_order: number
      } | null
    } | null
  } | null
}

function getIsoWeekKey(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  const dayNum = dt.getUTCDay() || 7
  dt.setUTCDate(dt.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(dt.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil(((dt.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `${dt.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`
}

export default async function DashboardStatsPage() {
  const supabase = await createServerSupabase()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const [{ data: rawSets }, { data: completedSessions }, { data: muscleGroups }] =
    await Promise.all([
      supabase
        .from('workout_sets')
        .select(
          `
          id,
          set_number,
          weight_kg,
          reps,
          completed_at,
          session_workouts (
            id,
            training_sessions (
              id,
              scheduled_date,
              status
            ),
            workouts (
              id,
              name,
              muscle_groups (
                id,
                name,
                sort_order
              )
            )
          )
        `
        )
        .order('completed_at', { ascending: false })
        .limit(300),
      supabase
        .from('training_sessions')
        .select('id, scheduled_date, status')
        .eq('status', 'completed')
        .order('scheduled_date', { ascending: false }),
      supabase
        .from('muscle_groups')
        .select('id, name, sort_order')
        .order('sort_order', { ascending: true }),
    ])

  const sets = (rawSets ?? []) as unknown as LoggedSetRow[]
  const completedCount = completedSessions?.length ?? 0

  let totalVolumeKg = 0
  let totalReps = 0

  const volumeByMuscle = new Map<string, { name: string; volumeKg: number; setsCount: number }>()
  for (const mg of muscleGroups ?? []) {
    volumeByMuscle.set(mg.id, {
      name: mg.name,
      volumeKg: 0,
      setsCount: 0,
    })
  }

  const volumeByWeek = new Map<string, number>()

  for (const row of sets) {
    const w = Number(row.weight_kg ?? 0)
    const r = Number(row.reps ?? 0)
    const vol = w * r

    totalVolumeKg += vol
    totalReps += r

    const mg = row.session_workouts?.workouts?.muscle_groups
    if (mg) {
      const current = volumeByMuscle.get(mg.id) ?? {
        name: mg.name,
        volumeKg: 0,
        setsCount: 0,
      }
      current.volumeKg += vol
      current.setsCount += 1
      volumeByMuscle.set(mg.id, current)
    }

    const sessionDate =
      row.session_workouts?.training_sessions?.scheduled_date ??
      row.completed_at?.slice(0, 10)

    if (sessionDate) {
      const weekKey = getIsoWeekKey(sessionDate)
      volumeByWeek.set(weekKey, (volumeByWeek.get(weekKey) ?? 0) + vol)
    }
  }

  const muscleStats = Array.from(volumeByMuscle.values()).sort(
    (a, b) => b.volumeKg - a.volumeKg
  )
  const maxMuscleVolume = Math.max(1, ...muscleStats.map((m) => m.volumeKg))

  const weekStats = Array.from(volumeByWeek.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-6)
  const maxWeekVolume = Math.max(1, ...weekStats.map(([, v]) => v))

  const avgVolumePerSession =
    completedCount > 0 ? Math.round(totalVolumeKg / completedCount) : 0

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-5 sm:p-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400">
            prestatie-overzicht
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-white">
            statistieken &amp; progressie
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            inzicht in je verplaatste kilo&apos;s, spiergroepbalans en wekelijkse voortgang.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/dashboard/volgende"
            className="rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-xs font-semibold text-zinc-200 transition-colors hover:border-zinc-600 hover:bg-zinc-700"
          >
            volgende training
          </Link>
          <Link
            href="/dashboard/plannen"
            className="rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-bold text-zinc-950 transition-colors hover:bg-emerald-400"
          >
            + training plannen
          </Link>
        </div>
      </div>

      {/* KPI-kaarten */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">
            totaal volume
          </p>
          <p className="mt-2 text-2xl font-extrabold text-white tabular-nums">
            {Math.round(totalVolumeKg).toLocaleString('nl-NL')}{' '}
            <span className="text-sm font-semibold text-emerald-400">kg</span>
          </p>
          <p className="mt-1 text-xs text-zinc-500 tabular-nums">
            over {totalReps.toLocaleString('nl-NL')} herhalingen
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">
            voltooide sessies
          </p>
          <p className="mt-2 text-2xl font-extrabold text-white tabular-nums">
            {completedCount}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            afgeronde trainingsdagen
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">
            gem. per sessie
          </p>
          <p className="mt-2 text-2xl font-extrabold text-emerald-400 tabular-nums">
            {avgVolumePerSession.toLocaleString('nl-NL')}{' '}
            <span className="text-xs font-semibold text-zinc-400">kg</span>
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            gemiddeld verplaatst gewicht
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">
            gelogde sets
          </p>
          <p className="mt-2 text-2xl font-extrabold text-white tabular-nums">
            {sets.length}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            geregistreerde werksets
          </p>
        </div>
      </div>

      {/* Volume per spiergroep & Wekelijkse progressie */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Volume per spiergroep */}
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white">volume per spiergroep</h2>
              <p className="text-xs text-zinc-400">
                totaal verplaatste kilo&apos;s per spiergroep
              </p>
            </div>
          </div>

          {muscleStats.length === 0 ? (
            <p className="rounded-xl border border-dashed border-zinc-800 bg-zinc-950/60 p-6 text-center text-sm text-zinc-500">
              nog geen setdata beschikbaar om per spiergroep te tonen.
            </p>
          ) : (
            <div className="space-y-3.5">
              {muscleStats.map((mg) => {
                const pct = Math.round((mg.volumeKg / maxMuscleVolume) * 100)
                return (
                  <div key={mg.name} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-zinc-200">{mg.name}</span>
                      <span className="font-bold text-emerald-400 tabular-nums">
                        {Math.round(mg.volumeKg).toLocaleString('nl-NL')} kg{' '}
                        <span className="font-normal text-zinc-500">
                          ({mg.setsCount} sets)
                        </span>
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* Progressie per week */}
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 sm:p-6">
          <div className="mb-4">
            <h2 className="text-base font-bold text-white">progressie per week</h2>
            <p className="text-xs text-zinc-400">
              wekelijks trainingsvolume in kilogrammen
            </p>
          </div>

          {weekStats.length === 0 ? (
            <p className="rounded-xl border border-dashed border-zinc-800 bg-zinc-950/60 p-6 text-center text-sm text-zinc-500">
              nog geen wekelijkse historie beschikbaar.
            </p>
          ) : (
            <div className="space-y-3.5">
              {weekStats.map(([weekKey, vol]) => {
                const pct = Math.round((vol / maxWeekVolume) * 100)
                return (
                  <div key={weekKey} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-zinc-200 tabular-nums">
                        {weekKey}
                      </span>
                      <span className="font-bold text-white tabular-nums">
                        {Math.round(vol).toLocaleString('nl-NL')} kg
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
                      <div
                        className="h-full rounded-full bg-emerald-400 transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>

      {/* Recente geregistreerde sets */}
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 sm:p-6">
        <div className="mb-4">
          <h2 className="text-base font-bold text-white">recente werksets</h2>
          <p className="text-xs text-zinc-400">
            laatst opgeslagen gewichten en herhalingen
          </p>
        </div>

        {sets.length === 0 ? (
          <p className="rounded-xl border border-dashed border-zinc-800 bg-zinc-950/60 p-6 text-center text-sm text-zinc-500">
            start een workout via &ldquo;volgende training&rdquo; om je eerste sets te loggen.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-800 text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                  <th className="py-2.5 pr-4">workout</th>
                  <th className="py-2.5 px-3">spiergroep</th>
                  <th className="py-2.5 px-3">set</th>
                  <th className="py-2.5 px-3">gewicht</th>
                  <th className="py-2.5 px-3">reps</th>
                  <th className="py-2.5 pl-3 text-right">volume</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/70">
                {sets.slice(0, 10).map((row) => {
                  const w = Number(row.weight_kg ?? 0)
                  const r = Number(row.reps ?? 0)
                  return (
                    <tr key={row.id} className="text-zinc-200">
                      <td className="py-3 pr-4 font-semibold text-white">
                        {row.session_workouts?.workouts?.name ?? 'workout'}
                      </td>
                      <td className="py-3 px-3 text-emerald-400">
                        {row.session_workouts?.workouts?.muscle_groups?.name ?? '-'}
                      </td>
                      <td className="py-3 px-3 tabular-nums">#{row.set_number}</td>
                      <td className="py-3 px-3 font-semibold tabular-nums">{w} kg</td>
                      <td className="py-3 px-3 tabular-nums">{r}</td>
                      <td className="py-3 pl-3 text-right font-bold text-emerald-400 tabular-nums">
                        {Math.round(w * r).toLocaleString('nl-NL')} kg
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}