import { NextResponse, type NextRequest } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  
  // Stuur standaard door naar je workouts dashboard in plaats van '/'
  const next = searchParams.get('next') ?? '/dashboard/workouts'

  if (code) {
    const supabase = await createServerSupabase()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Optioneel: check of we op Vercel zitten via x-forwarded-host voor de juiste origin
      const forwardedHost = request.headers.get('x-forwarded-host')
      const targetOrigin = forwardedHost ? `https://${forwardedHost}` : origin

      return NextResponse.redirect(`${targetOrigin}${next}`)
    }
  }

  // Als de code ongeldig is of er is een error, stuur terug naar login
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}