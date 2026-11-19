'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export type SessionWorkoutItem = {
  id: string
  sort_order: number
  is_completed: boolean
  started_at: string | null
  ended_at: string | null
  perceived_effort: 'light' | 'neutral' | 'heavy' | null
  workouts: {
    id: string
    name: string
    estimated_duration_min: number
    muscle_groups: {
      name: string
    } | null
  } | null
}

export function NextSessionList({
  initialItems,
}: {
  initialItems: SessionWorkoutItem[]
}) {
  const [items, setItems] = useState<SessionWorkoutItem[]>(initialItems)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [savingOrder, setSavingOrder] = useState(false)

  async function persistOrder(updated: SessionWorkoutItem[]) {
    setSavingOrder(true)
    const supabase = createClient()

    await Promise.all(
      updated.map((item, idx) =>
        supabase
          .from('session_workouts')
          .update({ sort_order: idx + 1 })
          .eq('id', item.id)
      )
    )

    setSavingOrder(false)
  }

  function handleDrop(targetIndex: number) {
    if (dragIndex === null || dragIndex === targetIndex) {
      setDragIndex(null)
      return
    }

    const updated = [...items]
    const [moved] = updated.splice(dragIndex, 1)
    updated.splice(targetIndex, 0, moved)

    const reindexed = updated.map((item, idx) => ({
      ...item,
      sort_order: idx + 1,
    }))

    setItems(reindexed)
    setDragIndex(null)
    void persistOrder(reindexed)
  }

  function moveItem(index: number, direction: -1 | 1) {
    const targetIndex = index + direction
    if (targetIndex < 0 || targetIndex >= items.length) return

    const updated = [...items]
    const [moved] = updated.splice(index, 1)
    updated.splice(targetIndex, 0, moved)

    const reindexed = updated.map((item, idx) => ({
      ...item,
      sort_order: idx + 1,
    }))

    setItems(reindexed)
    void persistOrder(reindexed)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1 text-xs text-zinc-400">
        <span>sleep een kaart of gebruik de pijlen om de volgorde aan te passen.</span>
        {savingOrder && (
          <span className="font-semibold text-emerald-400">volgorde opslaan...</span>
        )}
      </div>

      <div className="space-y-3">
        {items.map((item, index) => {
          const isCompleted = item.is_completed
          const isStarted = Boolean(item.started_at && !item.is_completed)

          return (
            <div
              key={item.id}
              draggable
              onDragStart={() => setDragIndex(index)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(index)}
              className={`flex items-center justify-between gap-3 rounded-2xl border p-4 transition-all ${
                isCompleted
                  ? 'border-emerald-500/40 bg-emerald-950/35 text-white'
                  : isStarted
                    ? 'border-amber-500/40 bg-zinc-900 text-white'
                    : 'border-zinc-800 bg-zinc-900 text-white hover:border-zinc-700'
              } ${dragIndex === index ? 'opacity-50' : ''}`}
            >
              <div className="flex items-center gap-3.5">
                <span
                  title="versleep om volgorde te wijzigen"
                  className="cursor-grab select-none text-lg text-zinc-500 hover:text-zinc-300 active:cursor-grabbing"
                >
                  ⋮⋮
                </span>

                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold tabular-nums ${
                    isCompleted
                      ? 'bg-emerald-500 text-zinc-950'
                      : 'bg-zinc-800 text-zinc-200'
                  }`}
                >
                  {isCompleted ? '✓' : index + 1}
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                      {item.workouts?.muscle_groups?.name ?? 'workout'}
                    </span>
                    {isCompleted && (
                      <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-300">
                        afgerond
                      </span>
                    )}
                    {isStarted && (
                      <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-amber-300">
                        bezig
                      </span>
                    )}
                  </div>

                  <p className="mt-0.5 text-base font-bold text-white">
                    {item.workouts?.name ?? 'onbekende workout'}
                  </p>
                  <p className="text-xs text-zinc-400 tabular-nums">
                    {item.workouts?.estimated_duration_min ?? 0} min geschat
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="flex flex-col gap-1">
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => moveItem(index, -1)}
                    aria-label="omhoog"
                    className="rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300 hover:bg-zinc-700 disabled:opacity-25"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    disabled={index === items.length - 1}
                    onClick={() => moveItem(index, 1)}
                    aria-label="omlaag"
                    className="rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300 hover:bg-zinc-700 disabled:opacity-25"
                  >
                    ↓
                  </button>
                </div>

                <Link
                  href={`/dashboard/log/${item.id}`}
                  className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
                    isCompleted
                      ? 'border border-emerald-500/50 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25'
                      : 'bg-emerald-500 text-zinc-950 hover:bg-emerald-400'
                  }`}
                >
                  {isCompleted ? 'bekijken' : isStarted ? 'hervatten' : 'openen'}
                </Link>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}