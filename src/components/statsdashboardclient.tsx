'use client'

import { useMemo, useState } from 'react'
import { DashboardStatsData } from '@/lib/stats'

const effortBadge: Record<
  'light' | 'neutral' | 'heavy',
  { label: string; className: string }
> = {
  light: {
    label: 'licht',
    className: 'bg-sky-100 text-sky-800',
  },
  neutral: {
    label: 'neutraal',
    className: 'bg-neutral-200 text-neutral-800',
  },
  heavy: {
    label: 'zwaar',
    className: 'bg-amber-100 text-amber-900',
  },
}

export function StatsDashboardClient({ stats }: { stats: DashboardStatsData }) {
  const defaultMuscleId = stats.muscleGroupTotals[0]?.muscleGroupId ?? ''
  const [selectedMuscleId, setSelectedMuscleId] = useState<string>(defaultMuscleId)
  const [metric, setMetric] = useState<'totalKg' | 'maxWeightKg'>('totalKg')

  const maxWeeklyKg = useMemo(
    () => Math.max(1, ...stats.weeklyVolume.map((w) => w.totalKg)),
    [stats.weeklyVolume]
  )

  const maxMuscleKg = useMemo(
    () => Math.max(1, ...stats.muscleGroupTotals.map((m) => m.totalKg)),
    [stats.muscleGroupTotals]
  )

  const activeMuscle = stats.muscleGroupTotals.find(
    (m) => m.muscleGroupId === selectedMuscleId
  )
  const progressionPoints = stats.progressionByMuscle[selectedMuscleId] ?? []

  // SVG-coördinaten voor de progressielijn
  const chartWidth = 640
  const chartHeight = 220
  const padLeft = 48
  const padRight = 24
  const padTop = 24
  const padBottom = 36
  const innerW = chartWidth - padLeft - padRight
  const innerH = chartHeight - padTop - padBottom

  const maxChartVal = Math.max(
    1,
    ...progressionPoints.map((p) => (metric === 'totalKg' ? p.totalKg : p.maxWeightKg))
  )

  const coords = progressionPoints.map((pt, idx) => {
    const val = metric === 'totalKg' ? pt.totalKg : pt.maxWeightKg
    const x =
      progressionPoints.length === 1
        ? padLeft + innerW / 2
        : padLeft + (idx / (progressionPoints.length - 1)) * innerW
    const y = padTop + innerH - (val / maxChartVal) * innerH
    return { x, y, val, pt }
  })

  const polylinePoints = coords.map((c) => `${c.x},${c.y}`).join(' ')

  return (
    <div className="space-y-6">
      {/* Samenvattingskaarten */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-neutral-200 bg-white p-5">
          <p className="text-xs font-medium text-neutral-500">totaal verplaatst volume</p>
          <p className="mt-1 text-2xl font-bold text-neutral-900">
            {stats.totalAllTimeKg.toLocaleString('nl-NL')} kg
          </p>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-5">
          <p className="text-xs font-medium text-neutral-500">trainingen met data</p>
          <p className="mt-1 text-2xl font-bold text-neutral-900">
            {stats.totalSessionsCount}
          </p>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-5">
          <p className="text-xs font-medium text-neutral-500">meest getrainde spiergroep</p>
          <p className="mt-1 text-2xl font-bold text-emerald-700">
            {stats.muscleGroupTotals[0]?.name ?? '—'}
          </p>
        </div>
      </div>

      {/* Rij 1: Kilo's per week + Kilo's per spiergroep */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Totaal getrainde kilo's per week */}
        <section className="rounded-xl border border-neutral-200 bg-white p-5">
          <h2 className="text-base font-semibold text-neutral-900">
            kilo&apos;s per week
          </h2>
          <p className="text-xs text-neutral-500">
            totaal volume (gewicht × herhalingen) per trainingsweek.
          </p>

          {stats.weeklyVolume.length === 0 ? (
            <p className="mt-6 text-sm text-neutral-400">nog geen set-data beschikbaar.</p>
          ) : (
            <div className="mt-5 space-y-3">
              {stats.weeklyVolume.map((w) => {
                const pct = Math.max(4, Math.round((w.totalKg / maxWeeklyKg) * 100))
                return (
                  <div key={w.weekStart} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-neutral-700">
                        {w.weekLabel}{' '}
                        <span className="text-neutral-400">({w.sessionCount}x)</span>
                      </span>
                      <span className="font-semibold text-neutral-900">
                        {w.totalKg.toLocaleString('nl-NL')} kg
                      </span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-neutral-100">
                      <div
                        className="h-full rounded-full bg-emerald-600 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* Totaal getrainde kilo's per spiergroep */}
        <section className="rounded-xl border border-neutral-200 bg-white p-5">
          <h2 className="text-base font-semibold text-neutral-900">
            kilo&apos;s per spiergroep
          </h2>
          <p className="text-xs text-neutral-500">
            opgebouwd volume over alle geregistreerde sets per spiergroep.
          </p>

          {stats.muscleGroupTotals.length === 0 ? (
            <p className="mt-6 text-sm text-neutral-400">nog geen spiergroep-data.</p>
          ) : (
            <div className="mt-5 space-y-3">
              {stats.muscleGroupTotals.map((m) => {
                const pct = Math.max(3, Math.round((m.totalKg / maxMuscleKg) * 100))
                return (
                  <div key={m.muscleGroupId} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <button
                        type="button"
                        onClick={() => setSelectedMuscleId(m.muscleGroupId)}
                        className="font-medium text-neutral-800 hover:text-emerald-700 hover:underline"
                      >
                        {m.name}{' '}
                        <span className="text-neutral-400">({m.setCount} sets)</span>
                      </button>
                      <span className="font-semibold text-neutral-900">
                        {m.totalKg.toLocaleString('nl-NL')} kg
                      </span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-neutral-100">
                      <div
                        className="h-full rounded-full bg-neutral-800 transition-all"
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

      {/* Rij 2: Grafiek van de progressie per spiergroep */}
      <section className="rounded-xl border border-neutral-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-neutral-900">
              progressie per spiergroep{activeMuscle ? ` — ${activeMuscle.name}` : ''}
            </h2>
            <p className="text-xs text-neutral-500">
              ontwikkeling over de tijd inclusief ervaren zwaarte (licht / neutraal / zwaar).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedMuscleId}
              onChange={(e) => setSelectedMuscleId(e.target.value)}
              aria-label="kies spiergroep"
              className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-800"
            >
              {stats.muscleGroupTotals.map((m) => (
                <option key={m.muscleGroupId} value={m.muscleGroupId}>
                  {m.name}
                </option>
              ))}
            </select>

            <div className="inline-flex rounded-lg border border-neutral-200 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setMetric('totalKg')}
                className={`rounded-md px-2.5 py-1 font-medium ${
                  metric === 'totalKg'
                    ? 'bg-emerald-600 text-white'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                volume (kg)
              </button>
              <button
                type="button"
                onClick={() => setMetric('maxWeightKg')}
                className={`rounded-md px-2.5 py-1 font-medium ${
                  metric === 'maxWeightKg'
                    ? 'bg-emerald-600 text-white'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                topgewicht (kg)
              </button>
            </div>
          </div>
        </div>

        {progressionPoints.length === 0 ? (
          <div className="mt-6 rounded-lg border border-dashed border-neutral-200 p-8 text-center text-sm text-neutral-400">
            geen progressiedata gevonden voor deze spiergroep.
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            <div className="w-full overflow-x-auto">
              <svg
                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                className="h-56 w-full min-w-[460px]"
                role="img"
                aria-label="progressiegrafiek spiergroep"
              >
                {/* Horizontale hulplijnen */}
                {[0, 0.5, 1].map((ratio, i) => {
                  const y = padTop + innerH - ratio * innerH
                  const labelVal = Math.round(maxChartVal * ratio)
                  return (
                    <g key={i}>
                      <line
                        x1={padLeft}
                        y1={y}
                        x2={chartWidth - padRight}
                        y2={y}
                        stroke="#e5e5e5"
                        strokeDasharray="4 4"
                      />
                      <text
                        x={padLeft - 8}
                        y={y + 4}
                        textAnchor="end"
                        className="fill-neutral-400 text-[11px]"
                      >
                        {labelVal}
                      </text>
                    </g>
                  )
                })}

                {/* Lijn */}
                {coords.length > 1 && (
                  <polyline
                    fill="none"
                    stroke="#059669"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={polylinePoints}
                  />
                )}

                {/* Punten en datums */}
                {coords.map((c, idx) => (
                  <g key={idx}>
                    <circle
                      cx={c.x}
                      cy={c.y}
                      r="5"
                      className="fill-emerald-600 stroke-white"
                      strokeWidth="2"
                    />
                    <text
                      x={c.x}
                      y={c.y - 10}
                      textAnchor="middle"
                      className="fill-neutral-800 text-[11px] font-semibold"
                    >
                      {c.val} kg
                    </text>
                    <text
                      x={c.x}
                      y={chartHeight - 10}
                      textAnchor="middle"
                      className="fill-neutral-500 text-[11px]"
                    >
                      {c.pt.date.slice(5)}
                    </text>
                  </g>
                ))}
              </svg>
            </div>

            {/* Overzicht per sessie-punt */}
            <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
              {progressionPoints.map((pt) => {
                const eff = pt.effort ? effortBadge[pt.effort] : null
                return (
                  <div
                    key={pt.date}
                    className="flex items-center justify-between rounded-lg border border-neutral-200 bg-neutral-50/70 px-3 py-2 text-xs"
                  >
                    <div>
                      <p className="font-semibold text-neutral-800">{pt.date}</p>
                      <p className="text-neutral-500">
                        {pt.totalKg} kg totaal · max {pt.maxWeightKg} kg
                      </p>
                      {pt.workoutNames.length > 0 && (
                        <p className="text-[11px] text-neutral-400">
                          {pt.workoutNames.join(', ')}
                        </p>
                      )}
                    </div>

                    {eff && (
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${eff.className}`}
                      >
                        {eff.label}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </section>
    </div>
  )
}