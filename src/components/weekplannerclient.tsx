'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
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
      // Verschuif de versleepte sessie én latere geplande sessies mee
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
        `sessie verplaatst naar ${targetDateStr} (ketting-verschuiving van ${diffDays > 0 ? `+${diffDays}` : diffDays} dag(en) toegepast).`
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
    <div className="space-y-5">
      {/* Instellingen- en feedbackbalk */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-4 sm:px-6">
        <label className="flex cursor-pointer items-center gap-2.5 text-sm text-zinc-200">
          <input
            type="checkbox"
            checked={cascadeShift}
            onChange={(e) => setCascadeShift(e.target.checked)}
            className="h-4 w-4 rounded border-zinc-600 bg-zinc-950 text-emerald-500 focus:ring-emerald-500"
          />
          <span>ketting-verschuiving voor latere geplande sessies</span>
        </label>

        <div className="flex items-center gap-3 text-xs">
          {saving && (
            <span className="font-semibold text-emerald-400">planning bijwerken...</span>
          )}
          <Link
            href="/dashboard/plannen"
            className="rounded-xl bg-emerald-500 px-4 py-2 font-bold text-zinc-950 transition-colors hover:bg-emerald-400"
          >
            + nieuwe training
          </Link>
        </div>
      </div>

      {feedback && (
        <div className="rounded-xl border border-emerald-500/35 bg-emerald-950/35 px-4 py-3 text-xs font-medium text-emerald-300">
          {feedback}
        </div>
      )}

      {/* 7-dagen weekgrid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
        {weekDays.map((day) => {
          const daySessions = sessionsByDate.get(day.dateStr) ?? []
          const isDropTarget = Boolean(draggedSessionId)

          return (
            <div
              key={day.dateStr}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => void handleMoveToDate(day.dateStr)}
              className={`flex min-h-[220px] flex-col rounded-2xl border p-3.5 transition-colors ${
                day.isToday
                  ? 'border-emerald-500/50 bg-zinc-900'
                  : 'border-zinc-800 bg-zinc-900/80'
              } ${isDropTarget ? 'border-dashed border-zinc-600' : ''}`}
            >
              {/* Dagheader */}
              <div className="mb-3 flex items-center justify-between border-b border-zinc-800 pb-2.5">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                    {day.dayLabel}
                  </p>
                  <p className="text-base font-bold text-white tabular-nums">
                    {day.dayNumber}
                  </p>
                </div>

                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tabular-nums ${
                    day.isToday
                      ? 'bg-emerald-500 text-zinc-950'
                      : 'bg-zinc-800 text-zinc-400'
                  }`}
                >
                  {day.isToday ? 'vandaag' : day.dateStr.slice(5)}
                </span>
              </div>

              {/* Sessies op deze dag */}
              <div className="flex-1 space-y-2.5">
                {daySessions.length === 0 ? (
                  <div className="flex h-28 items-center justify-center rounded-xl border border-dashed border-zinc-800/90 bg-zinc-950/50 p-2 text-center text-xs text-zinc-500">
                    rustdag / geen sessie
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
                        className={`cursor-grab rounded-xl border p-3 transition-all active:cursor-grabbing ${
                          isCompleted
                            ? 'border-emerald-500/40 bg-emerald-950/35'
                            : 'border-zinc-700 bg-zinc-950 hover:border-emerald-500/50'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                              isCompleted
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : 'bg-zinc-800 text-emerald-400'
                            }`}
                          >
                            {isCompleted ? 'voltooid' : 'gepland'}
                          </span>
                          <span className="text-[11px] font-semibold text-zinc-400 tabular-nums">
                            {estMin} min
                          </span>
                        </div>

                        <ul className="mt-2.5 space-y-1.5">
                          {sortedSw.map((sw) => (
                            <li
                              key={sw.id}
                              className="flex items-center justify-between gap-1 text-xs"
                            >
                              <Link
                                href={`/dashboard/log/${sw.id}`}
                                className={`truncate font-semibold hover:underline ${
                                  sw.is_completed
                                    ? 'text-emerald-300'
                                    : 'text-zinc-100'
                                }`}
                              >
                                {sw.is_completed ? '✓ ' : ''}
                                {sw.workouts?.name ?? 'workout'}
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