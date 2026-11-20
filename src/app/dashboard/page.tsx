import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  Dumbbell,
  CalendarDays,
  History,
  Library,
  ChevronRight,
  Sparkles,
} from 'lucide-react'
import { createServerSupabase } from '@/lib/supabase/server'
import { MuscleBodyDiagram } from '@/components/musclebodydiagram'

type TodaySession = {
  id: string
  scheduled_date: string
  status: string
  session_workouts: {
    id: string
    is_completed: boolean
    workouts: {
      name: string
      muscle_groups: { name: string } | null
    } | null
  }[]
}

export default async function DashboardHomePage() {
  const supabase = await createServerSupabase()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const todayStr = new Date().toISOString().slice(0, 10)

  const [
    { data: todaySessions },
    { count: plannedCount },
    { count: historyCount },
    { count: muscleGroupCount },
    { count: workoutCount },
  ] = await Promise.all([
    supabase
      .from('training_sessions')
      .select(
        `
        id,
        scheduled_date,
        status,
        session_workouts (
          id,
          is_completed,
          workouts (
            name,
            muscle_groups ( name )
          )
        )
      `
      )
      .eq('scheduled_date', todayStr)
      .order('id', { ascending: true })
      .limit(1),
    supabase
      .from('training_sessions')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'planned'),
    supabase
      .from('training_sessions')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'completed'),
    supabase.from('muscle_groups').select('id', { count: 'exact', head: true }),
    supabase.from('workouts').select('id', { count: 'exact', head: true }),
  ])

  const todaySession = ((todaySessions ?? [])[0] ?? null) as unknown as TodaySession | null
  const firstWorkout = todaySession?.session_workouts?.[0]
  const firstMuscleGroup = firstWorkout?.workouts?.muscle_groups?.name ?? null

  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-5 pb-24 sm:px-6">
      {/* Compacte welkomstheader op maat voor groot mobiel scherm */}
      <div className="relative overflow-hidden rounded-3xl border border-emerald-500/25 bg-gradient-to-br from-zinc-900 via-zinc-900 to-emerald-950/30 p-5 shadow-lg">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-300">
              <Sparkles className="h-3 w-3" />
              <span>BO FITNESS • VANDAAG {todayStr}</span>
            </div>
            <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-white">
              jouw trainingshub
            </h1>
          </div>
          <MuscleBodyDiagram activeMuscleGroup={firstMuscleGroup} compact />
        </div>
      </div>

      {/* BLOK 1: Training vandaag */}
      {todaySession ? (
        <Link
          href={
            firstWorkout
              ? `/dashboard/log/${firstWorkout.id}`
              : '/dashboard/volgende'
          }
          className="group block rounded-3xl border border-emerald-500/40 bg-zinc-900 p-5 transition-all active:scale-[0.99] hover:border-emerald-400"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
                <Dumbbell className="h-4 w-4" />
                <span>1. training vandaag</span>
              </div>
              <h2 className="text-xl font-bold text-white">
                {firstWorkout?.workouts?.name ?? 'training van vandaag starten'}
              </h2>
              <p className="text-sm text-zinc-400">
                {todaySession.session_workouts?.length ?? 0} onderdeel/onderdelen
                {firstMuscleGroup ? ` • ${firstMuscleGroup}` : ''}
              </p>
            </div>
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-500 text-zinc-950 transition-transform group-hover:translate-x-0.5">
              <ChevronRight className="h-5 w-5" />
            </span>
          </div>
        </Link>
      ) : (
        <div className="rounded-3xl border border-zinc-800 bg-zinc-900/90 p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-400">
                <Dumbbell className="h-4 w-4 text-emerald-400" />
                <span>1. training vandaag</span>
              </div>
              <h2 className="mt-1.5 text-lg font-bold text-white">
                vandaag geen training
              </h2>
              <p className="mt-0.5 text-sm text-zinc-400">
                geniet van je herstel of plan direct een sessie in je week.
              </p>
            </div>
            <Link
              href="/dashboard/week"
              className="shrink-0 rounded-2xl border border-zinc-700 bg-zinc-800 px-3.5 py-2.5 text-xs font-bold text-emerald-300 transition-colors hover:border-emerald-500/50"
            >
              naar week
            </Link>
          </div>
        </div>
      )}

      {/* BLOK 2: Training plannen -> Weekplanning huidige week */}
      <Link
        href="/dashboard/week"
        className="group block rounded-3xl border border-zinc-800 bg-zinc-900 p-5 transition-all active:scale-[0.99] hover:border-emerald-500/40"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
              <CalendarDays className="h-4 w-4" />
              <span>2. training plannen</span>
            </div>
            <h2 className="text-lg font-bold text-white">
              weekplanning huidige week
            </h2>
            <p className="text-sm text-zinc-400 tabular-nums">
              versleep trainingen of tik op <span className="font-bold text-emerald-400">+</span> per dag • {plannedCount ?? 0} gepland
            </p>
          </div>
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-zinc-700 bg-zinc-800 text-zinc-200 transition-colors group-hover:border-emerald-500/50 group-hover:text-emerald-400">
            <ChevronRight className="h-5 w-5" />
          </span>
        </div>
      </Link>

      {/* BLOK 3: Trainingshistorie */}
      <Link
        href="/dashboard/historie"
        className="group block rounded-3xl border border-zinc-800 bg-zinc-900 p-5 transition-all active:scale-[0.99] hover:border-emerald-500/40"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
              <History className="h-4 w-4" />
              <span>3. trainingshistorie</span>
            </div>
            <h2 className="text-lg font-bold text-white">
              laatste trainingen &amp; score
            </h2>
            <p className="text-sm text-zinc-400 tabular-nums">
              bekijk per 10 trainingen datum, spiergroepen en score • {historyCount ?? 0} voltooid
            </p>
          </div>
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-zinc-700 bg-zinc-800 text-zinc-200 transition-colors group-hover:border-emerald-500/50 group-hover:text-emerald-400">
            <ChevronRight className="h-5 w-5" />
          </span>
        </div>
      </Link>

      {/* BLOK 4: Trainingen beheer (Bibliotheek) */}
      <Link
        href="/dashboard/bibliotheek"
        className="group block rounded-3xl border border-zinc-800 bg-zinc-900 p-5 transition-all active:scale-[0.99] hover:border-emerald-500/40"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
              <Library className="h-4 w-4" />
              <span>4. trainingen beheer</span>
            </div>
            <h2 className="text-lg font-bold text-white">
              spiergroepen &amp; workout-bibliotheek
            </h2>
            <p className="text-sm text-zinc-400 tabular-nums">
              beheer {muscleGroupCount ?? 0} spiergroepen en {workoutCount ?? 0} workouts
            </p>
          </div>
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-zinc-700 bg-zinc-800 text-zinc-200 transition-colors group-hover:border-emerald-500/50 group-hover:text-emerald-400">
            <ChevronRight className="h-5 w-5" />
          </span>
        </div>
      </Link>
    </div>
  )
}