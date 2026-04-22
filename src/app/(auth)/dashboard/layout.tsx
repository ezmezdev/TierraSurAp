import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { SidebarNav } from '@/components/layout/SidebarNav'
import { TopBar } from '@/components/layout/TopBar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile || profile.is_banned) redirect('/login')

  return (
    <div className="min-h-screen bg-stone-50 flex">
      {/* Sidebar desktop */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 border-r border-stone-200 bg-white">
        <SidebarNav profile={profile} />
      </aside>

      {/* Main content */}
      <div className="flex-1 lg:pl-64">
        <TopBar profile={profile} />
        <main className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  )
}
