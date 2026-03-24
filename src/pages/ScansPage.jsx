import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import {
  Search, QrCode, Copy, ExternalLink, X, ChevronDown, ChevronUp,
  Shield, Verified, History, ArrowRight, Eye
} from 'lucide-react'

export default function ScansPage() {
  const [scans, setScans] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterCharacter, setFilterCharacter] = useState('')
  const [sortField, setSortField] = useState('created_at')
  const [sortDir, setSortDir] = useState('desc')
  const [copiedId, setCopiedId] = useState(null)
  const [cardAsset, setCardAsset] = useState(null)

  useEffect(() => {
    loadScans()
  }, [])

  async function loadScans() {
    try {
      const { data, error } = await supabase.rpc('get_scans_admin')
      if (error) throw error
      setScans(data || [])
    } catch (err) {
      console.error('Failed to load scans:', err)
    } finally {
      setLoading(false)
    }
  }

  // Derived
  const characters = [...new Set(scans.map(s => s.character_name).filter(Boolean))].sort()
  const scanTypes = [...new Set(scans.map(s => s.scan_type).filter(Boolean))].sort()
  const totalVerify = scans.filter(s => s.scan_type === 'verify').length
  const totalConfirm = scans.filter(s => s.scan_type === 'confirm').length

  // Filter + search
  const filtered = scans.filter(s => {
    if (search) {
      const q = search.toLowerCase()
      const match =
        s.character_name?.toLowerCase().includes(q) ||
        s.scanner_email?.toLowerCase().includes(q) ||
        s.scanner_name?.toLowerCase().includes(q) ||
        s.owner_email?.toLowerCase().includes(q) ||
        s.owner_name?.toLowerCase().includes(q) ||
        `#${s.mint_number}`.includes(q)
      if (!match) return false
    }
    if (filterType && s.scan_type !== filterType) return false
    if (filterCharacter && s.character_name !== filterCharacter) return false
    return true
  })

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    let aVal = a[sortField] ?? ''
    let bVal = b[sortField] ?? ''
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

  const typeConfig = {
    verify: { icon: Verified, color: 'text-oga-green', bg: 'bg-oga-green/10', label: 'VERIFY' },
    confirm: { icon: Shield, color: 'text-amber-400', bg: 'bg-amber-400/10', label: 'CONFIRM' },
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold uppercase tracking-wider mb-2">QR Scans</h1>
          <p className="text-white/40">
            {filtered.length} scan{filtered.length !== 1 ? 's' : ''} recorded
          </p>
        </div>
        <div className="flex gap-3">
          <div className="oga-card px-4 py-2 text-center">
            <div className="text-2xl font-bold text-oga-green">{scans.length}</div>
            <div className="text-[10px] text-white/30 uppercase tracking-wider">Total</div>
          </div>
          <div className="oga-card px-4 py-2 text-center">
            <div className="text-2xl font-bold text-oga-green">{totalVerify}</div>
            <div className="text-[10px] text-white/30 uppercase tracking-wider">Verify</div>
          </div>
          <div className="oga-card px-4 py-2 text-center">
            <div className="text-2xl font-bold text-amber-400">{totalConfirm}</div>
            <div className="text-[10px] text-white/30 uppercase tracking-wider">Confirm</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="oga-card p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[240px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by character, scanner, owner, or mint #..."
              className="oga-input pl-10"
            />
          </div>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="oga-select w-36">
            <option value="">All Types</option>
            <option value="verify">Verify</option>
            <option value="confirm">Confirm</option>
          </select>
          <select value={filterCharacter} onChange={(e) => setFilterCharacter(e.target.value)} className="oga-select w-44">
            <option value="">All Characters</option>
            {characters.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          {(search || filterType || filterCharacter) && (
            <button
              onClick={() => { setSearch(''); setFilterType(''); setFilterCharacter('') }}
              className="text-xs text-white/30 hover:text-oga-green flex items-center gap-1 transition-colors"
            >
              <X size={12} /> Clear
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-oga-green border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="oga-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-oga-grey text-white/40 uppercase tracking-wider text-xs">
                <th className="text-left p-4">Type</th>
                <th className="text-left p-4 cursor-pointer hover:text-white/60" onClick={() => toggleSort('character_name')}>
                  <div className="flex items-center gap-1">Asset <SortIcon field="character_name" /></div>
                </th>
                <th className="text-left p-4 cursor-pointer hover:text-white/60" onClick={() => toggleSort('scanner_email')}>
                  <div className="flex items-center gap-1">Scanned By <SortIcon field="scanner_email" /></div>
                </th>
                <th className="text-left p-4 cursor-pointer hover:text-white/60" onClick={() => toggleSort('owner_email')}>
                  <div className="flex items-center gap-1">Asset Owner <SortIcon field="owner_email" /></div>
                </th>
                <th className="text-left p-4 cursor-pointer hover:text-white/60" onClick={() => toggleSort('created_at')}>
                  <div className="flex items-center gap-1">When <SortIcon field="created_at" /></div>
                </th>
                <th className="text-right p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((scan) => {
                const type = typeConfig[scan.scan_type] || typeConfig.verify
                const TypeIcon = type.icon
                return (
                  <tr key={scan.scan_id} className="border-b border-oga-grey/50 hover:bg-white/5 transition-colors">
                    {/* Type badge */}
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${type.bg} ${type.color}`}>
                        <TypeIcon size={12} />
                        {type.label}
                      </span>
                    </td>

                    {/* Asset */}
                    <td className="p-4">
                      <button onClick={() => setCardAsset(scan)} className="group text-left">
                        <div className="font-bold uppercase tracking-wide group-hover:text-oga-green transition-colors">
                          {scan.character_name}
                          <span className="text-oga-green font-mono ml-1">#{scan.mint_number}</span>
                        </div>
                      </button>
                    </td>

                    {/* Scanner */}
                    <td className="p-4">
                      <div className="font-bold text-white truncate max-w-[160px]">
                        {scan.scanner_name || 'Anonymous'}
                      </div>
                      <div className="text-[10px] text-white/30 truncate max-w-[160px]">
                        {scan.scanner_email || '—'}
                      </div>
                    </td>

                    {/* Owner */}
                    <td className="p-4">
                      <div className="font-bold text-white truncate max-w-[160px]">
                        {scan.owner_name || 'Unknown'}
                      </div>
                      <div className="text-[10px] text-white/30 truncate max-w-[160px]">
                        {scan.owner_email || '—'}
                      </div>
                    </td>

                    {/* When */}
                    <td className="p-4 text-white/30 text-xs font-mono">{scan.created_at}</td>

                    {/* Actions */}
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => copyToClipboard(scan.asset_id, scan.scan_id)}
                          className="p-1.5 hover:bg-white/5 rounded transition-colors"
                          title="Copy asset ID"
                        >
                          <Copy size={13} className={copiedId === scan.scan_id ? 'text-oga-green' : 'text-white/20 hover:text-white/50'} />
                        </button>
                        <a
                          href={`https://oga.oneearthrising.com/#/asset/${scan.asset_id}`}
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
                )
              })}
            </tbody>
          </table>
          {sorted.length === 0 && (
            <div className="p-12 text-center text-white/30">
              {scans.length > 0 ? 'No scans match your filters' : 'No scans recorded yet'}
            </div>
          )}
        </div>
      )}

      {/* Asset Card Modal */}
      {cardAsset && (
        <AssetCardModal
          asset={cardAsset}
          onClose={() => setCardAsset(null)}
          onCopy={copyToClipboard}
          copiedId={copiedId}
        />
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// ASSET CARD MODAL (shared pattern from MintedAssetsPage)
// ═══════════════════════════════════════════════════════════════

function AssetCardModal({ asset, onClose, onCopy, copiedId }) {
  const rarityGlow = {
    Common: 'border-white/20',
    Uncommon: 'border-green-500/40 shadow-[0_0_30px_rgba(34,197,94,0.15)]',
    Rare: 'border-blue-500/40 shadow-[0_0_30px_rgba(59,130,246,0.15)]',
    Epic: 'border-purple-500/40 shadow-[0_0_30px_rgba(168,85,247,0.15)]',
    Legendary: 'border-yellow-500/40 shadow-[0_0_30px_rgba(234,179,8,0.15)]',
  }

  const rarityBadge = {
    Common: 'bg-white/10 text-white/60',
    Uncommon: 'bg-green-500/20 text-green-400',
    Rare: 'bg-blue-500/20 text-blue-400',
    Epic: 'bg-purple-500/20 text-purple-400',
    Legendary: 'bg-yellow-500/20 text-yellow-400',
  }

  const imageUrl = asset.hero_image
    ? (asset.hero_image.startsWith('http')
        ? asset.hero_image
        : `https://jmbzrbteizvuqwukojzu.supabase.co/storage/v1/object/public/characters/${asset.hero_image}`)
    : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/85" />
      <div
        className={`relative bg-oga-charcoal border-2 rounded-2xl max-w-sm w-full overflow-hidden ${rarityGlow[asset.rarity] || rarityGlow.Common}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 p-1.5 bg-black/60 hover:bg-black/80 rounded-full transition-colors"
        >
          <X size={14} className="text-white/50" />
        </button>

        <div className="relative w-full aspect-square bg-oga-black flex items-center justify-center overflow-hidden">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={asset.character_name}
              className="w-full h-full object-cover object-top"
              onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }}
            />
          ) : null}
          <div className={`${imageUrl ? 'hidden' : 'flex'} w-full h-full items-center justify-center`}>
            <div className="text-center">
              <div className="text-6xl font-black uppercase tracking-wider text-white/5">{asset.character_name?.[0]}</div>
              <div className="text-xs text-white/15 uppercase tracking-widest mt-2">No Image</div>
            </div>
          </div>

          <div className="absolute top-3 left-3 px-2.5 py-1 bg-black/70 rounded-lg backdrop-blur-sm">
            <span className="font-mono text-oga-green font-bold text-sm">#{asset.mint_number}</span>
          </div>

          {asset.rarity && (
            <div className="absolute top-3 right-12">
              <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider backdrop-blur-sm ${rarityBadge[asset.rarity] || rarityBadge.Common}`}>
                {asset.rarity}
              </span>
            </div>
          )}
        </div>

        <div className="p-5">
          <div className="mb-4">
            <h2 className="text-xl font-bold uppercase tracking-wider">{asset.character_name}</h2>
            {asset.ip_brand_name && (
              <div className="text-xs text-white/30 uppercase tracking-widest mt-1">{asset.ip_brand_name}</div>
            )}
          </div>

          <div className="bg-oga-black rounded-lg border border-oga-grey/50 p-3 mb-4">
            <div className="text-[10px] text-white/25 uppercase tracking-widest mb-1.5">Current Owner</div>
            <div className="font-bold text-sm uppercase tracking-wide">
              {asset.owner_name || 'Unknown'}
            </div>
            <div className="text-xs text-white/30">
              {asset.owner_email || '—'}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => onCopy(asset.asset_id, 'card-' + asset.asset_id)}
              className="flex-1 oga-btn-secondary text-xs py-2.5 flex items-center justify-center gap-1.5"
            >
              {copiedId === 'card-' + asset.asset_id ? (
                <span className="text-oga-green">Copied!</span>
              ) : (
                <><Copy size={12} /> <span className="whitespace-nowrap">Copy ID</span></>
              )}
            </button>
            
              <a href={`https://oga.oneearthrising.com/#/asset/${asset.asset_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 oga-btn-secondary text-xs py-2.5 flex items-center justify-center gap-1.5"
            >
              <ExternalLink size={12} /> Verify
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
