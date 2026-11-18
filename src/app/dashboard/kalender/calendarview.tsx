'use client'

import { useRouter } from 'next/navigation'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import type { Workout } from '@/lib/supabase/database'

export default function CalendarView({ workouts }: { workouts: Workout[] }) {
  const router = useRouter()

  const events = workouts.map((w) => ({
    id: w.id,
    title: w.title,
    date: w.workout_date,
    backgroundColor: '#10b981',
    borderColor: '#059669',
    textColor: '#020617',
  }))

  function handleEventClick(info: { event: { id: string } }) {
    if (info.event.id) {
      router.push(`/dashboard/log/${info.event.id}`)
    }
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-6 shadow-xl">
      <div className="calendar-container text-slate-100">
        <FullCalendar
          plugins={[dayGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          events={events}
          eventClick={handleEventClick}
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,dayGridWeek',
          }}
          height="auto"
          locale="nl"
        />
      </div>
    </div>
  )
}