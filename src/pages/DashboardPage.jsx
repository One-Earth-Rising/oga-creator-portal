import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Swords, Users, Tag, QrCode } from 'lucide-react'

export default function DashboardPage() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [])

  async function loadStats() {
    try {
      const [charsRes, brandsRes, assetsRes, scansRes] = await Promise.all([
        supabase.from('characters').select('id', { count: 'exact', head: true }),
        supabase.from('ip_brands').select('id', { count: 'exact', head: true }),
        supabase.from('oga_assets').select('id', { count: 'exact', head: true }),
        supabase.from('asset_scans').select('id', { count: 'exact', head: true }),
      ])
      setStats({
        characters: charsRes.count ?? 0,
        brands: brandsRes.count ?? 0,
        assets: assetsRes.count ?? 0,
        scans: scansRes.count ?? 0,
      })
    } catch (err) {
      console.error('Failed to load stats:', err)
      setStats({ characters: 0, brands: 0, assets: 0, scans: 0 })
    } finally {
      setLoading(false)
    }
  }

  const cards = [
    { label: 'Characters', value: stats?.characters, icon: Swords, to: '/characters', color: 'text-oga-green' },
    { label: 'IP Brands', value: stats?.brands, icon: Tag, to: '/brands', color: 'text-blue-400' },
    { label: 'Minted Assets', value: stats?.assets, icon: Users, to: '/assets', color: 'text-purple-400' },
    { label: 'QR Scans', value: stats?.scans, icon: QrCode, to: '/scans', color: 'text-yellow-400' },
  ]

  return (
    <div>
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-3xl font-bold uppercase tracking-wider mb-2">Dashboard</h1>
        <p className="text-white/40">OGA Creator Portal — internal management tools</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {cards.map(({ label, value, icon: Icon, to, color }) => {
          const Wrapper = to ? Link : 'div'
          const wrapperProps = to ? { to } : {}
          return (
            <Wrapper
              key={label}
              {...wrapperProps}
              className="oga-card p-6 hover:border-oga-green/40 transition-colors group"
            >
              <div className="flex items-center justify-between mb-4">
                <Icon size={24} className={`${color} opacity-60 group-hover:opacity-100 transition-opacity`} />
                {to && (
                  <span className="text-xs text-white/20 uppercase tracking-wider group-hover:text-oga-green transition-colors">
                    View →
                  </span>
                )}
              </div>
              <div className="text-3xl font-bold text-oga-green mb-1">
                {loading ? '—' : (value ?? 0).toLocaleString()}
              </div>
              <div className="text-sm text-white/40 uppercase tracking-wider">{label}</div>
            </Wrapper>
          )
        })}
      </div>

      {/* Quick Actions */}
      <div className="oga-card p-6">
        <h2 className="text-lg font-bold uppercase tracking-wider mb-6">Quick Actions</h2>
        <div className="flex flex-wrap gap-4">
          <Link to="/characters/new" className="oga-btn-primary text-sm">
            + New Character
          </Link>
          <Link to="/brands" className="oga-btn-secondary text-sm">
            Manage Brands
          </Link>
        </div>
      </div>
    </div>
  )
}
