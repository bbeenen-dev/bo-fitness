import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { createServerSupabase } from '@/lib/supabase/server'
import {
  WeekPlannerClient,
  WeekSessionItem,
} from '@/components/weekplannerclient'

const DUTCH_DAYS = ['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za']

export default async function WeekPage() {
  const supabase = await createServerSupabase()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const now = new Date()
  const todayStr = now.toISOString().slice(0, 10)

  // Maandag van de huidige week berekenen
  const dayOfWeek = now.getUTCDay()
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const monday = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + diffToMonday)
  )

  const weekDays = Array.from({ length: 7 }, (_, idx) => {
    const dt = new Date(
      Date.UTC(monday.getUTCFullYear(), monday.getUTCMonth(), monday.getUTCDate() + idx)
    )
    const dateStr = dt.toISOString().slice(0, 10)
    return {
      dateStr,
      dayLabel: DUTCH_DAYS[dt.getUTCDay()],
      dayNumber: `${dt.getUTCDate()}/${dt.getUTCMonth() + 1}`,
      isToday: dateStr === todayStr,
    }
  })

  const startStr = weekDays[0].dateStr
  const endStr = weekDays[6].dateStr

  const { data: sessions } = await supabase
    .from('training_sessions')
    .select(
      `
      id,
      scheduled_date,
      status,
      total_duration_min,
      session_workouts (
        id,
        sort_order,
        is_completed,
        workouts (
          id,
          name,
          estimated_duration_min,
          muscle_groups ( name )
        )
      )
    `
    )
    .gte('scheduled_date', startStr)
    .lte('scheduled_date', endStr)
    .order('scheduled_date', { ascending: true })

  return (
    <div className="mx-auto max-w-6xl space-y-5 px-4 py-5 pb-24 sm:px-6">
      <div className="flex items-center justify-between gap-3 rounded-3xl border border-zinc-800 bg-zinc-900 p-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-400">
            huidige week
          </p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-white">
            weekplanning
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            tik op <span className="font-semibold text-emerald-400">+</span> op een dag om te plannen, of sleep een sessie naar een andere dag.
          </p>
        </div>

        <Link
          href="/dashboard"
          className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-2xl border border-zinc-700 bg-zinc-800 px-3.5 py-2.5 text-xs font-bold text-zinc-200 transition-colors hover:border-zinc-600"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>overzicht</span>
        </Link>
      </div>

      <WeekPlannerClient
        initialSessions={(sessions ?? []) as unknown as WeekSessionItem[]}
        weekDays={weekDays}
      />
    </div>
  )
}