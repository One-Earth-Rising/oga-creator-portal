import { useState, useEffect } from 'react'
import FeedbackWidget from './FeedbackWidget';
import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  LayoutDashboard,
  Users,
  Swords,
  Tag,
  Trophy,
  QrCode,
  LogOut,
  Menu,
  X,
  Shield,
} from 'lucide-react'

const NAV_ITEMS = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/characters', icon: Swords, label: 'Characters' },
  { to: '/brands', icon: Tag, label: 'IP Brands' },
  { to: '/assets', icon: Users, label: 'Minted Assets' },
  { to: '/scans', icon: QrCode, label: 'QR Scans' },
  { to: '/portal-passes', icon: Trophy, label: 'Portal Passes' },
  { to: '/factions', icon: Shield, label: 'Factions' },
]

export default function Layout({ children }) {
  const { user, signOut } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false)
  }, [location.pathname])

  // Close sidebar on escape key
  useEffect(() => {
    function handleEscape(e) {
      if (e.key === 'Escape') setSidebarOpen(false)
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [])

  // Prevent body scroll when sidebar open on mobile
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [sidebarOpen])

  return (
    <div className="min-h-screen bg-oga-black flex">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed h-full z-40 bg-oga-charcoal border-r border-oga-grey flex flex-col
        w-64 transition-transform duration-200 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
      `}>
        {/* Logo */}
        <div className="p-6 border-b border-oga-grey">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src="https://jmbzrbteizvuqwukojzu.supabase.co/storage/v1/object/public/oga-files/oga_logo.png"
                alt="OGA"
                className="w-10 h-10 object-contain"
              />
              <div>
                <div className="font-bold text-sm uppercase tracking-wider">Creator Portal</div>
                <div className="text-xs text-white/40">One Earth Rising</div>
              </div>
            </div>
            {/* Close button — mobile only */}
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-1 hover:bg-white/5 rounded transition-colors lg:hidden"
            >
              <X size={18} className="text-white/40" />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold uppercase tracking-wider transition-all duration-150 ${isActive
                  ? 'bg-oga-green/10 text-oga-green border border-oga-green/20'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User / Sign Out */}
        <div className="p-4 border-t border-oga-grey">
          <div className="text-xs text-white/40 mb-2 truncate">{user?.email}</div>
          <button
            onClick={signOut}
            className="flex items-center gap-2 text-sm text-white/40 hover:text-red-400 transition-colors w-full"
          >
            <LogOut size={14} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-h-screen lg:ml-64">
        {/* Mobile top bar */}
        <div className="sticky top-0 z-20 bg-oga-black/90 backdrop-blur-sm border-b border-oga-grey/50 px-4 py-3 flex items-center gap-3 lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 hover:bg-white/5 rounded-lg transition-colors"
          >
            <Menu size={20} className="text-white/60" />
          </button>
          <img
            src="https://jmbzrbteizvuqwukojzu.supabase.co/storage/v1/object/public/oga-files/oga_logo.png"
            alt="OGA"
            className="w-7 h-7 object-contain"
          />
          <span className="font-bold text-xs uppercase tracking-wider text-white/60">Creator Portal</span>
        </div>

        {/* Page content — responsive padding */}
        <div className="p-4 sm:p-6 lg:p-8">
          {children}
        </div>
        <FeedbackWidget />
      </main>
    </div>
  )
}