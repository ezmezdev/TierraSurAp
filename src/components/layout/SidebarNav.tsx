'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Megaphone, CreditCard, User,
  MapPin, LogOut, Shield
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils/helpers'
import type { Profile } from '@/types'

const userLinks = [
  { href: '/dashboard', label: 'Inicio', icon: LayoutDashboard, exact: true },
  { href: '/dashboard/anuncios', label: 'Mis Anuncios', icon: Megaphone },
  { href: '/dashboard/pagos', label: 'Mis Pagos', icon: CreditCard },
  { href: '/dashboard/perfil', label: 'Mi Perfil', icon: User },
]

const adminLinks = [
  { href: '/admin', label: 'Panel Admin', icon: Shield, exact: true },
  { href: '/admin/anuncios', label: 'Anuncios', icon: Megaphone },
  { href: '/admin/usuarios', label: 'Usuarios', icon: User },
  { href: '/admin/pagos', label: 'Pagos', icon: CreditCard },
  { href: '/admin/logs', label: 'Logs', icon: LayoutDashboard },
]

export function SidebarNav({ profile }: { profile: Profile }) {
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
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-6 border-b border-stone-100">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center">
            <MapPin className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-stone-900" style={{ fontFamily: 'var(--font-display)' }}>
            BarrioAnuncios
          </span>
        </Link>
      </div>

      {/* Nav links */}
      <nav className="flex-1 p-4 space-y-1">
        {/* User section */}
        <p className="text-xs font-medium text-stone-400 uppercase tracking-wider px-3 mb-2">
          Mi cuenta
        </p>
        {userLinks.map(({ href, label, icon: Icon, exact }) => (
          <Link
            key={href}
            href={href}
            className={cn('sidebar-link', isActive(href, exact) && 'sidebar-link-active')}
          >
            <Icon className="w-4 h-4" />
            {label}
          </Link>
        ))}

        {/* Admin section */}
        {profile.role === 'admin' && (
          <>
            <div className="pt-4 pb-2">
              <p className="text-xs font-medium text-stone-400 uppercase tracking-wider px-3">
                Administración
              </p>
            </div>
            {adminLinks.map(({ href, label, icon: Icon, exact }) => (
              <Link
                key={href}
                href={href}
                className={cn('sidebar-link', isActive(href, exact) && 'sidebar-link-active')}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            ))}
          </>
        )}
      </nav>

      {/* User info + logout */}
      <div className="p-4 border-t border-stone-100">
        <div className="flex items-center gap-3 px-3 py-2 mb-2">
          <div className="w-8 h-8 bg-brand-100 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-brand-700 text-sm font-semibold">
              {profile.display_name?.[0]?.toUpperCase() ?? 'U'}
            </span>
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-medium text-stone-900 truncate">
              {profile.display_name}
            </p>
            <p className="text-xs text-stone-400 capitalize">{profile.role}</p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="sidebar-link w-full text-red-500 hover:text-red-700 hover:bg-red-50"
        >
          <LogOut className="w-4 h-4" />
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}
