export type MuscleGroupRow = {
  id: string
  name: string
  allows_frequent_repeat: boolean
  sort_order: number
}

export type WorkoutRow = {
  id: string
  muscle_group_id: string
  name: string
  estimated_duration_min: number
  estimated_kcal: number | null
  default_sets: number
}

export type HistorySession = {
  id: string
  scheduled_date: string
  status: string
  session_workouts: {
    workout_id: string
    workouts: {
      id: string
      muscle_group_id: string
    } | null
  }[]
}

export type AutoPlanSuggestion = {
  suggestedDate: string
  workouts: WorkoutRow[]
  totalMinutes: number
  reasonSummary: string[]
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00`)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

export function generateAutoPlan({
  todayStr,
  muscleGroups,
  workouts,
  sessions,
  maxMinutes = 75,
}: {
  todayStr: string
  muscleGroups: MuscleGroupRow[]
  workouts: WorkoutRow[]
  sessions: HistorySession[]
  maxMinutes?: number
}): AutoPlanSuggestion {
  const sortedSessions = [...sessions].sort((a, b) =>
    a.scheduled_date.localeCompare(b.scheduled_date)
  )

  // 1. Bepaal eerstvolgende geldige trainingsdatum (minimaal 1 rustdag)
  let suggestedDate = todayStr
  const lastSession = sortedSessions[sortedSessions.length - 1]
  if (lastSession) {
    const minNextDate = addDays(lastSession.scheduled_date, 2)
    if (minNextDate > suggestedDate) {
      suggestedDate = minNextDate
    }
  }

  // 2. Spiergroepen uit de allerlaatste sessie (mogen niet direct herhaald worden)
  const lastSessionMuscleIds = new Set<string>()
  if (lastSession) {
    for (const sw of lastSession.session_workouts) {
      if (sw.workouts?.muscle_group_id) {
        lastSessionMuscleIds.add(sw.workouts.muscle_group_id)
      }
    }
  }

  // 3. Tel frequentie in de afgelopen 7 dagen en onthoud laatste gebruik per workout
  const sevenDaysAgo = addDays(suggestedDate, -7)
  const countLast7Days = new Map<string, number>()
  const lastUsedWorkoutDate = new Map<string, string>()

  for (const s of sortedSessions) {
    for (const sw of s.session_workouts) {
      const mgId = sw.workouts?.muscle_group_id
      if (mgId && s.scheduled_date >= sevenDaysAgo) {
        countLast7Days.set(mgId, (countLast7Days.get(mgId) ?? 0) + 1)
      }
      if (sw.workout_id) {
        lastUsedWorkoutDate.set(sw.workout_id, s.scheduled_date)
      }
    }
  }

  const chosenWorkouts: WorkoutRow[] = []
  let totalMinutes = 0
  const reasonSummary: string[] = []

  // 4. Altijd Core meenemen als die bestaat en binnen limiet past
  const coreGroup = muscleGroups.find((m) => m.allows_frequent_repeat)
  if (coreGroup) {
    const coreWorkout = workouts.find((w) => w.muscle_group_id === coreGroup.id)
    if (coreWorkout && totalMinutes + coreWorkout.estimated_duration_min <= maxMinutes) {
      chosenWorkouts.push(coreWorkout)
      totalMinutes += coreWorkout.estimated_duration_min
      reasonSummary.push(`${coreGroup.name} standaard meegenomen (${coreWorkout.estimated_duration_min} min).`)
    }
  }

  // 5. Sorteer overige spiergroepen op minst getraind in afgelopen 7 dagen
  const candidateGroups = muscleGroups
    .filter((m) => !m.allows_frequent_repeat && !lastSessionMuscleIds.has(m.id))
    .sort((a, b) => {
      const diff = (countLast7Days.get(a.id) ?? 0) - (countLast7Days.get(b.id) ?? 0)
      return diff !== 0 ? diff : a.sort_order - b.sort_order
    })

  // 6. Kies per top-spiergroep tot 2 workouts zolang we binnen 75 min blijven
  for (const group of candidateGroups) {
    const groupWorkouts = workouts
      .filter((w) => w.muscle_group_id === group.id)
      .sort((a, b) => {
        const dateA = lastUsedWorkoutDate.get(a.id) ?? '0000-00-00'
        const dateB = lastUsedWorkoutDate.get(b.id) ?? '0000-00-00'
        return dateA.localeCompare(dateB)
      })

    if (groupWorkouts.length === 0) continue

    const primary = groupWorkouts[0]
    if (totalMinutes + primary.estimated_duration_min <= maxMinutes) {
      chosenWorkouts.push(primary)
      totalMinutes += primary.estimated_duration_min
      const times = countLast7Days.get(group.id) ?? 0
      reasonSummary.push(
        `${group.name}: ${times === 0 ? 'nog niet getraind afgelopen 7 dagen' : `${times}x getraind afgelopen 7 dagen`}.`
      )
    }

    // Voeg eventueel een tweede oefening van deze spiergroep toe als er nog ruimte is
    const secondary = groupWorkouts[1]
    if (secondary && totalMinutes + secondary.estimated_duration_min <= maxMinutes && chosenWorkouts.length < 4) {
      chosenWorkouts.push(secondary)
      totalMinutes += secondary.estimated_duration_min
    }
  }

  // Zet Core netjes achteraan als afsluiter
  const nonCore = chosenWorkouts.filter((w) => w.muscle_group_id !== coreGroup?.id)
  const coreOnly = chosenWorkouts.filter((w) => w.muscle_group_id === coreGroup?.id)

  return {
    suggestedDate,
    workouts: [...nonCore, ...coreOnly],
    totalMinutes,
    reasonSummary,
  }
}