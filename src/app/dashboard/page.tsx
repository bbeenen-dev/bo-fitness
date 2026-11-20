import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  Dumbbell,
  CalendarDays,
  ClipboardList,
  History,
  Library,
  ChevronRight,
} from 'lucide-react'
import { createServerSupabase } from '@/lib/supabase/server'

// Vervang dit pad door jouw eigen fitnessfoto in /public/images/...
const HERO_FITNESS_IMAGE = '/images/hero-fitness.jpg'

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
    <div className="min-h-screen bg-zinc-950 pb-24 text-white">
      <div className="mx-auto max-w-2xl">
        {/* 2) Blok strak tegen boven- en zijkanten met fitnessfoto + titel eroverheen */}
        <header className="relative h-48 w-full overflow-hidden bg-zinc-900 sm:h-56">
          <img
            src={HERO_FITNESS_IMAGE}
            alt="Bo-fitness App"
            className="h-full w-full object-cover object-center"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/55 to-zinc-950/25"
          />
          <div className="relative z-10 flex h-full flex-col justify-end px-4 pb-4 sm:px-6">
            <h1 className="text-3xl font-black tracking-tight text-white drop-shadow sm:text-4xl">
              Bo-fitness App
            </h1>
          </div>
        </header>

        <div className="space-y-4 px-4 pt-4 sm:px-6">
          {/* BLOK 1: Training vandaag */}
          {todaySession ? (
            <Link
              href={
                firstWorkout
                  ? `/dashboard/log/${firstWorkout.id}`
                  : '/dashboard/volgende'
              }
              className="group block rounded-3xl border border-emerald-500/40 bg-zinc-900 p-5 transition-all hover:border-emerald-400 active:scale-[0.99]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
                    <Dumbbell className="h-4 w-4" />
                    <span>Training vandaag</span>
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
                    <span>Training vandaag</span>
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

          {/* BLOK 2: Training plannen */}
          <Link
            href="/dashboard/week"
            className="group block rounded-3xl border border-zinc-800 bg-zinc-900 p-5 transition-all hover:border-emerald-500/40 active:scale-[0.99]"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
                  <CalendarDays className="h-4 w-4" />
                  <span>Training plannen</span>
                </div>
                <h2 className="text-lg font-bold text-white">
                  weekplanning huidige week
                </h2>
                <p className="text-sm tabular-nums text-zinc-400">
                  versleep trainingen of tik op{' '}
                  <span className="font-bold text-emerald-400">+</span> per dag •{' '}
                  {plannedCount ?? 0} gepland
                </p>
              </div>
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-zinc-700 bg-zinc-800 text-zinc-200 transition-colors group-hover:border-emerald-500/50 group-hover:text-emerald-400">
                <ChevronRight className="h-5 w-5" />
              </span>
            </div>
          </Link>

          {/* BLOK 2B (nieuw tussen Training plannen en Trainingshistorie): Workout historie */}
          <Link
            href="/dashboard/workout-historie"
            className="group block rounded-3xl border border-zinc-800 bg-zinc-900 p-5 transition-all hover:border-emerald-500/40 active:scale-[0.99]"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
                  <ClipboardList className="h-4 w-4" />
                  <span>Workout historie</span>
                </div>
                <h2 className="text-lg font-bold text-white">
                  sets, aantallen, gewicht &amp; totaal per spiergroep
                </h2>
                <p className="text-sm text-zinc-400">
                  klap een spiergroep open voor de laatste 5 weken (S, A, G, T)
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
            className="group block rounded-3xl border border-zinc-800 bg-zinc-900 p-5 transition-all hover:border-emerald-500/40 active:scale-[0.99]"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
                  <History className="h-4 w-4" />
                  <span>Trainingshistorie</span>
                </div>
                <h2 className="text-lg font-bold text-white">
                  laatste trainingen &amp; score
                </h2>
                <p className="text-sm tabular-nums text-zinc-400">
                  bekijk per 10 trainingen datum, spiergroepen en score •{' '}
                  {historyCount ?? 0} voltooid
                </p>
              </div>
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-zinc-700 bg-zinc-800 text-zinc-200 transition-colors group-hover:border-emerald-500/50 group-hover:text-emerald-400">
                <ChevronRight className="h-5 w-5" />
              </span>
            </div>
          </Link>

          {/* BLOK 4: Beheer Workouts */}
          <Link
            href="/dashboard/bibliotheek"
            className="group block rounded-3xl border border-zinc-800 bg-zinc-900 p-5 transition-all hover:border-emerald-500/40 active:scale-[0.99]"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
                  <Library className="h-4 w-4" />
                  <span>Beheer Workouts</span>
                </div>
                <h2 className="text-lg font-bold text-white">
                  spiergroepen &amp; workout-bibliotheek
                </h2>
                <p className="text-sm tabular-nums text-zinc-400">
                  beheer {muscleGroupCount ?? 0} spiergroepen en {workoutCount ?? 0}{' '}
                  workouts
                </p>
              </div>
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-zinc-700 bg-zinc-800 text-zinc-200 transition-colors group-hover:border-emerald-500/50 group-hover:text-emerald-400">
                <ChevronRight className="h-5 w-5" />
              </span>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}