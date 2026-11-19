import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase/server'
import { DashboardNav } from '@/components/dashboardnav'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createServerSupabase()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_approved')
    .eq('id', user.id)
    .single()

  if (!profile?.is_approved) {
    redirect('/pending')
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <DashboardNav userEmail={user.email} />
      <main className="mx-auto max-w-6xl">{children}</main>
    </div>
  )
}