'use client'

import { useEffect, useMemo, useState } from 'react'
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

type LinePlotProps = {
  weeks: Last5Week[]
  series: {
    id: string
    name: string
    color: string
    valuesByWeek: number[]
  }[]
  animKey: number
  ariaLabel: string
  showLegend?: boolean
}

function CompactAnimatedLinePlot({
  weeks,
  series,
  animKey,
  ariaLabel,
  showLegend = false,
}: LinePlotProps) {
  const [axesReady, setAxesReady] = useState(false)
  const [drawLines, setDrawLines] = useState(false)

  useEffect(() => {
    setAxesReady(false)
    setDrawLines(false)

    const t1 = window.setTimeout(() => {
      setAxesReady(true)
    }, 120)

    const t2 = window.setTimeout(() => {
      setDrawLines(true)
    }, 750)

    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
    }
  }, [animKey, series])

  const width = 620
  const height = 225
  const padLeft = 86
  const padRight = 26
  const padTop = 38
  const padBottom = 42
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

  const yTicks = [0, 0.5, 1]

  return (
    <div className="space-y-2.5">
      {showLegend && series.length > 0 && (
        <div className="flex flex-wrap gap-2">
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

      <div className="w-full overflow-hidden">
        <svg
          key={animKey}
          viewBox={`0 0 ${width} ${height}`}
          className="block h-52 w-full"
          role="img"
          aria-label={ariaLabel}
        >
          {/* Gridlijnen + extra grote Y-as getallen */}
          {yTicks.map((ratio, idx) => {
            const y = padTop + innerH - ratio * innerH
            const val = Math.round(maxVal * ratio)
            return (
              <g
                key={idx}
                className={`transition-opacity duration-500 ${
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
                  y={y + 6.5}
                  textAnchor="end"
                  className="fill-zinc-200 text-[19px] font-extrabold tabular-nums"
                >
                  {val.toLocaleString('nl-NL')}
                </text>
              </g>
            )
          })}

          {/* Y-as */}
          <line
            x1={padLeft}
            y1={padTop}
            x2={padLeft}
            y2={padTop + innerH}
            stroke="#71717a"
            strokeWidth="1.5"
            className={`transition-opacity duration-500 ${
              axesReady ? 'opacity-100' : 'opacity-0'
            }`}
          />

          {/* X-as */}
          <line
            x1={padLeft}
            y1={padTop + innerH}
            x2={width - padRight}
            y2={padTop + innerH}
            stroke="#71717a"
            strokeWidth="1.5"
            className={`transition-opacity duration-500 ${
              axesReady ? 'opacity-100' : 'opacity-0'
            }`}
          />

          {/* X-as weeknummers */}
          {weeks.map((wk, idx) => {
            const x = getX(idx)
            return (
              <g
                key={wk.key}
                className={`transition-opacity duration-500 ${
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
                  y={height - 8}
                  textAnchor="middle"
                  className="fill-zinc-100 text-[19px] font-extrabold tabular-nums"
                >
                  {wk.label}
                </text>
              </g>
            )
          })}

          {/* Lijnen (langzaam van links naar rechts ingetekend) */}
          {series.map((s) => {
            const pts = s.valuesByWeek.map((val, idx) => ({
              x: getX(idx),
              y: getY(val),
              val,
            }))

            if (pts.length === 0) return null

            const dPath = pts
              .map(
                (p, i) =>
                  `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`
              )
              .join(' ')

            return (
              <g key={s.id}>
                <path
                  d={dPath}
                  pathLength={1}
                  fill="none"
                  stroke={s.color}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{
                    strokeDasharray: 1,
                    strokeDashoffset: drawLines ? 0 : 1,
                    transition:
                      'stroke-dashoffset 2200ms cubic-bezier(0.22, 1, 0.36, 1)',
                  }}
                />

                {pts.map((p, i) => (
                  <g
                    key={i}
                    style={{
                      opacity: drawLines ? 1 : 0,
                      transition: `opacity 400ms ease ${450 + i * 350}ms`,
                    }}
                  >
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r="5"
                      fill={s.color}
                      stroke="#09090b"
                      strokeWidth="1.5"
                    />
                    {p.val > 0 && (
                      <text
                        x={p.x}
                        y={p.y - 12}
                        textAnchor="middle"
                        className="fill-white text-[18px] font-extrabold tabular-nums"
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
    </div>
  )
}

export function StatsDashboardClient({ stats }: { stats: DashboardStatsData }) {
  const last5Weeks = useMemo(() => buildLast5Weeks(), [])
  const [animKey] = useState(1)

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

  const weeklyKgSeries = useMemo(() => {
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
        name: "activiteit in kilo's",
        color: '#10b981',
        valuesByWeek,
      },
    ]
  }, [stats, last5Weeks])

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

    if (
      Array.isArray(rawAny.workoutWeeklySets) &&
      rawAny.workoutWeeklySets.length > 0
    ) {
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

    const points = stats.progressionByMuscle?.[selectedMuscleId] ?? []
    const workoutNames = Array.from(
      new Set(points.flatMap((p) => p.workoutNames ?? []))
    )

    if (workoutNames.length === 0) {
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
    <div className="space-y-4 pb-8">
      {/* Blok: activiteit in kilo's per week */}
      <section className="space-y-2 rounded-3xl border border-zinc-800 bg-zinc-900 p-4">
        <h2 className="text-sm font-bold text-white">
          activiteit in kilo&apos;s per week
        </h2>
        <CompactAnimatedLinePlot
          weeks={last5Weeks}
          series={weeklyKgSeries}
          animKey={animKey}
          ariaLabel="Activiteit in kilo's per week over de laatste 5 weken"
        />
      </section>

      {/* Blok: progressie per spiergroep */}
      <section className="space-y-3 rounded-3xl border border-zinc-800 bg-zinc-900 p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-white">
            progressie per spiergroep
          </h2>

          <select
            value={selectedMuscleId}
            onChange={(e) => setSelectedMuscleId(e.target.value)}
            aria-label="kies spiergroep"
            className="min-h-10 rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs font-bold text-white focus:border-emerald-400 focus:outline-none"
          >
            {muscleOptions.map((m) => (
              <option key={m.muscleGroupId} value={m.muscleGroupId}>
                {m.name}
              </option>
            ))}
          </select>
        </div>

        <CompactAnimatedLinePlot
          weeks={last5Weeks}
          series={workoutSeriesForSelectedMuscle}
          animKey={animKey}
          ariaLabel="Progressie per spiergroep over de laatste 5 weken"
          showLegend
        />
      </section>
    </div>
  )
}