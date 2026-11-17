'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  async function handleGoogleLogin() {
    setLoading(true)
    setErrorMsg(null)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setErrorMsg(error.message)
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-xl">
        <h1 className="text-2xl font-bold tracking-tight">BO Fitness</h1>
        <p className="mt-2 text-sm text-slate-400">
          Log in met je Google-account om je trainingen en voortgang te bekijken.
        </p>

        {errorMsg && (
          <p className="mt-4 rounded-lg border border-red-800 bg-red-950/60 p-3 text-sm text-red-300">
            {errorMsg}
          </p>
        )}

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          className="mt-6 flex w-full items-center justify-center gap-3 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'Bezig met doorsturen...' : 'Doorgaan met Google'}
        </button>
      </div>
    </main>
  )
}