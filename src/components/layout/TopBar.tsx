'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X, MapPin, Bell, LogOut, LayoutDashboard, Megaphone, CreditCard, User } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils/helpers'
import type { Profile } from '@/types'

const navLinks = [
  { href: '/dashboard', label: 'Inicio', icon: LayoutDashboard, exact: true },
  { href: '/dashboard/anuncios', label: 'Mis Anuncios', icon: Megaphone },
  { href: '/dashboard/pagos', label: 'Mis Pagos', icon: CreditCard },
  { href: '/dashboard/perfil', label: 'Mi Perfil', icon: User },
]

export function TopBar({ profile }: { profile: Profile }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href)

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <>
      <header className="sticky top-0 z-40 bg-white border-b border-stone-200 lg:hidden">
        <div className="flex items-center justify-between px-4 h-14">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-brand-500 rounded-lg flex items-center justify-center">
              <MapPin className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-semibold text-stone-900 text-sm" style={{ fontFamily: 'var(--font-display)' }}>
              BarrioAnuncios
            </span>
          </Link>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 rounded-lg text-stone-600 hover:bg-stone-100"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="border-t border-stone-100 bg-white px-4 pb-4 pt-2 space-y-1">
            {navLinks.map(({ href, label, icon: Icon, exact }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={cn('sidebar-link', isActive(href, exact) && 'sidebar-link-active')}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            ))}
            <button
              onClick={handleSignOut}
              className="sidebar-link w-full text-red-500 hover:text-red-700 hover:bg-red-50"
            >
              <LogOut className="w-4 h-4" />
              Cerrar sesión
            </button>
          </div>
        )}
      </header>

      {/* Desktop top bar */}
      <div className="hidden lg:flex items-center justify-end px-8 py-4 border-b border-stone-100 bg-white">
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-medium text-stone-900">{profile.display_name}</p>
            <p className="text-xs text-stone-400 capitalize">{profile.role}</p>
          </div>
          <div className="w-9 h-9 bg-brand-100 rounded-full flex items-center justify-center">
            <span className="text-brand-700 text-sm font-semibold">
              {profile.display_name?.[0]?.toUpperCase() ?? 'U'}
            </span>
          </div>
        </div>
      </div>
    </>
  )
}
