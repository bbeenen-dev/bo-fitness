'use client'

import { useMemo, useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'

export type WorkoutSetRecord = {
  date: string
  setNumber: number
  reps: number
  weightKg: number
}

export type WorkoutHistoryItem = {
  id: string
  name: string
  sets: WorkoutSetRecord[]
}

export type MuscleGroupHistory = {
  id: string
  name: string
  sortOrder: number
  workouts: WorkoutHistoryItem[]
}

type WeekBucket = {
  key: string
  label: string
  startDate: string
  endDate: string
}

function getIsoWeekNumber(date: Date): number {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  )
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
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

function buildLast5Weeks(): WeekBucket[] {
  const currentMonday = getMonday(new Date())
  const weeks: WeekBucket[] = []

  for (let offset = -4; offset <= 0; offset++) {
    const start = new Date(currentMonday)
    start.setDate(currentMonday.getDate() + offset * 7)
    const end = new Date(start)
    end.setDate(start.getDate() + 6)

    const weekNum = getIsoWeekNumber(start)
    weeks.push({
      key: `${formatYmd(start)}_${formatYmd(end)}`,
      label: `W${weekNum}`,
      startDate: formatYmd(start),
      endDate: formatYmd(end),
    })
  }

  return weeks
}

function formatNumber(val: number): string {
  const rounded = Math.round(val * 10) / 10
  return Number.isInteger(rounded)
    ? String(rounded)
    : rounded.toLocaleString('nl-NL', { maximumFractionDigits: 1 })
}

export function WorkoutHistorieClient({
  groups,
}: {
  groups: MuscleGroupHistory[]
}) {
  const weeks = useMemo(() => buildLast5Weeks(), [])
  const [openGroupIds, setOpenGroupIds] = useState<Record<string, boolean>>({})

  function toggleGroup(groupId: string) {
    setOpenGroupIds((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }))
  }

  return (
    <div className="mx-auto max-w-4xl space-y-3 px-3 py-4 pb-24 sm:px-6">
      <div className="rounded-2xl bg-emerald-600 px-4 py-3">
        <h1 className="text-lg font-extrabold tracking-tight text-white">
          Workout historie
        </h1>
      </div>

      {groups.length === 0 ? (
        <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-5 text-sm text-zinc-400">
          Geen spiergroepen gevonden.
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((group) => {
            const isOpen = !!openGroupIds[group.id]

            return (
              <section
                key={group.id}
                className="overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900"
              >
                <button
                  type="button"
                  onClick={() => toggleGroup(group.id)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition-colors hover:bg-zinc-800/60"
                >
                  <span className="text-base font-extrabold text-white">
                    {group.name}
                  </span>
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-800 text-zinc-200">
                    {isOpen ? (
                      <ChevronDown className="h-4 w-4 text-emerald-400" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </span>
                </button>

                {isOpen && (
                  <div className="space-y-4 border-t border-zinc-800 px-3 py-3.5 sm:px-4">
                    {group.workouts.length === 0 ? (
                      <p className="text-xs text-zinc-400">
                        Geen workouts gekoppeld aan deze spiergroep.
                      </p>
                    ) : (
                      group.workouts.map((workout) => {
                        const setsByWeek = weeks.map((wk) =>
                          workout.sets
                            .filter(
                              (s) =>
                                s.date >= wk.startDate && s.date <= wk.endDate
                            )
                            .sort((a, b) => a.setNumber - b.setNumber)
                        )

                        const maxRows = Math.max(
                          1,
                          ...setsByWeek.map((list) => list.length)
                        )

                        return (
                          <div
                            key={workout.id}
                            className="space-y-2 rounded-2xl border border-zinc-800 bg-zinc-950/70 p-3"
                          >
                            <h3 className="text-sm font-bold text-emerald-400">
                              {workout.name}
                            </h3>

                            <div className="overflow-x-auto">
                              <table className="w-full min-w-[680px] border-collapse text-xs tabular-nums">
                                <thead>
                                  <tr className="border-b border-zinc-800 text-zinc-200">
                                    {weeks.map((wk) => (
                                      <th
                                        key={wk.key}
                                        colSpan={4}
                                        className="border-r border-zinc-800 px-2 py-1.5 text-center font-extrabold last:border-r-0"
                                      >
                                        {wk.label}
                                      </th>
                                    ))}
                                  </tr>
                                  <tr className="border-b border-zinc-800 bg-zinc-900/90 text-[11px] font-bold text-zinc-400">
                                    {weeks.map((wk) => (
                                      <FragmentWeekSubHeaders
                                        key={`${wk.key}-sub`}
                                      />
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {Array.from({ length: maxRows }).map(
                                    (_, rowIdx) => (
                                      <tr
                                        key={rowIdx}
                                        className="border-b border-zinc-800/60 last:border-b-0"
                                      >
                                        {setsByWeek.map((weekSets, wkIdx) => {
                                          const rec = weekSets[rowIdx]
                                          const total = rec
                                            ? rec.reps * rec.weightKg
                                            : null

                                          return (
                                            <FragmentWeekRowCells
                                              key={`${weeks[wkIdx].key}-${rowIdx}`}
                                              setNumber={
                                                rec ? String(rec.setNumber) : '-'
                                              }
                                              amount={
                                                rec ? formatNumber(rec.reps) : '-'
                                              }
                                              weight={
                                                rec
                                                  ? formatNumber(rec.weightKg)
                                                  : '-'
                                              }
                                              total={
                                                total !== null
                                                  ? formatNumber(total)
                                                  : '-'
                                              }
                                            />
                                          )
                                        })}
                                      </tr>
                                    )
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                )}
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}

function FragmentWeekSubHeaders() {
  return (
    <>
      <th className="px-1.5 py-1 text-center">S</th>
      <th className="px-1.5 py-1 text-center">A</th>
      <th className="px-1.5 py-1 text-center">G</th>
      <th className="border-r border-zinc-800 px-1.5 py-1 text-center text-emerald-400 last:border-r-0">
        T
      </th>
    </>
  )
}

function FragmentWeekRowCells({
  setNumber,
  amount,
  weight,
  total,
}: {
  setNumber: string
  amount: string
  weight: string
  total: string
}) {
  return (
    <>
      <td className="px-1.5 py-1.5 text-center text-zinc-400">{setNumber}</td>
      <td className="px-1.5 py-1.5 text-center text-zinc-200">{amount}</td>
      <td className="px-1.5 py-1.5 text-center text-zinc-200">{weight}</td>
      <td className="border-r border-zinc-800 px-1.5 py-1.5 text-center font-bold text-white last:border-r-0">
        {total}
      </td>
    </>
  )
}