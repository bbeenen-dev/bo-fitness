'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  addDaysToDateStr,
  computeChainShiftedSessions,
  PlannerSessionRow,
} from '@/lib/chainshift'

function getMondayOfWeek(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(Date.UTC(y, (m || 1) - 1, d || 1))
  const day = date.getUTCDay() // 0 = zo, 1 = ma ...
  const diff = day === 0 ? -6 : 1 - day
  date.setUTCDate(date.getUTCDate() + diff)
  return date.toISOString().slice(0, 10)
}

function getSessionDurationMin(session: PlannerSessionRow): number {
  const wList = session.session_workouts ?? []

  // Als er start- en eindtijden zijn gelogd, bereken van start eerste tot stop laatste workout
  const starts = wList
    .map((w) => (w.started_at ? new Date(w.started_at).getTime() : NaN))
    .filter((t) => !Number.isNaN(t))
  const ends = wList
    .map((w) => (w.ended_at ? new Date(w.ended_at).getTime() : NaN))
    .filter((t) => !Number.isNaN(t))

  if (starts.length > 0 && ends.length > 0) {
    const minStart = Math.min(...starts)
    const maxEnd = Math.max(...ends)
    if (maxEnd > minStart) {
      return Math.max(1, Math.round((maxEnd - minStart) / 60000))
    }
  }

  if (session.total_duration_min && session.total_duration_min > 0) {
    return session.total_duration_min
  }

  return wList.reduce(
    (sum, w) => sum + (w.workouts?.estimated_duration_min ?? 0),
    0
  )
}

const dayLabels = ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo']

export function WeekPlannerClient({
  initialSessions,
  todayStr,
}: {
  initialSessions: PlannerSessionRow[]
  todayStr: string
}) {
  const [sessions, setSessions] = useState<PlannerSessionRow[]>(initialSessions)
  const [weekStart, setWeekStart] = useState<string>(() => getMondayOfWeek(todayStr))
  const [draggedSessionId, setDraggedSessionId] = useState<string | null>(null)
  const [dragOverDate, setDragOverDate] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [statusNotice, setStatusNotice] = useState<string | null>(null)

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, idx) => {
      const dateStr = addDaysToDateStr(weekStart, idx)
      return {
        dateStr,
        label: dayLabels[idx],
      }
    })
  }, [weekStart])

  const sessionsByDate = useMemo(() => {
    const map = new Map<string, PlannerSessionRow[]>()
    for (const s of sessions) {
      const list = map.get(s.scheduled_date) ?? []
      list.push(s)
      map.set(s.scheduled_date, list)
    }
    return map
  }, [sessions])

  async function handleDropOnDay(targetDate: string) {
    setDragOverDate(null)
    if (!draggedSessionId) return

    const sessionId = draggedSessionId
    setDraggedSessionId(null)

    const { updatedSessions, changedIds } = computeChainShiftedSessions(
      sessions,
      sessionId,
      targetDate,
      1
    )

    if (changedIds.length === 0) return

    setSessions(updatedSessions)
    setSaving(true)
    setStatusNotice(
      changedIds.length > 1
        ? `training verplaatst naar ${targetDate} en ${changedIds.length - 1} latere training(en) automatisch doorgeschoven voor rustdagen.`
        : `training verplaatst naar ${targetDate}.`
    )

    const supabase = createClient()
    await Promise.all(
      changedIds.map((id) => {
        const target = updatedSessions.find((item) => item.id === id)
        if (!target) return Promise.resolve()
        return supabase
          .from('training_sessions')
          .update({ scheduled_date: target.scheduled_date })
          .eq('id', id)
      })
    )

    setSaving(false)
  }

  const weekEnd = addDaysToDateStr(weekStart, 6)

  return (
    <div className="space-y-5">
      {/* Weeknavigatie & statusmelding */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white p-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setWeekStart((prev) => addDaysToDateStr(prev, -7))}
            className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            ← vorige week
          </button>
          <button
            type="button"
            onClick={() => setWeekStart(getMondayOfWeek(todayStr))}
            className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-50"
          >
            deze week
          </button>
          <button
            type="button"
            onClick={() => setWeekStart((prev) => addDaysToDateStr(prev, 7))}
            className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            volgende week →
          </button>
        </div>

        <div className="text-sm font-semibold text-neutral-800">
          {weekStart} t/m {weekEnd}
        </div>
      </div>

      {statusNotice && (
        <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-900">
          <span>
            {statusNotice} {saving && '(opslaan...)'}
          </span>
          <button
            type="button"
            onClick={() => setStatusNotice(null)}
            className="text-xs font-medium text-emerald-700 hover:underline"
          >
            sluiten
          </button>
        </div>
      )}

      {/* Legenda */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-neutral-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded border border-emerald-500 bg-emerald-100" />
          afgeronde workout (groen)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded border border-neutral-300 bg-white" />
          nog te doen workout (wit)
        </span>
        <span>sleep een openstaande training naar een andere dag (minimaal 1 rustdag).</span>
      </div>

      {/* 7-dagen grid */}
      <div className="grid gap-3 md:grid-cols-7">
        {weekDays.map(({ dateStr, label }) => {
          const daySessions = sessionsByDate.get(dateStr) ?? []
          const isToday = dateStr === todayStr
          const isDragTarget = dragOverDate === dateStr

          return (
            <div
              key={dateStr}
              onDragOver={(e) => {
                e.preventDefault()
                if (dragOverDate !== dateStr) setDragOverDate(dateStr)
              }}
              onDragLeave={() => {
                if (dragOverDate === dateStr) setDragOverDate(null)
              }}
              onDrop={() => void handleDropOnDay(dateStr)}
              className={`min-h-[240px] rounded-xl border p-3 transition-colors ${
                isDragTarget
                  ? 'border-emerald-500 bg-emerald-50/60'
                  : isToday
                    ? 'border-neutral-900 bg-white'
                    : 'border-neutral-200 bg-white'
              }`}
            >
              <div className="mb-3 flex items-center justify-between border-b border-neutral-100 pb-2">
                <div>
                  <span className="text-xs font-bold uppercase text-neutral-500">
                    {label}
                  </span>
                  <p className="text-sm font-semibold text-neutral-900">{dateStr.slice(5)}</p>
                </div>
                {isToday && (
                  <span className="rounded bg-neutral-900 px-1.5 py-0.5 text-[10px] font-medium text-white">
                    vandaag
                  </span>
                )}
              </div>

              <div className="space-y-2.5">
                {daySessions.map((session) => {
                  const isCompletedSession = session.status === 'completed'
                  const durationMin = getSessionDurationMin(session)
                  const sortedSw = [...(session.session_workouts ?? [])].sort(
                    (a, b) => a.sort_order - b.sort_order
                  )

                  return (
                    <div
                      key={session.id}
                      draggable={!isCompletedSession}
                      onDragStart={() => setDraggedSessionId(session.id)}
                      onDragEnd={() => {
                        setDraggedSessionId(null)
                        setDragOverDate(null)
                      }}
                      className={`rounded-lg border p-2.5 shadow-2xs ${
                        isCompletedSession
                          ? 'border-neutral-200 bg-neutral-50'
                          : 'cursor-grab border-neutral-300 bg-neutral-50/50 active:cursor-grabbing'
                      }`}
                    >
                      <div className="mb-1.5 flex items-center justify-between gap-1">
                        <span className="text-[11px] font-semibold text-neutral-700">
                          {isCompletedSession ? 'afgerond' : 'gepland'}
                        </span>
                        <span className="rounded bg-neutral-200/70 px-1.5 py-0.5 text-[10px] font-medium text-neutral-700">
                          {durationMin} min
                        </span>
                      </div>

                      <div className="space-y-1">
                        {sortedSw.map((sw) => (
                          <Link
                            key={sw.id}
                            href={`/dashboard/log/${sw.id}`}
                            className={`block rounded border px-2 py-1 text-xs transition-colors ${
                              sw.is_completed
                                ? 'border-emerald-300 bg-emerald-100 font-medium text-emerald-950'
                                : 'border-neutral-200 bg-white text-neutral-800 hover:border-neutral-400'
                            }`}
                          >
                            {sw.workouts?.name ?? 'workout'}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )
                })}

                {daySessions.length === 0 && (
                  <div className="rounded-lg border border-dashed border-neutral-200 py-6 text-center text-[11px] text-neutral-400">
                    rustdag
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
