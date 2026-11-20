'use client'

import { useEffect, useMemo, useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { DashboardStatsData } from '@/lib/stats'

const WORKOUT_COLORS = [
  '#10b981', // emerald
  '#0ea5e9', // sky
  '#f59e0b', // amber
  '#a855f7', // purple
  '#f43f5e', // rose
  '#14b8a6', // teal
  '#f97316', // orange
]

type Last5Week = {
  key: string
  weekNumber: number
  label: string
  startDate: string
  endDate: string
}

function getIsoWeekInfo(date: Date): { year: number; week: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const week = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  return { year: d.getUTCFullYear(), week }
}

function getMonday(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const day = d.getDay() || 7
  d.setDate(d.getDate() - (day - 1))
  d.setHours(0, 0, 0, 0)
  return d
}

function formatYmd(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function buildLast5Weeks(): Last5Week[] {
  const currentMonday = getMonday(new Date())
  const weeks: Last5Week[] = []

  for (let offset = -4; offset <= 0; offset++) {
    const start = new Date(currentMonday)
    start.setDate(currentMonday.getDate() + offset * 7)
    const end = new Date(start)
    end.setDate(start.getDate() + 6)

    const { year, week } = getIsoWeekInfo(start)
    weeks.push({
      key: `${year}-W${String(week).padStart(2, '0')}`,
      weekNumber: week,
      label: `W${week}`,
      startDate: formatYmd(start),
      endDate: formatYmd(end),
    })
  }

  return weeks
}

type AnimatedLineChartProps = {
  title: string
  subtitle: string
  weeks: Last5Week[]
  series: {
    id: string
    name: string
    color: string
    valuesByWeek: number[] // lengte 5
  }[]
  yUnitLabel?: string
  animKey: number
  ariaLabel: string
}

function AnimatedLineChart({
  title,
  subtitle,
  weeks,
  series,
  yUnitLabel = 'kg',
  animKey,
  ariaLabel,
}: AnimatedLineChartProps) {
  const [axesReady, setAxesReady] = useState(false)
  const [drawLines, setDrawLines] = useState(false)

  useEffect(() => {
    setAxesReady(false)
    setDrawLines(false)

    const t1 = window.setTimeout(() => {
      setAxesReady(true)
    }, 60)

    const t2 = window.setTimeout(() => {
      setDrawLines(true)
    }, 420)

    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
    }
  }, [animKey, series])

  const width = 680
  const height = 250
  const padLeft = 58
  const padRight = 24
  const padTop = 26
  const padBottom = 40
  const innerW = width - padLeft - padRight
  const innerH = height - padTop - padBottom

  const allValues = series.flatMap((s) => s.valuesByWeek)
  const maxVal = Math.max(10, ...allValues)

  const getX = (idx: number) =>
    weeks.length <= 1
      ? padLeft + innerW / 2
      : padLeft + (idx / (weeks.length - 1)) * innerW

  const getY = (val: number) =>
    padTop + innerH - (Math.max(0, val) / maxVal) * innerH

  const yTicks = [0, 0.25, 0.5, 0.75, 1]

  return (
    <section className="rounded-3xl border border-zinc-800 bg-zinc-900 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-white">{title}</h2>
          <p className="mt-0.5 text-xs text-zinc-400">{subtitle}</p>
        </div>
        <span className="rounded-xl border border-zinc-800 bg-zinc-950 px-2.5 py-1 text-[11px] font-semibold text-zinc-400">
          laatste 5 weken ({yUnitLabel})
        </span>
      </div>

      {/* Legenda bij meerdere lijnen */}
      {series.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {series.map((s) => (
            <div
              key={s.id}
              className="flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-950 px-2.5 py-1 text-xs font-medium text-zinc-200"
            >
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: s.color }}
              />
              <span>{s.name}</span>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 w-full overflow-x-auto">
        <svg
          key={animKey}
          viewBox={`0 0 ${width} ${height}`}
          className="h-60 w-full min-w-[440px]"
          role="img"
          aria-label={ariaLabel}
        >
          {/* Gridlijnen + Y-as labels */}
          {yTicks.map((ratio, idx) => {
            const y = padTop + innerH - ratio * innerH
            const val = Math.round(maxVal * ratio)
            return (
              <g
                key={idx}
                className={`transition-opacity duration-300 ${
                  axesReady ? 'opacity-100' : 'opacity-0'
                }`}
              >
                {ratio > 0 && (
                  <line
                    x1={padLeft}
                    y1={y}
                    x2={width - padRight}
                    y2={y}
                    stroke="#27272a"
                    strokeDasharray="4 4"
                  />
                )}
                <text
                  x={padLeft - 10}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-zinc-400 text-[11px] tabular-nums"
                >
                  {val.toLocaleString('nl-NL')}
                </text>
              </g>
            )
          })}

          {/* Y-as (verticaal) */}
          <line
            x1={padLeft}
            y1={padTop}
            x2={padLeft}
            y2={padTop + innerH}
            stroke="#71717a"
            strokeWidth="1.5"
            className={`transition-opacity duration-300 ${
              axesReady ? 'opacity-100' : 'opacity-0'
            }`}
          />

          {/* X-as (horizontaal) */}
          <line
            x1={padLeft}
            y1={padTop + innerH}
            x2={width - padRight}
            y2={padTop + innerH}
            stroke="#71717a"
            strokeWidth="1.5"
            className={`transition-opacity duration-300 ${
              axesReady ? 'opacity-100' : 'opacity-0'
            }`}
          />

          {/* X-as weeknummers */}
          {weeks.map((wk, idx) => {
            const x = getX(idx)
            return (
              <g
                key={wk.key}
                className={`transition-opacity duration-300 ${
                  axesReady ? 'opacity-100' : 'opacity-0'
                }`}
              >
                <line
                  x1={x}
                  y1={padTop + innerH}
                  x2={x}
                  y2={padTop + innerH + 5}
                  stroke="#71717a"
                  strokeWidth="1.5"
                />
                <text
                  x={x}
                  y={height - 10}
                  textAnchor="middle"
                  className="fill-zinc-300 text-[11px] font-bold tabular-nums"
                >
                  {wk.label}
                </text>
              </g>
            )
          })}

          {/* Lijnen (ingetekend van links naar rechts na verschijnen van assen) */}
          {series.map((s) => {
            const pts = s.valuesByWeek.map((val, idx) => ({
              x: getX(idx),
              y: getY(val),
              val,
            }))

            if (pts.length === 0) return null

            const dPath = pts
              .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
              .join(' ')

            return (
              <g key={s.id}>
                <path
                  d={dPath}
                  pathLength={1}
                  fill="none"
                  stroke={s.color}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{
                    strokeDasharray: 1,
                    strokeDashoffset: drawLines ? 0 : 1,
                    transition:
                      'stroke-dashoffset 1100ms cubic-bezier(0.22, 1, 0.36, 1)',
                  }}
                />

                {pts.map((p, i) => (
                  <g
                    key={i}
                    style={{
                      opacity: drawLines ? 1 : 0,
                      transition: `opacity 300ms ease ${250 + i * 160}ms`,
                    }}
                  >
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r="4.5"
                      fill={s.color}
                      stroke="#09090b"
                      strokeWidth="2"
                    />
                    {p.val > 0 && (
                      <text
                        x={p.x}
                        y={p.y - 9}
                        textAnchor="middle"
                        className="fill-zinc-200 text-[10px] font-bold tabular-nums"
                      >
                        {p.val.toLocaleString('nl-NL')}
                      </text>
                    )}
                  </g>
                ))}
              </g>
            )
          })}
        </svg>
      </div>
    </section>
  )
}

export function StatsDashboardClient({ stats }: { stats: DashboardStatsData }) {
  const last5Weeks = useMemo(() => buildLast5Weeks(), [])
  const [animKey, setAnimKey] = useState(1)

  const muscleOptions = useMemo(() => {
    return stats.muscleGroupTotals ?? []
  }, [stats.muscleGroupTotals])

  const [selectedMuscleId, setSelectedMuscleId] = useState<string>(
    muscleOptions[0]?.muscleGroupId ?? ''
  )

  useEffect(() => {
    if (!selectedMuscleId && muscleOptions[0]?.muscleGroupId) {
      setSelectedMuscleId(muscleOptions[0].muscleGroupId)
    }
  }, [muscleOptions, selectedMuscleId])

  // 1) Bovenste grafiek: totaal verwerkte kilo's (reps * gewicht per set) per week over de laatste 5 weken
  const weeklyKgSeries = useMemo(() => {
    // Probeer eerst gedetailleerde set/sessie-data uit stats te lezen indien aanwezig
    const rawAny = stats as unknown as {
      setLogs?: {
        date: string
        reps: number
        weightKg: number
      }[]
    }

    const valuesByWeek = last5Weeks.map((wk) => {
      if (Array.isArray(rawAny.setLogs) && rawAny.setLogs.length > 0) {
        return rawAny.setLogs
          .filter((log) => log.date >= wk.startDate && log.date <= wk.endDate)
          .reduce((sum, log) => sum + (log.reps || 0) * (log.weightKg || 0), 0)
      }

      // Fallback op stats.weeklyVolume (match op weeknummer of datumrange)
      const matched = (stats.weeklyVolume ?? []).find((w) => {
        if (w.weekStart && w.weekStart >= wk.startDate && w.weekStart <= wk.endDate) {
          return true
        }
        return w.weekLabel?.includes(String(wk.weekNumber))
      })

      return matched?.totalKg ?? 0
    })

    return [
      {
        id: 'total-weekly-kg',
        name: "totaal verwerkte kilo's (reps × gewicht)",
        color: '#10b981',
        valuesByWeek,
      },
    ]
  }, [stats, last5Weeks])

  // 2) Onderste grafiek: per spiergroep -> per workout -> per week (laatste 5 weken) som van (sets * gewicht)
  const workoutSeriesForSelectedMuscle = useMemo(() => {
    const rawAny = stats as unknown as {
      workoutWeeklySets?: {
        muscleGroupId: string
        workoutId: string
        workoutName: string
        date: string
        sets: number
        weightKg: number
      }[]
    }

    // Als gedetailleerde workout-set data beschikbaar is: groepeer per workout en tel (sets * gewicht) op per week
    if (Array.isArray(rawAny.workoutWeeklySets) && rawAny.workoutWeeklySets.length > 0) {
      const filtered = rawAny.workoutWeeklySets.filter(
        (item) => item.muscleGroupId === selectedMuscleId
      )

      const byWorkout = new Map<
        string,
        { id: string; name: string; valuesByWeek: number[] }
      >()

      for (const row of filtered) {
        const weekIdx = last5Weeks.findIndex(
          (wk) => row.date >= wk.startDate && row.date <= wk.endDate
        )
        if (weekIdx === -1) continue

        if (!byWorkout.has(row.workoutId)) {
          byWorkout.set(row.workoutId, {
            id: row.workoutId,
            name: row.workoutName,
            valuesByWeek: [0, 0, 0, 0, 0],
          })
        }

        const entry = byWorkout.get(row.workoutId)!
        entry.valuesByWeek[weekIdx] += (row.sets || 0) * (row.weightKg || 0)
      }

      return Array.from(byWorkout.values()).map((w, idx) => ({
        ...w,
        color: WORKOUT_COLORS[idx % WORKOUT_COLORS.length],
      }))
    }

    // Fallback op progressionByMuscle wanneer workout-namen in punten staan
    const points = stats.progressionByMuscle?.[selectedMuscleId] ?? []
    const workoutNames = Array.from(
      new Set(points.flatMap((p) => p.workoutNames ?? []))
    )

    if (workoutNames.length === 0) {
      // Laatste fallback: één lijn op basis van maxWeightKg * 3 sets per week
      const valuesByWeek = last5Weeks.map((wk) => {
        const pt = points.find(
          (p) => p.date >= wk.startDate && p.date <= wk.endDate
        )
        return pt ? Math.round(pt.maxWeightKg * 3) : 0
      })

      return [
        {
          id: selectedMuscleId || 'workout',
          name:
            muscleOptions.find((m) => m.muscleGroupId === selectedMuscleId)?.name ??
            'workout',
          color: WORKOUT_COLORS[0],
          valuesByWeek,
        },
      ]
    }

    return workoutNames.map((wName, idx) => {
      const valuesByWeek = last5Weeks.map((wk) => {
        const matchingPts = points.filter(
          (p) =>
            p.date >= wk.startDate &&
            p.date <= wk.endDate &&
            (p.workoutNames ?? []).includes(wName)
        )
        return matchingPts.reduce(
          (sum, p) => sum + Math.round(p.maxWeightKg * 3),
          0
        )
      })

      return {
        id: `${selectedMuscleId}-${wName}`,
        name: wName,
        color: WORKOUT_COLORS[idx % WORKOUT_COLORS.length],
        valuesByWeek,
      }
    })
  }, [stats, selectedMuscleId, last5Weeks, muscleOptions])

  return (
    <div className="space-y-6 pb-24">
      {/* Knop om lijn-animatie opnieuw af te spelen */}
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3">
        <p className="text-xs font-medium text-zinc-400">
          weken <span className="font-bold text-emerald-400">{last5Weeks[0]?.label}</span> t/m{' '}
          <span className="font-bold text-emerald-400">{last5Weeks[4]?.label}</span> (inclusief huidige week)
        </p>
        <button
          type="button"
          onClick={() => setAnimKey((k) => k + 1)}
          className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-bold text-zinc-200 transition-colors hover:border-emerald-500/50 hover:text-emerald-300"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>opnieuw afspelen</span>
        </button>
      </div>

      {/* 1) Bovenin: lijndiagram verwerkte kilo's per week (laatste 5 weken) */}
      <AnimatedLineChart
        title="verwerkte kilo's per week"
        subtitle="alle workouts per week opgeteld op basis van reps × gewicht per set."
        weeks={last5Weeks}
        series={weeklyKgSeries}
        yUnitLabel="kg"
        animKey={animKey}
        ariaLabel="Lijndiagram verwerkte kilo's per week over de laatste 5 weken"
      />

      {/* 2) Onderin: picklist spiergroep + lijndiagram per workout (sets * gewicht) */}
      <section className="space-y-4 rounded-3xl border border-zinc-800 bg-zinc-900 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-white">
              progressie per workout binnen spiergroep
            </h2>
            <p className="mt-0.5 text-xs text-zinc-400">
              per week opgeteld: som van (aantal sets × gewicht) per workout over de laatste 5 weken.
            </p>
          </div>

          <label className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              spiergroep
            </span>
            <select
              value={selectedMuscleId}
              onChange={(e) => setSelectedMuscleId(e.target.value)}
              aria-label="kies spiergroep"
              className="min-h-11 rounded-2xl border border-zinc-700 bg-zinc-950 px-3.5 py-2 text-sm font-bold text-white focus:border-emerald-400 focus:outline-none"
            >
              {muscleOptions.map((m) => (
                <option key={m.muscleGroupId} value={m.muscleGroupId}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <AnimatedLineChart
          title={
            muscleOptions.find((m) => m.muscleGroupId === selectedMuscleId)?.name ??
            'spiergroep'
          }
          subtitle="elke kleur is een workout; y-as toont (sets × gewicht) opgeteld per week."
          weeks={last5Weeks}
          series={workoutSeriesForSelectedMuscle}
          yUnitLabel="sets×kg"
          animKey={animKey}
          ariaLabel="Lijndiagram progressie per workout binnen gekozen spiergroep"
        />
      </section>
    </div>
  )
}