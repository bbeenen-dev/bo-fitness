import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { createServerSupabase } from '@/lib/supabase/server'
import { HistorieClient, HistoryItem } from '@/components/historieclient'

export default async function HistoriePage() {
  const supabase = await createServerSupabase()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

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
    .range(0, 9)

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 py-5 pb-24 sm:px-6">
      <div className="flex items-center justify-between gap-3 rounded-3xl border border-zinc-800 bg-zinc-900 p-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-400">
            overzicht per 10
          </p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-white">
            trainingshistorie
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            laatste 10 trainingen met datum, spiergroepen en score.
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

      <HistorieClient
        initialSessions={(sessions ?? []) as unknown as HistoryItem[]}
      />
    </div>
  )
}