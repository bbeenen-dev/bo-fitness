import { redirect } from 'next/navigation'
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
    <div className="space-y-6 p-4 sm:p-6">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400">
          weekoverzicht
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-white">
          weekplanner
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          sleep een sessie naar een andere dag om je planning (en optioneel latere sessies) te verschuiven.
        </p>
      </div>

      <WeekPlannerClient
        initialSessions={(sessions ?? []) as unknown as WeekSessionItem[]}
        weekDays={weekDays}
      />
    </div>
  )
}