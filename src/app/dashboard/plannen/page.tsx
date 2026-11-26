import { redirect } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase/server';
import { PlanWorkoutClient } from '@/components/planworkoutclient';

type SearchParams = Promise<{
  date?: string;
}>;

function isValidDateString(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function formatDisplayDate(dateStr: string): string {
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) {
    return dateStr;
  }
  const [y, m, d] = parts;
  return `${d}-${m}-${y}`;
}

export default async function PlannenPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const supabase = await createServerSupabase();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const resolvedSearchParams = await searchParams;
  const todayStr = new Date().toISOString().slice(0, 10);
  const initialDate = isValidDateString(resolvedSearchParams?.date)
    ? resolvedSearchParams.date
    : todayStr;

  const [{ data: muscleGroups }, { data: workouts }, { data: recentSessions }] =
    await Promise.all([
      supabase
        .from('muscle_groups')
        .select('id, name, allows_frequent_repeat, sort_order')
        .order('sort_order', { ascending: true }),
      supabase
        .from('workouts')
        .select(
          `
          id,
          name,
          estimated_duration_min,
          estimated_kcal,
          default_sets,
          muscle_group_id,
          muscle_groups ( id, name )
        `
        )
        .order('name', { ascending: true }),
      supabase
        .from('training_sessions')
        .select(
          `
          id,
          scheduled_date,
          status,
          session_workouts (
            workout_id,
            workouts (
              muscle_group_id
            )
          )
        `
        )
        .order('scheduled_date', { ascending: false })
        .limit(10),
    ]);

  return (
    <div className="min-h-screen bg-zinc-950 pb-24 text-white">
      <div className="mx-auto max-w-2xl space-y-4 px-4 pt-5 sm:px-6">
        <header className="space-y-1">
          <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
            TRAINING SAMENSTELLEN
          </h1>
          <p className="text-lg font-extrabold tracking-wide text-white tabular-nums">
            {formatDisplayDate(initialDate)}
          </p>
        </header>

        <PlanWorkoutClient
          todayStr={todayStr}
          initialDate={initialDate}
          muscleGroups={(muscleGroups ?? []) as never}
          workouts={(workouts ?? []) as never}
          recentSessions={(recentSessions ?? []) as never}
        />
      </div>
    </div>
  );
}