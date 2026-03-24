import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import {
  Shield, Users, Crown, ChevronDown, ChevronUp,
  Plus, Loader2, UserCircle, Star, Hash
} from 'lucide-react'

export default function FactionsPage() {
  const [factions, setFactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [expandedId, setExpandedId] = useState(null)
  const [members, setMembers] = useState({})
  const [loadingMembers, setLoadingMembers] = useState(null)
  const [showCreate, setShowCreate] = useState(false)

  useEffect(() => { loadFactions() }, [])

  async function loadFactions() {
    try {
      const { data, error } = await supabase.rpc('get_factions_admin')
      if (error) throw error
      if (data?.error) throw new Error(data.error)
      setFactions(data || [])
    } catch (err) {
      console.error('Failed to load factions:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function toggleExpand(factionId) {
    if (expandedId === factionId) {
      setExpandedId(null)
      return
    }
    setExpandedId(factionId)

    if (!members[factionId]) {
      setLoadingMembers(factionId)
      try {
        const { data, error } = await supabase.rpc('get_faction_members', {
          p_faction_id: factionId
        })
        if (error) throw error
        setMembers(prev => ({ ...prev, [factionId]: data || [] }))
      } catch (err) {
        console.error('Failed to load members:', err)
      } finally {
        setLoadingMembers(null)
      }
    }
  }

  // ── Create Faction Form State ──
  const [createForm, setCreateForm] = useState({
    name: '', slug: '', description: '', ip_affinity: '', accent_color: '#39FF14'
  })
  const [creating, setCreating] = useState(false)

  function updateCreate(field, value) {
    setCreateForm(prev => ({ ...prev, [field]: value }))
    // Auto-generate slug from name
    if (field === 'name') {
      setCreateForm(prev => ({
        ...prev,
        [field]: value,
        slug: value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
      }))
    }
  }

  async function handleCreate() {
    if (!createForm.name.trim() || !createForm.slug.trim()) return
    setCreating(true)
    try {
      const { data, error } = await supabase.rpc('create_faction', {
        p_name: createForm.name.trim(),
        p_slug: createForm.slug.trim(),
        p_description: createForm.description || null,
        p_ip_affinity: createForm.ip_affinity || null,
        p_accent_color: createForm.accent_color || null,
      })
      if (error) throw error
      if (data?.error) throw new Error(data.error)
      setCreateForm({ name: '', slug: '', description: '', ip_affinity: '', accent_color: '#39FF14' })
      setShowCreate(false)
      loadFactions()
    } catch (err) {
      console.error('Create failed:', err)
      setError(err.message)
    } finally {
      setCreating(false)
    }
  }

  // ── Stats ──
  const totalMembers = factions.reduce((sum, f) => sum + parseInt(f.member_count || 0), 0)
  const activeFactions = factions.filter(f => f.is_active).length
  const largestFaction = factions.length
    ? factions.reduce((a, b) => (parseInt(a.member_count) > parseInt(b.member_count) ? a : b))
    : null

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-2 border-oga-green border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold uppercase tracking-wider">Factions</h1>
          <p className="text-white/30 text-sm mt-1">Community groups seeded from IP affinity data</p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="oga-btn-primary flex items-center gap-2"
        >
          <Plus size={16} />
          New Faction
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 bg-red-400/10 border border-red-400/30 rounded-lg text-red-400 text-sm">
          {error}
          <button onClick={() => setError(null)} className="ml-4 underline">Dismiss</button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="oga-card p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-oga-green/10 flex items-center justify-center">
              <Shield size={20} className="text-oga-green" />
            </div>
            <div>
              <p className="text-white/40 text-xs uppercase tracking-wider">Active Factions</p>
              <p className="text-2xl font-bold text-oga-green">{activeFactions}</p>
            </div>
          </div>
        </div>
        <div className="oga-card p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-oga-green/10 flex items-center justify-center">
              <Users size={20} className="text-oga-green" />
            </div>
            <div>
              <p className="text-white/40 text-xs uppercase tracking-wider">Total Members</p>
              <p className="text-2xl font-bold text-oga-green">{totalMembers}</p>
            </div>
          </div>
        </div>
        <div className="oga-card p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-oga-green/10 flex items-center justify-center">
              <Crown size={20} className="text-oga-green" />
            </div>
            <div>
              <p className="text-white/40 text-xs uppercase tracking-wider">Largest Faction</p>
              <p className="text-2xl font-bold text-oga-green">
                {largestFaction ? largestFaction.name : '—'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Create Form */}
      {showCreate && (
        <div className="oga-card p-6 mb-8 border-oga-green/30">
          <h2 className="text-lg font-bold uppercase tracking-wider mb-6">Create Faction</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="oga-label">Faction Name</label>
              <input
                type="text"
                value={createForm.name}
                onChange={e => updateCreate('name', e.target.value)}
                placeholder="e.g. Plague Hunters"
                className="oga-input"
              />
            </div>
            <div>
              <label className="oga-label">Slug</label>
              <input
                type="text"
                value={createForm.slug}
                onChange={e => updateCreate('slug', e.target.value)}
                className="oga-input font-mono"
                placeholder="auto-generated"
              />
            </div>
            <div>
              <label className="oga-label">IP Affinity</label>
              <input
                type="text"
                value={createForm.ip_affinity}
                onChange={e => updateCreate('ip_affinity', e.target.value)}
                placeholder="e.g. Plague Hunters"
                className="oga-input"
              />
            </div>
            <div>
              <label className="oga-label">Accent Color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={createForm.accent_color}
                  onChange={e => updateCreate('accent_color', e.target.value)}
                  className="w-12 h-12 rounded-lg border border-oga-grey cursor-pointer bg-transparent"
                />
                <input
                  type="text"
                  value={createForm.accent_color}
                  onChange={e => updateCreate('accent_color', e.target.value)}
                  className="oga-input flex-1 font-mono text-sm"
                />
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="oga-label">Description</label>
              <textarea
                value={createForm.description}
                onChange={e => updateCreate('description', e.target.value)}
                placeholder="What this faction is about..."
                className="oga-textarea"
                rows={2}
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 mt-6">
            <button
              onClick={() => setShowCreate(false)}
              className="px-4 py-2 rounded-lg border border-oga-grey text-white/50 text-sm font-bold uppercase hover:border-white/30 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={creating || !createForm.name.trim()}
              className="oga-btn-primary flex items-center gap-2"
            >
              {creating ? <Loader2 size={14} className="animate-spin" /> : <Shield size={14} />}
              {creating ? 'Creating...' : 'Create Faction'}
            </button>
          </div>
        </div>
      )}

      {/* Faction Cards */}
      {factions.length === 0 ? (
        <div className="oga-card p-12 text-center">
          <Shield size={48} className="mx-auto text-white/10 mb-4" />
          <p className="text-white/30">No factions yet. Create one or seed from IP affinity data.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {factions.map(faction => {
            const isExpanded = expandedId === faction.id
            const factionMembers = members[faction.id] || []
            const memberCount = parseInt(faction.member_count || 0)
            const capacityPct = Math.round((memberCount / (faction.max_members || 150)) * 100)

            return (
              <div key={faction.id} className="oga-card overflow-hidden">
                {/* Faction Header — clickable */}
                <button
                  onClick={() => toggleExpand(faction.id)}
                  className="w-full p-6 flex items-center gap-5 text-left hover:bg-white/[0.02] transition-colors"
                >
                  {/* Accent color bar */}
                  <div
                    className="w-2 h-16 rounded-full flex-shrink-0"
                    style={{ backgroundColor: faction.accent_color || '#39FF14' }}
                  />

                  {/* Icon */}
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: (faction.accent_color || '#39FF14') + '15' }}
                  >
                    <Shield size={24} style={{ color: faction.accent_color || '#39FF14' }} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-bold uppercase tracking-wider truncate">
                        {faction.name}
                      </h3>
                      {!faction.is_active && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-red-400/10 text-red-400 border border-red-400/20">
                          Inactive
                        </span>
                      )}
                    </div>
                    {faction.description && (
                      <p className="text-white/30 text-sm mt-0.5 truncate">{faction.description}</p>
                    )}
                    <div className="flex items-center gap-4 mt-2">
                      {faction.ip_affinity && (
                        <span className="text-xs text-white/40 flex items-center gap-1">
                          <Star size={10} /> {faction.ip_affinity}
                        </span>
                      )}
                      <span className="text-xs text-white/40 flex items-center gap-1">
                        <Hash size={10} /> {faction.slug}
                      </span>
                    </div>
                  </div>

                  {/* Member count + capacity bar */}
                  <div className="flex-shrink-0 text-right mr-4">
                    <div className="flex items-center gap-2 justify-end">
                      <Users size={14} className="text-white/30" />
                      <span className="text-xl font-bold" style={{ color: faction.accent_color || '#39FF14' }}>
                        {memberCount}
                      </span>
                      <span className="text-white/20 text-sm">/ {faction.max_members || 150}</span>
                    </div>
                    {/* Capacity bar */}
                    <div className="w-32 h-1.5 bg-white/5 rounded-full mt-2">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min(capacityPct, 100)}%`,
                          backgroundColor: faction.accent_color || '#39FF14'
                        }}
                      />
                    </div>
                    <p className="text-[10px] text-white/20 mt-1">{capacityPct}% capacity</p>
                  </div>

                  {/* Chevron */}
                  {isExpanded
                    ? <ChevronUp size={20} className="text-white/20 flex-shrink-0" />
                    : <ChevronDown size={20} className="text-white/20 flex-shrink-0" />
                  }
                </button>

                {/* Expanded: Member List */}
                {isExpanded && (
                  <div className="border-t border-oga-grey px-6 py-5">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-sm font-bold uppercase tracking-wider text-white/50">
                        Members
                      </h4>
                      {faction.created_by && (
                        <span className="text-xs text-white/30">
                          Founded by <span className="text-white/60">{faction.founder_name || faction.created_by}</span>
                        </span>
                      )}
                    </div>

                    {loadingMembers === faction.id ? (
                      <div className="flex justify-center py-8">
                        <Loader2 size={20} className="animate-spin text-white/20" />
                      </div>
                    ) : factionMembers.length === 0 ? (
                      <p className="text-white/20 text-sm py-4">No members yet.</p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {factionMembers.map((m, idx) => (
                          <div
                            key={m.user_email || idx}
                            className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]"
                          >
                            {/* Avatar */}
                            {m.avatar_url ? (
                              <img
                                src={m.avatar_url}
                                alt=""
                                className="w-9 h-9 rounded-full object-cover flex-shrink-0"
                              />
                            ) : (
                              <UserCircle size={36} className="text-white/10 flex-shrink-0" />
                            )}

                            {/* Name + role */}
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium truncate">
                                {m.full_name || m.user_email.split('@')[0]}
                              </p>
                              <p className="text-[10px] text-white/30 truncate">{m.user_email}</p>
                            </div>

                            {/* Role badge */}
                            {m.role === 'founder' && (
                              <span
                                className="px-2 py-0.5 rounded text-[10px] font-bold uppercase flex-shrink-0"
                                style={{
                                  backgroundColor: (faction.accent_color || '#39FF14') + '15',
                                  color: faction.accent_color || '#39FF14',
                                  border: `1px solid ${(faction.accent_color || '#39FF14')}30`
                                }}
                              >
                                <Crown size={10} className="inline mr-1 -mt-0.5" />
                                Founder
                              </span>
                            )}

                            {/* Team member flag */}
                            {m.is_team_member && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-oga-green/10 text-oga-green border border-oga-green/20 flex-shrink-0">
                                Team
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
