'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus, GripVertical, CheckCircle2, Calendar } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export type WeekSessionItem = {
  id: string
  scheduled_date: string
  status: string
  total_duration_min: number | null
  session_workouts: {
    id: string
    sort_order: number
    is_completed: boolean
    workouts: {
      id: string
      name: string
      estimated_duration_min: number
      muscle_groups: {
        name: string
      } | null
    } | null
  }[]
}

type Props = {
  initialSessions: WeekSessionItem[]
  weekDays: {
    dateStr: string
    dayLabel: string
    dayNumber: string
    isToday: boolean
  }[]
}

function addDaysToDateStr(dateStr: string, deltaDays: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d + deltaDays))
  return dt.toISOString().slice(0, 10)
}

export function WeekPlannerClient({ initialSessions, weekDays }: Props) {
  const router = useRouter()
  const [sessions, setSessions] = useState<WeekSessionItem[]>(initialSessions)
  const [draggedSessionId, setDraggedSessionId] = useState<string | null>(null)
  const [cascadeShift, setCascadeShift] = useState<boolean>(true)
  const [saving, setSaving] = useState<boolean>(false)
  const [feedback, setFeedback] = useState<string | null>(null)

  const sessionsByDate = useMemo(() => {
    const map = new Map<string, WeekSessionItem[]>()
    for (const day of weekDays) {
      map.set(day.dateStr, [])
    }
    for (const s of sessions) {
      const list = map.get(s.scheduled_date)
      if (list) {
        list.push(s)
      }
    }
    return map
  }, [sessions, weekDays])

  async function handleMoveToDate(targetDateStr: string) {
    if (!draggedSessionId) return
    const dragged = sessions.find((s) => s.id === draggedSessionId)
    setDraggedSessionId(null)

    if (!dragged || dragged.scheduled_date === targetDateStr) return

    setSaving(true)
    setFeedback(null)
    const supabase = createClient()

    const [oy, om, od] = dragged.scheduled_date.split('-').map(Number)
    const [ty, tm, td] = targetDateStr.split('-').map(Number)
    const oldMs = Date.UTC(oy, om - 1, od)
    const newMs = Date.UTC(ty, tm - 1, td)
    const diffDays = Math.round((newMs - oldMs) / (1000 * 60 * 60 * 24))

    let updatedList = [...sessions]

    if (cascadeShift && diffDays !== 0) {
      const affected = sessions.filter(
        (s) =>
          s.id === dragged.id ||
          (s.status === 'planned' && s.scheduled_date > dragged.scheduled_date)
      )

      updatedList = sessions.map((s) => {
        if (!affected.some((a) => a.id === s.id)) return s
        return {
          ...s,
          scheduled_date: addDaysToDateStr(s.scheduled_date, diffDays),
        }
      })

      await Promise.all(
        affected.map((s) =>
          supabase
            .from('training_sessions')
            .update({ scheduled_date: addDaysToDateStr(s.scheduled_date, diffDays) })
            .eq('id', s.id)
        )
      )

      setFeedback(
        `sessie verplaatst naar ${targetDateStr} (ketting-verschuiving van ${diffDays > 0 ? `+${diffDays}` : diffDays} dag(en)).`
      )
    } else {
      updatedList = sessions.map((s) =>
        s.id === dragged.id ? { ...s, scheduled_date: targetDateStr } : s
      )

      await supabase
        .from('training_sessions')
        .update({ scheduled_date: targetDateStr })
        .eq('id', dragged.id)

      setFeedback(`sessie verplaatst naar ${targetDateStr}.`)
    }

    setSessions(updatedList)
    setSaving(false)
    router.refresh()
  }

  return (
    <div className="space-y-4">
      {/* Instellingen- en statusbalk */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-zinc-800 bg-zinc-900 p-4 sm:px-5">
        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-zinc-200">
          <input
            type="checkbox"
            checked={cascadeShift}
            onChange={(e) => setCascadeShift(e.target.checked)}
            className="h-5 w-5 rounded border-zinc-600 bg-zinc-950 text-emerald-500 focus:ring-emerald-500"
          />
          <span>latere geplande sessies automatisch meeschuiven</span>
        </label>

        {saving && (
          <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-400">
            planning opslaan...
          </span>
        )}
      </div>

      {feedback && (
        <div className="rounded-2xl border border-emerald-500/35 bg-emerald-950/35 px-4 py-3 text-xs font-medium text-emerald-300">
          {feedback}
        </div>
      )}

      {/* 7-dagen weekoverzicht (gestapeld op telefoon, 7 kolommen op breed scherm) */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-7">
        {weekDays.map((day) => {
          const daySessions = sessionsByDate.get(day.dateStr) ?? []
          const isDropTarget = Boolean(draggedSessionId)

          return (
            <div
              key={day.dateStr}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => void handleMoveToDate(day.dateStr)}
              className={`flex flex-col rounded-3xl border p-4 transition-colors ${
                day.isToday
                  ? 'border-emerald-500/50 bg-zinc-900 shadow-md shadow-emerald-950/30'
                  : 'border-zinc-800 bg-zinc-900/85'
              } ${isDropTarget ? 'border-dashed border-emerald-400/70' : ''}`}
            >
              {/* Dagheader + + knop voor deze dag */}
              <div className="mb-3 flex items-center justify-between gap-2 border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                        {day.dayLabel}
                      </span>
                      <span className="text-base font-extrabold text-white tabular-nums">
                        {day.dayNumber}
                      </span>
                    </div>
                    <span className="text-[11px] text-zinc-500 tabular-nums">
                      {day.dateStr}
                    </span>
                  </div>

                  {day.isToday && (
                    <span className="rounded-full bg-emerald-500 px-2.5 py-0.5 text-[10px] font-extrabold uppercase text-zinc-950">
                      vandaag
                    </span>
                  )}
                </div>

                <Link
                  href={`/dashboard/plannen?date=${day.dateStr}`}
                  aria-label={`Training plannen op ${day.dateStr}`}
                  title={`Training plannen op ${day.dateStr}`}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-500 text-zinc-950 transition-all active:scale-95 hover:bg-emerald-400"
                >
                  <Plus className="h-5 w-5 stroke-[2.5]" />
                </Link>
              </div>

              {/* Sessies op deze dag */}
              <div className="flex-1 space-y-2.5">
                {daySessions.length === 0 ? (
                  <div className="flex min-h-20 items-center justify-center rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/50 px-3 py-4 text-center text-xs text-zinc-500">
                    geen training gepland • tik op + om toe te voegen
                  </div>
                ) : (
                  daySessions.map((session) => {
                    const sortedSw = [...(session.session_workouts ?? [])].sort(
                      (a, b) => a.sort_order - b.sort_order
                    )
                    const estMin =
                      session.total_duration_min ??
                      sortedSw.reduce(
                        (sum, sw) =>
                          sum + (sw.workouts?.estimated_duration_min ?? 0),
                        0
                      )
                    const isCompleted = session.status === 'completed'

                    return (
                      <div
                        key={session.id}
                        draggable
                        onDragStart={() => setDraggedSessionId(session.id)}
                        className={`cursor-grab rounded-2xl border p-3.5 transition-all active:cursor-grabbing ${
                          isCompleted
                            ? 'border-emerald-500/40 bg-emerald-950/30'
                            : 'border-zinc-700/90 bg-zinc-950 hover:border-emerald-500/50'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <GripVertical className="h-4 w-4 text-zinc-500" />
                            {isCompleted ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-300">
                                <CheckCircle2 className="h-3 w-3" />
                                voltooid
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-400">
                                <Calendar className="h-3 w-3" />
                                gepland
                              </span>
                            )}
                          </div>

                          <span className="text-xs font-semibold text-zinc-400 tabular-nums">
                            {estMin} min
                          </span>
                        </div>

                        <ul className="mt-2.5 space-y-1.5">
                          {sortedSw.map((sw) => (
                            <li key={sw.id}>
                              <Link
                                href={`/dashboard/log/${sw.id}`}
                                className="flex items-center justify-between gap-2 rounded-xl bg-zinc-900/90 px-3 py-2 text-xs font-semibold text-zinc-100 transition-colors hover:bg-zinc-800 hover:text-emerald-300"
                              >
                                <span className="truncate">
                                  {sw.is_completed ? '✓ ' : ''}
                                  {sw.workouts?.name ?? 'workout'}
                                </span>
                                {sw.workouts?.muscle_groups?.name && (
                                  <span className="shrink-0 rounded-md bg-zinc-800 px-2 py-0.5 text-[10px] text-emerald-400">
                                    {sw.workouts.muscle_groups.name}
                                  </span>
                                )}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}