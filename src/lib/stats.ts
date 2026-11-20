export type RawStatSession = {
  id: string
  scheduled_date: string
  status: string
  session_workouts: {
    id: string
    perceived_effort: 'light' | 'neutral' | 'heavy' | null
    workouts: {
      id: string
      name: string
      muscle_groups: {
        id: string
        name: string
        sort_order: number
      } | null
    } | null
    workout_sets: {
      weight_kg: number | null
      reps: number | null
    }[]
  }[]
}

export type WeeklyVolumePoint = {
  weekStart: string
  weekLabel: string
  totalKg: number
  sessionCount: number
}

export type MuscleGroupTotal = {
  muscleGroupId: string
  name: string
  sortOrder: number
  totalKg: number
  setCount: number
}

export type MuscleProgressionPoint = {
  date: string
  totalKg: number
  maxWeightKg: number
  effort: 'light' | 'neutral' | 'heavy' | null
  workoutNames: string[]
}

export type SetLogEntry = {
  date: string
  reps: number
  weightKg: number
}

export type WorkoutWeeklySetEntry = {
  muscleGroupId: string
  workoutId: string
  workoutName: string
  date: string
  sets: number
  weightKg: number
}

export type DashboardStatsData = {
  totalAllTimeKg: number
  totalSessionsCount: number
  weeklyVolume: WeeklyVolumePoint[]
  muscleGroupTotals: MuscleGroupTotal[]
  progressionByMuscle: Record<string, MuscleProgressionPoint[]>
  setLogs: SetLogEntry[]
  workoutWeeklySets: WorkoutWeeklySetEntry[]
}

function getMondayUtc(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(Date.UTC(y, (m || 1) - 1, d || 1))
  const day = date.getUTCDay()
  const diff = day === 0 ? -6 : 1 - day
  date.setUTCDate(date.getUTCDate() + diff)
  return date.toISOString().slice(0, 10)
}

export function buildDashboardStats(sessions: RawStatSession[]): DashboardStatsData {
  const weeklyMap = new Map<
    string,
    { totalKg: number; sessionIds: Set<string> }
  >()

  const muscleMap = new Map<
    string,
    {
      muscleGroupId: string
      name: string
      sortOrder: number
      totalKg: number
      setCount: number
    }
  >()

  // Per spiergroep en datum het volume en max gewicht bundelen
  const progressionMap = new Map<
    string,
    Map<
      string,
      {
        date: string
        totalKg: number
        maxWeightKg: number
        effort: 'light' | 'neutral' | 'heavy' | null
        workouts: Set<string>
      }
    >
  >()

  const setLogs: SetLogEntry[] = []
  const workoutWeeklySets: WorkoutWeeklySetEntry[] = []

  let totalAllTimeKg = 0
  const countedSessions = new Set<string>()

  for (const session of sessions) {
    const swList = session.session_workouts ?? []
    let sessionHasSets = false

    const weekStart = getMondayUtc(session.scheduled_date)
    if (!weeklyMap.has(weekStart)) {
      weeklyMap.set(weekStart, { totalKg: 0, sessionIds: new Set() })
    }

    for (const sw of swList) {
      const mg = sw.workouts?.muscle_groups
      const mgId = mg?.id ?? 'onbekend'
      const mgName = mg?.name ?? 'onbekend'
      const mgSort = mg?.sort_order ?? 99
      const workoutId = sw.workouts?.id ?? sw.id
      const workoutName = sw.workouts?.name ?? 'workout'

      if (!muscleMap.has(mgId)) {
        muscleMap.set(mgId, {
          muscleGroupId: mgId,
          name: mgName,
          sortOrder: mgSort,
          totalKg: 0,
          setCount: 0,
        })
      }

      if (!progressionMap.has(mgId)) {
        progressionMap.set(mgId, new Map())
      }
      const mgProgMap = progressionMap.get(mgId)!

      let swVolume = 0
      let swMaxWeight = 0
      let swSetsCount = 0

      // Per gewicht gegroepeerd aantal sets voor (sets * gewicht) per workout
      const setsPerWeight = new Map<number, number>()

      for (const set of sw.workout_sets ?? []) {
        const w = Number(set.weight_kg ?? 0)
        const r = Number(set.reps ?? 0)
        const vol = w * r

        if (w > 0 || r > 0) {
          swSetsCount += 1
          sessionHasSets = true
          setLogs.push({
            date: session.scheduled_date,
            reps: r,
            weightKg: w,
          })
          setsPerWeight.set(w, (setsPerWeight.get(w) ?? 0) + 1)
        }

        swVolume += vol
        if (w > swMaxWeight) {
          swMaxWeight = w
        }
      }

      for (const [weightVal, countVal] of setsPerWeight.entries()) {
        workoutWeeklySets.push({
          muscleGroupId: mgId,
          workoutId,
          workoutName,
          date: session.scheduled_date,
          sets: countVal,
          weightKg: weightVal,
        })
      }

      totalAllTimeKg += swVolume
      weeklyMap.get(weekStart)!.totalKg += swVolume

      const mEntry = muscleMap.get(mgId)!
      mEntry.totalKg += swVolume
      mEntry.setCount += swSetsCount

      if (swSetsCount > 0 || sw.perceived_effort) {
        if (!mgProgMap.has(session.scheduled_date)) {
          mgProgMap.set(session.scheduled_date, {
            date: session.scheduled_date,
            totalKg: 0,
            maxWeightKg: 0,
            effort: sw.perceived_effort,
            workouts: new Set(),
          })
        }
        const pEntry = mgProgMap.get(session.scheduled_date)!
        pEntry.totalKg += swVolume
        if (swMaxWeight > pEntry.maxWeightKg) {
          pEntry.maxWeightKg = swMaxWeight
        }
        if (sw.perceived_effort) {
          pEntry.effort = sw.perceived_effort
        }
        if (sw.workouts?.name) {
          pEntry.workouts.add(sw.workouts.name)
        }
      }
    }

    if (sessionHasSets || session.status === 'completed') {
      weeklyMap.get(weekStart)!.sessionIds.add(session.id)
      countedSessions.add(session.id)
    }
  }

  const weeklyVolume: WeeklyVolumePoint[] = Array.from(weeklyMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([weekStart, val]) => ({
      weekStart,
      weekLabel: `wk ${weekStart.slice(5)}`,
      totalKg: Math.round(val.totalKg * 10) / 10,
      sessionCount: val.sessionIds.size,
    }))

  const muscleGroupTotals: MuscleGroupTotal[] = Array.from(muscleMap.values())
    .sort((a, b) => b.totalKg - a.totalKg || a.sortOrder - b.sortOrder)
    .map((m) => ({
      ...m,
      totalKg: Math.round(m.totalKg * 10) / 10,
    }))

  const progressionByMuscle: Record<string, MuscleProgressionPoint[]> = {}
  for (const [mgId, dateMap] of progressionMap.entries()) {
    progressionByMuscle[mgId] = Array.from(dateMap.values())
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((p) => ({
        date: p.date,
        totalKg: Math.round(p.totalKg * 10) / 10,
        maxWeightKg: p.maxWeightKg,
        effort: p.effort,
        workoutNames: Array.from(p.workouts),
      }))
  }

  return {
    totalAllTimeKg: Math.round(totalAllTimeKg * 10) / 10,
    totalSessionsCount: countedSessions.size,
    weeklyVolume,
    muscleGroupTotals,
    progressionByMuscle,
    setLogs,
    workoutWeeklySets,
  }
}