import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { getCharacterImageUrl } from '../lib/supabase'
import {
  Search, Filter, Users, Swords, Copy, Mail, ExternalLink,
  ChevronDown, ChevronUp, X
} from 'lucide-react'

export default function MintedAssetsPage() {
  const [assets, setAssets] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterCharacter, setFilterCharacter] = useState('')
  const [filterBrand, setFilterBrand] = useState('')
  const [filterRarity, setFilterRarity] = useState('')
  const [sortField, setSortField] = useState('created_at')
  const [sortDir, setSortDir] = useState('desc')
  const [selectedUser, setSelectedUser] = useState(null)
  const [copiedId, setCopiedId] = useState(null)

  useEffect(() => {
    loadAssets()
  }, [])

  async function loadAssets() {
    try {
      const { data, error } = await supabase.rpc('get_minted_assets_admin')
      if (error) throw error
      setAssets(data || [])
    } catch (err) {
      console.error('Failed to load minted assets:', err)
    } finally {
      setLoading(false)
    }
  }

  // Derived data
  const characters = [...new Set(assets.map(a => a.character_name).filter(Boolean))].sort()
  const brands = [...new Set(assets.map(a => a.ip_brand_name).filter(Boolean))].sort()
  const uniqueOwners = [...new Set(assets.map(a => a.owner_email).filter(Boolean))]

  // Filter + search
  const filtered = assets.filter(a => {
    if (search) {
      const q = search.toLowerCase()
      const matchName = a.character_name?.toLowerCase().includes(q)
      const matchOwner = a.owner_email?.toLowerCase().includes(q)
      const matchOwnerName = a.owner_name?.toLowerCase().includes(q)
      const matchMint = `#${a.mint_number}`.includes(q)
      if (!matchName && !matchOwner && !matchOwnerName && !matchMint) return false
    }
    if (filterCharacter && a.character_name !== filterCharacter) return false
    if (filterBrand && a.ip_brand_name !== filterBrand) return false
    if (filterRarity && a.rarity !== filterRarity) return false
    return true
  })

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    let aVal = a[sortField] ?? ''
    let bVal = b[sortField] ?? ''
    if (sortField === 'mint_number') {
      aVal = a.mint_number ?? 0
      bVal = b.mint_number ?? 0
    }
    if (typeof aVal === 'string') aVal = aVal.toLowerCase()
    if (typeof bVal === 'string') bVal = bVal.toLowerCase()
    if (aVal < bVal) return sortDir === 'asc' ? -1 : 1
    if (aVal > bVal) return sortDir === 'asc' ? 1 : -1
    return 0
  })

  function toggleSort(field) {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  function SortIcon({ field }) {
    if (sortField !== field) return <ChevronDown size={12} className="text-white/10" />
    return sortDir === 'asc'
      ? <ChevronUp size={12} className="text-oga-green" />
      : <ChevronDown size={12} className="text-oga-green" />
  }

  function copyToClipboard(text, id) {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 1500)
  }

  // Group assets by owner for the selected user panel
  function getOwnerAssets(email) {
    return assets.filter(a => a.owner_email === email)
  }

  const rarityColors = {
    Common: 'bg-white/10 text-white/60',
    Rare: 'bg-blue-500/20 text-blue-400',
    Epic: 'bg-purple-500/20 text-purple-400',
    Legendary: 'bg-yellow-500/20 text-yellow-400',
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold uppercase tracking-wider mb-2">Minted Assets</h1>
          <p className="text-white/40">
            {filtered.length} asset{filtered.length !== 1 ? 's' : ''} across {uniqueOwners.length} owner{uniqueOwners.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Summary pills */}
        <div className="flex gap-3">
          <div className="oga-card px-4 py-2 text-center">
            <div className="text-2xl font-bold text-oga-green">{assets.length}</div>
            <div className="text-[10px] text-white/30 uppercase tracking-wider">Total</div>
          </div>
          <div className="oga-card px-4 py-2 text-center">
            <div className="text-2xl font-bold text-blue-400">{uniqueOwners.length}</div>
            <div className="text-[10px] text-white/30 uppercase tracking-wider">Owners</div>
          </div>
          <div className="oga-card px-4 py-2 text-center">
            <div className="text-2xl font-bold text-purple-400">{characters.length}</div>
            <div className="text-[10px] text-white/30 uppercase tracking-wider">Characters</div>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="oga-card p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="relative flex-1 min-w-[240px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by character, owner email, name, or mint #..."
              className="oga-input pl-10"
            />
          </div>

          {/* Character filter */}
          <select
            value={filterCharacter}
            onChange={(e) => setFilterCharacter(e.target.value)}
            className="oga-select w-44"
          >
            <option value="">All Characters</option>
            {characters.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          {/* Brand filter */}
          {brands.length > 0 && (
            <select
              value={filterBrand}
              onChange={(e) => setFilterBrand(e.target.value)}
              className="oga-select w-40"
            >
              <option value="">All Brands</option>
              {brands.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          )}

          {/* Rarity filter */}
          <select
            value={filterRarity}
            onChange={(e) => setFilterRarity(e.target.value)}
            className="oga-select w-36"
          >
            <option value="">All Rarities</option>
            <option value="Common">Common</option>
            <option value="Rare">Rare</option>
            <option value="Epic">Epic</option>
            <option value="Legendary">Legendary</option>
          </select>

          {/* Clear filters */}
          {(search || filterCharacter || filterBrand || filterRarity) && (
            <button
              onClick={() => { setSearch(''); setFilterCharacter(''); setFilterBrand(''); setFilterRarity('') }}
              className="text-xs text-white/30 hover:text-oga-green flex items-center gap-1 transition-colors"
            >
              <X size={12} /> Clear
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-6">
        {/* Main table */}
        <div className={`flex-1 ${selectedUser ? 'max-w-[calc(100%-360px)]' : ''}`}>
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="w-8 h-8 border-2 border-oga-green border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="oga-card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-oga-grey text-white/40 uppercase tracking-wider text-xs">
                    <th className="text-left p-4 cursor-pointer hover:text-white/60" onClick={() => toggleSort('character_name')}>
                      <div className="flex items-center gap-1">Character <SortIcon field="character_name" /></div>
                    </th>
                    <th className="text-left p-4 cursor-pointer hover:text-white/60" onClick={() => toggleSort('mint_number')}>
                      <div className="flex items-center gap-1">Mint # <SortIcon field="mint_number" /></div>
                    </th>
                    <th className="text-left p-4">Rarity</th>
                    <th className="text-left p-4 cursor-pointer hover:text-white/60" onClick={() => toggleSort('owner_email')}>
                      <div className="flex items-center gap-1">Owner <SortIcon field="owner_email" /></div>
                    </th>
                    <th className="text-left p-4">Brand</th>
                    <th className="text-left p-4 cursor-pointer hover:text-white/60" onClick={() => toggleSort('created_at')}>
                      <div className="flex items-center gap-1">Minted <SortIcon field="created_at" /></div>
                    </th>
                    <th className="text-right p-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((asset) => (
                    <tr
                      key={asset.asset_id}
                      className={`border-b border-oga-grey/50 hover:bg-white/5 transition-colors ${
                        selectedUser === asset.owner_email ? 'bg-oga-green/5' : ''
                      }`}
                    >
                      {/* Character */}
                      <td className="p-4">
                        <span className="font-bold uppercase tracking-wide">{asset.character_name}</span>
                      </td>

                      {/* Mint # */}
                      <td className="p-4">
                        <span className="font-mono text-oga-green font-bold">#{asset.mint_number}</span>
                      </td>

                      {/* Rarity */}
                      <td className="p-4">
                        {asset.rarity ? (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${rarityColors[asset.rarity] || rarityColors.Common}`}>
                            {asset.rarity}
                          </span>
                        ) : '—'}
                      </td>

                      {/* Owner */}
                      <td className="p-4">
                        <button
                          onClick={() => setSelectedUser(asset.owner_email)}
                          className="group text-left"
                        >
                          <div className="font-bold text-white group-hover:text-oga-green transition-colors truncate max-w-[180px]">
                            {asset.owner_name || 'Unknown'}
                          </div>
                          <div className="text-[10px] text-white/30 group-hover:text-white/50 truncate max-w-[180px]">
                            {asset.owner_email || '—'}
                          </div>
                        </button>
                      </td>

                      {/* Brand */}
                      <td className="p-4 text-white/40 text-xs">{asset.ip_brand_name || '—'}</td>

                      {/* Minted date */}
                      <td className="p-4 text-white/30 text-xs font-mono">{asset.created_at}</td>

                      {/* Actions */}
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => copyToClipboard(asset.asset_id, asset.asset_id)}
                            className="p-1.5 hover:bg-white/5 rounded transition-colors"
                            title="Copy asset ID"
                          >
                            <Copy size={13} className={copiedId === asset.asset_id ? 'text-oga-green' : 'text-white/20 hover:text-white/50'} />
                          </button>
                          <a
                            href={`https://oga.oneearthrising.com/#/asset/${asset.asset_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 hover:bg-white/5 rounded transition-colors"
                            title="View verification page"
                          >
                            <ExternalLink size={13} className="text-white/20 hover:text-white/50" />
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {sorted.length === 0 && (
                <div className="p-12 text-center text-white/30">
                  {assets.length > 0 ? 'No assets match your filters' : 'No minted assets yet'}
                </div>
              )}
            </div>
          )}
        </div>

        {/* User detail panel (slides in when an owner is clicked) */}
        {selectedUser && (
          <div className="w-[340px] flex-shrink-0">
            <UserPanel
              email={selectedUser}
              assets={getOwnerAssets(selectedUser)}
              onClose={() => setSelectedUser(null)}
              onCopy={copyToClipboard}
              copiedId={copiedId}
            />
          </div>
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// USER DETAIL PANEL
// ═══════════════════════════════════════════════════════════════

function UserPanel({ email, assets, onClose, onCopy, copiedId }) {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadProfile()
  }, [email])

  async function loadProfile() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, bio, avatar_url, email, session_id, starter_character, is_profile_complete, onboarding_status, scanner_role, is_team_member')
        .eq('email', email)
        .maybeSingle()
      if (error) throw error
      setProfile(data)
    } catch (err) {
      console.error('Failed to load profile:', err)
    } finally {
      setLoading(false)
    }
  }

  const ownerName = profile?.full_name || assets[0]?.owner_name || 'Unknown'
  const assetCount = assets.length
  const characters = [...new Set(assets.map(a => a.character_name))].join(', ')

  return (
    <div className="oga-card sticky top-8">
      {/* Header */}
      <div className="p-5 border-b border-oga-grey">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-white/40">User Profile</h3>
          <button onClick={onClose} className="p-1 hover:bg-white/5 rounded transition-colors">
            <X size={14} className="text-white/30" />
          </button>
        </div>

        {loading ? (
          <div className="py-6 flex justify-center">
            <div className="w-5 h-5 border-2 border-oga-green border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div>
            {/* Avatar + name */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-oga-black border border-oga-grey flex items-center justify-center overflow-hidden">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Users size={20} className="text-white/15" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-lg uppercase tracking-wide truncate">{ownerName}</div>
                <div className="text-xs text-white/30 truncate">{email}</div>
              </div>
            </div>

            {/* Badges */}
            <div className="flex flex-wrap gap-2 mb-4">
              {profile?.is_team_member && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-oga-green/10 text-oga-green">
                  Team
                </span>
              )}
              {profile?.scanner_role && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-500/10 text-purple-400">
                  {profile.scanner_role}
                </span>
              )}
              {profile?.is_profile_complete && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-400">
                  Profile Complete
                </span>
              )}
            </div>

            {/* Bio */}
            {profile?.bio && (
              <p className="text-xs text-white/40 mb-4 line-clamp-3">{profile.bio}</p>
            )}

            {/* Quick actions */}
            <div className="flex gap-2">
              <button
                onClick={() => onCopy(email, 'email-' + email)}
                className="flex-1 oga-btn-secondary text-xs py-2 flex items-center justify-center gap-1.5"
              >
                {copiedId === 'email-' + email ? (
                  <><span className="text-oga-green">Copied!</span></>
                ) : (
                  <><Copy size={12} /> Copy Email</>
                )}
              </button>
              <a
                href={`mailto:${email}`}
                className="flex-1 oga-btn-secondary text-xs py-2 flex items-center justify-center gap-1.5"
              >
                <Mail size={12} /> Email
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Owned assets */}
      <div className="p-5">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-[10px] font-bold uppercase tracking-widest text-white/30">
            Owned Assets ({assetCount})
          </h4>
        </div>
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {assets.map(a => (
            <div key={a.asset_id} className="flex items-center justify-between p-3 bg-oga-black rounded-lg border border-oga-grey/50">
              <div className="min-w-0">
                <div className="text-xs font-bold uppercase tracking-wide truncate">
                  {a.character_name} <span className="text-oga-green font-mono">#{a.mint_number}</span>
                </div>
                <div className="text-[10px] text-white/20">{a.created_at}</div>
              </div>
              <div className="flex items-center gap-1.5 ml-2">
                <button
                  onClick={() => onCopy(a.asset_id, a.asset_id)}
                  className="p-1 hover:bg-white/5 rounded"
                  title="Copy asset ID"
                >
                  <Copy size={11} className={copiedId === a.asset_id ? 'text-oga-green' : 'text-white/20'} />
                </button>
                <a
                  href={`https://oga.oneearthrising.com/#/asset/${a.asset_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1 hover:bg-white/5 rounded"
                  title="Verify"
                >
                  <ExternalLink size={11} className="text-white/20" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
