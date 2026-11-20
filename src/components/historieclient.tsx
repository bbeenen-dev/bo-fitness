'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Calendar, Trophy, Layers } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { MuscleBodyDiagram } from '@/components/musclebodydiagram'

export type HistoryItem = {
  id: string
  scheduled_date: string
  status: string
  total_duration_min: number | null
  session_workouts: {
    id: string
    is_completed: boolean
    workouts: {
      name: string
      estimated_duration_min: number
      muscle_groups: {
        name: string
      } | null
    } | null
  }[]
}

function calculateSessionScore(session: HistoryItem): number {
  const items = session.session_workouts ?? []
  if (items.length === 0) return 0

  const completedCount = items.filter((i) => i.is_completed).length
  const completionRatio = completedCount / items.length
  const durationMin =
    session.total_duration_min ??
    items.reduce((sum, i) => sum + (i.workouts?.estimated_duration_min ?? 0), 0)

  const completionPoints = Math.round(completionRatio * 50)
  const durationPoints = Math.min(30, Math.round((durationMin / 60) * 30))
  const statusPoints = session.status === 'completed' ? 20 : 10

  return Math.min(100, completionPoints + durationPoints + statusPoints)
}

export function HistorieClient({
  initialSessions,
}: {
  initialSessions: HistoryItem[]
}) {
  const [sessions, setSessions] = useState<HistoryItem[]>(initialSessions)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(initialSessions.length === 10)

  async function loadOlderSessions() {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)

    const supabase = createClient()
    const from = sessions.length
    const to = from + 9

    const { data } = await supabase
      .from('training_sessions')
      .select(
        `
        id,
        scheduled_date,
        status,
        total_duration_min,
        session_workouts (
          id,
          is_completed,
          workouts (
            name,
            estimated_duration_min,
            muscle_groups ( name )
          )
        )
      `
      )
      .order('scheduled_date', { ascending: false })
      .range(from, to)

    const nextItems = (data ?? []) as unknown as HistoryItem[]

    setSessions((prev) => [...prev, ...nextItems])
    setHasMore(nextItems.length === 10)
    setLoadingMore(false)
  }

  return (
    <div className="space-y-4">
      {sessions.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-zinc-800 bg-zinc-900/70 p-8 text-center">
          <p className="text-base font-bold text-white">nog geen trainingen in historie</p>
          <p className="mt-1 text-sm text-zinc-400">
            plan een sessie in via de weekplanning om je historie op te bouwen.
          </p>
        </div>
      ) : (
        sessions.map((session) => {
          const muscles = Array.from(
            new Set(
              (session.session_workouts ?? [])
                .map((sw) => sw.workouts?.muscle_groups?.name)
                .filter((name): name is string => Boolean(name))
            )
          )
          const score = calculateSessionScore(session)
          const primaryMuscle = muscles[0] ?? null

          return (
            <article
              key={session.id}
              className="rounded-3xl border border-zinc-800 bg-zinc-900 p-5 transition-colors hover:border-zinc-700"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 text-sm font-extrabold text-white tabular-nums">
                      <Calendar className="h-4 w-4 text-emerald-400" />
                      {session.scheduled_date}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase ${
                        session.status === 'completed'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-zinc-800 text-zinc-300'
                      }`}
                    >
                      {session.status}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-zinc-500" />
                    {muscles.length > 0 ? (
                      muscles.map((m) => (
                        <span
                          key={m}
                          className="rounded-xl border border-emerald-500/25 bg-emerald-950/30 px-2.5 py-1 text-xs font-semibold text-emerald-300"
                        >
                          {m}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-zinc-500">geen spiergroep</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="rounded-2xl border border-emerald-500/30 bg-zinc-950 px-3.5 py-2 text-right">
                    <div className="flex items-center justify-end gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                      <Trophy className="h-3 w-3" />
                      <span>score</span>
                    </div>
                    <p className="text-xl font-extrabold text-white tabular-nums">
                      {score}
                    </p>
                  </div>

                  <MuscleBodyDiagram activeMuscleGroup={primaryMuscle} compact />
                </div>
              </div>

              {(session.session_workouts ?? []).length > 0 && (
                <div className="mt-4 flex flex-wrap gap-1.5 border-t border-zinc-800/90 pt-3">
                  {session.session_workouts.map((sw) => (
                    <Link
                      key={sw.id}
                      href={`/dashboard/log/${sw.id}`}
                      className="rounded-xl bg-zinc-950 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:text-emerald-300"
                    >
                      {sw.is_completed ? '✓ ' : ''}
                      {sw.workouts?.name ?? 'workout'}
                    </Link>
                  ))}
                </div>
              )}
            </article>
          )
        })
      )}

      {hasMore && (
        <button
          type="button"
          disabled={loadingMore}
          onClick={() => void loadOlderSessions()}
          className="min-h-12 w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-5 py-3 text-sm font-bold text-emerald-300 transition-all active:scale-[0.99] hover:border-emerald-500/50 hover:bg-zinc-800 disabled:opacity-40"
        >
          {loadingMore
            ? '10 oudere trainingen laden...'
            : '10 trainingen daarvoor weergeven'}
        </button>
      )}
    </div>
  )
}