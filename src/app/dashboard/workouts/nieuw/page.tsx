import WorkoutForm from '@/components/workout-form'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function NieuweWorkoutPage() {
  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/workouts"
          className="inline-flex items-center text-sm text-slate-400 hover:text-slate-100 transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Terug naar workouts
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-slate-100">Nieuwe Training</h1>
        <p className="text-sm text-slate-400">Registreer je oefeningen, gewichten en herhalingen.</p>
      </div>

      <WorkoutForm />
    </div>
  )
}