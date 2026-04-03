'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  GitBranch,
  Handshake,
  Building2,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Activity,
  Bell,
} from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, badge: null },
  { href: '/carteira', label: 'Carteira', icon: Users, badge: '10' },
  { href: '/regua', label: 'Régua', icon: GitBranch, badge: null },
  { href: '/negociacao', label: 'Negociação', icon: Handshake, badge: '4' },
  { href: '/credores', label: 'Credores', icon: Building2, badge: null },
  { href: '/portal', label: 'Portal Credor', icon: ExternalLink, badge: null },
]

export function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside
      className={cn(
        'relative flex flex-col h-screen shrink-0 transition-all duration-300 ease-in-out',
        'bg-surface border-r border-border-subtle',
        collapsed ? 'w-[60px]' : 'w-[220px]'
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          'flex items-center gap-3 border-b border-border-subtle',
          collapsed ? 'justify-center px-0 py-4' : 'px-4 py-4'
        )}
      >
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-accent shrink-0 glow-accent">
          <Activity className="w-4 h-4 text-white" strokeWidth={2.5} />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <div className="font-display font-bold text-ink-primary text-sm tracking-widest uppercase">
              GF Cobrar
            </div>
            <div className="font-mono text-ink-muted text-[10px] tracking-wider mt-0.5">
              MVP · v1.0
            </div>
          </div>
        )}
      </div>

      {/* Alerts pill */}
      {!collapsed && (
        <div className="mx-3 mt-3 mb-1 flex items-center gap-2 bg-amber-dim border border-amber/20 rounded-lg px-3 py-2">
          <Bell className="w-3.5 h-3.5 text-amber shrink-0" />
          <span className="text-amber text-xs font-medium">2 alertas urgentes</span>
          <div className="nav-active-dot ml-auto" style={{ background: '#f59e0b', boxShadow: '0 0 6px rgba(245,158,11,0.8)' }} />
        </div>
      )}

      {/* Navigation */}
      <nav className={cn('flex-1 overflow-y-auto', collapsed ? 'px-1 py-2' : 'px-2 py-2')}>
        <div className="space-y-0.5">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            const Icon = item.icon

            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={cn(
                  'group flex items-center rounded-lg transition-all duration-150',
                  collapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2.5',
                  isActive
                    ? 'bg-accent-dim text-accent-light'
                    : 'text-ink-secondary hover:bg-elevated hover:text-ink-primary'
                )}
              >
                <Icon
                  className={cn(
                    'shrink-0 transition-transform group-hover:scale-110',
                    collapsed ? 'w-5 h-5' : 'w-4 h-4',
                    isActive && 'text-accent-light'
                  )}
                />
                {!collapsed && (
                  <>
                    <span className="text-sm font-medium flex-1">{item.label}</span>
                    {item.badge && (
                      <span className="text-[10px] font-mono bg-elevated border border-border-default rounded px-1.5 py-0.5 text-ink-secondary">
                        {item.badge}
                      </span>
                    )}
                    {isActive && <div className="nav-active-dot" />}
                  </>
                )}
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Divider */}
      <div className="mx-3 border-t border-border-subtle" />

      {/* Operator info */}
      {!collapsed && (
        <div className="px-3 py-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-elevated border border-border-default flex items-center justify-center shrink-0">
              <span className="font-display font-bold text-xs text-ink-secondary">MV</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-ink-primary text-xs font-medium truncate">Marcos Vinicius</div>
              <div className="text-ink-muted text-[10px] flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald inline-block" />
                Operador
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Collapse button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className={cn(
          'flex items-center justify-center py-2.5 text-ink-muted hover:text-ink-secondary',
          'hover:bg-elevated transition-colors border-t border-border-subtle',
          collapsed ? 'w-full' : 'mx-2 mb-2 rounded-lg border-t-0'
        )}
      >
        {collapsed ? (
          <ChevronRight className="w-4 h-4" />
        ) : (
          <>
            <ChevronLeft className="w-3.5 h-3.5 mr-1.5" />
            <span className="text-xs">Recolher</span>
          </>
        )}
      </button>

      {/* Deerflow branding */}
      {!collapsed && (
        <div className="px-3 pb-3 flex justify-center">
          <a
            href="https://deerflow.tech"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] font-mono text-ink-disabled hover:text-ink-muted transition-colors"
          >
            ✦ Deerflow
          </a>
        </div>
      )}
    </aside>
  )
}
