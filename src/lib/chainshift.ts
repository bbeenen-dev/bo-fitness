export type PlannerSessionRow = {
  id: string
  scheduled_date: string
  status: 'planned' | 'completed' | 'skipped' | string
  total_duration_min: number | null
  session_workouts: {
    id: string
    sort_order: number
    is_completed: boolean
    started_at: string | null
    ended_at: string | null
    workouts: {
      id: string
      name: string
      estimated_duration_min: number
      muscle_groups: {
        name: string
      } | null
    } | null
  }[]
}

export function addDaysToDateStr(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(Date.UTC(y, (m || 1) - 1, d || 1))
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

export function diffDaysDateStr(laterDateStr: string, earlierDateStr: string): number {
  const [y1, m1, d1] = laterDateStr.split('-').map(Number)
  const [y2, m2, d2] = earlierDateStr.split('-').map(Number)
  const t1 = Date.UTC(y1, (m1 || 1) - 1, d1 || 1)
  const t2 = Date.UTC(y2, (m2 || 1) - 1, d2 || 1)
  return Math.round((t1 - t2) / (1000 * 60 * 60 * 24))
}

/**
 * Verplaatst `sessionId` naar `targetDate` en schuift latere nog niet afgeronde
 * trainingen in een ketting door zodat er minimaal 1 rustdag tussen zit
 * (dus minimaal 2 dagen verschil tussen trainingsdata, bijv. maandag -> woensdag).
 */
export function computeChainShiftedSessions(
  sessions: PlannerSessionRow[],
  sessionId: string,
  targetDate: string,
  minRestDays = 1
): { updatedSessions: PlannerSessionRow[]; changedIds: string[] } {
  const minGapDays = minRestDays + 1 // 1 rustdag = minimaal 2 dagen tussen sessiedata

  const sorted = [...sessions].sort((a, b) =>
    a.scheduled_date.localeCompare(b.scheduled_date)
  )

  const movingSession = sorted.find((s) => s.id === sessionId)
  if (!movingSession || movingSession.status === 'completed') {
    return { updatedSessions: sessions, changedIds: [] }
  }

  const changedIds: string[] = []
  const nextMap = new Map<string, string>()

  for (const s of sorted) {
    nextMap.set(s.id, s.scheduled_date)
  }

  if (movingSession.scheduled_date !== targetDate) {
    nextMap.set(movingSession.id, targetDate)
    changedIds.push(movingSession.id)
  }

  // Laatste referentiedatum waarna volgende nog niet afgeronde sessies moeten komen
  let anchorDate = targetDate

  for (const s of sorted) {
    if (s.id === movingSession.id) continue
    if (s.status === 'completed') continue

    // Alleen latere sessies (op of na de oorspronkelijke datum van de verplaatste sessie) in de ketting meenemen
    if (s.scheduled_date < movingSession.scheduled_date && s.scheduled_date <= targetDate) {
      continue
    }

    const currentScheduled = nextMap.get(s.id) ?? s.scheduled_date
    const gap = diffDaysDateStr(currentScheduled, anchorDate)

    if (gap < minGapDays) {
      const shiftedDate = addDaysToDateStr(anchorDate, minGapDays)
      nextMap.set(s.id, shiftedDate)
      if (!changedIds.includes(s.id)) {
        changedIds.push(s.id)
      }
      anchorDate = shiftedDate
    } else {
      anchorDate = currentScheduled
    }
  }

  const updatedSessions = sessions.map((s) => ({
    ...s,
    scheduled_date: nextMap.get(s.id) ?? s.scheduled_date,
  }))

  return { updatedSessions, changedIds }
}