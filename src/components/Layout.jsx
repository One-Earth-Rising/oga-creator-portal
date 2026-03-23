import { NavLink } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  LayoutDashboard,
  Users,
  Swords,
  Tag,
  Trophy,
  LogOut,
} from 'lucide-react'

const NAV_ITEMS = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/characters', icon: Swords, label: 'Characters' },
  { to: '/brands', icon: Tag, label: 'IP Brands' },
]

export default function Layout({ children }) {
  const { user, signOut } = useAuth()

  return (
    <div className="min-h-screen bg-oga-black flex">
      {/* Sidebar */}
      <aside className="w-64 bg-oga-charcoal border-r border-oga-grey flex flex-col fixed h-full z-10">
        {/* Logo */}
        <div className="p-6 border-b border-oga-grey">
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
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
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
      <main className="flex-1 ml-64 min-h-screen">
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
