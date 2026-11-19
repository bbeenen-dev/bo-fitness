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
      <div className="flex items-center justify-between text-xs text-neutral-500">
        <span>sleep workouts om de volgorde te wijzigen of klik op een workout om te starten.</span>
        {savingOrder && <span className="font-medium text-emerald-700">volgorde opslaan...</span>}
      </div>

      <div className="space-y-2.5">
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
              className={`flex items-center justify-between gap-3 rounded-xl border p-4 transition-all ${
                isCompleted
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-950'
                  : 'border-neutral-200 bg-white text-neutral-900 hover:border-neutral-300'
              } ${dragIndex === index ? 'opacity-50' : ''}`}
            >
              <div className="flex items-center gap-3">
                <span
                  title="versleep om volgorde te wijzigen"
                  className="cursor-grab select-none text-lg text-neutral-400 active:cursor-grabbing"
                >
                  ⋮⋮
                </span>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                      {item.workouts?.muscle_groups?.name ?? 'workout'}
                    </span>
                    {isCompleted && (
                      <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[11px] font-medium text-white">
                        afgerond
                      </span>
                    )}
                    {isStarted && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                        bezig
                      </span>
                    )}
                  </div>

                  <p className="mt-0.5 text-base font-semibold">
                    {index + 1}. {item.workouts?.name ?? 'onbekende workout'}
                  </p>
                  <p className="text-xs text-neutral-500">
                    geschatte duur: {item.workouts?.estimated_duration_min ?? 0} min
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex flex-col gap-1">
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => moveItem(index, -1)}
                    aria-label="omhoog"
                    className="rounded border border-neutral-200 bg-white px-1.5 py-0.5 text-xs text-neutral-600 hover:bg-neutral-50 disabled:opacity-30"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    disabled={index === items.length - 1}
                    onClick={() => moveItem(index, 1)}
                    aria-label="omlaag"
                    className="rounded border border-neutral-200 bg-white px-1.5 py-0.5 text-xs text-neutral-600 hover:bg-neutral-50 disabled:opacity-30"
                  >
                    ↓
                  </button>
                </div>

                <Link
                  href={`/dashboard/log/${item.id}`}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    isCompleted
                      ? 'border border-emerald-600 bg-white text-emerald-700 hover:bg-emerald-100'
                      : 'bg-emerald-600 text-white hover:bg-emerald-700'
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