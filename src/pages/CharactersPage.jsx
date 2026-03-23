import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { getCharacterImageUrl } from '../lib/supabase'
import { Plus, Search, Grid3x3, List, Eye, EyeOff, Swords } from 'lucide-react'

export default function CharactersPage() {
  const [characters, setCharacters] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState('grid') // 'grid' | 'table'
  const [filterRarity, setFilterRarity] = useState('')
  const [filterActive, setFilterActive] = useState('') // '' | 'true' | 'false'

  useEffect(() => {
    loadCharacters()
  }, [])

  async function loadCharacters() {
    try {
      const { data, error } = await supabase.rpc('get_characters_admin')
      if (error) throw error
      setCharacters(data || [])
    } catch (err) {
      console.error('Failed to load characters:', err)
    } finally {
      setLoading(false)
    }
  }

  const filtered = characters.filter((c) => {
    if (search && !c.name?.toLowerCase().includes(search.toLowerCase())) return false
    if (filterRarity && c.rarity !== filterRarity) return false
    if (filterActive === 'true' && !c.is_active) return false
    if (filterActive === 'false' && c.is_active) return false
    return true
  })

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
          <h1 className="text-3xl font-bold uppercase tracking-wider mb-2">Characters</h1>
          <p className="text-white/40">{filtered.length} character{filtered.length !== 1 ? 's' : ''}</p>
        </div>
        <Link to="/characters/new" className="oga-btn-primary flex items-center gap-2">
          <Plus size={18} />
          New Character
        </Link>
      </div>

      {/* Filters Bar */}
      <div className="oga-card p-4 mb-8">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search characters..."
              className="oga-input pl-10"
            />
          </div>

          {/* Rarity filter */}
          <select
            value={filterRarity}
            onChange={(e) => setFilterRarity(e.target.value)}
            className="oga-select w-40"
          >
            <option value="">All Rarities</option>
            <option value="Common">Common</option>
            <option value="Rare">Rare</option>
            <option value="Epic">Epic</option>
            <option value="Legendary">Legendary</option>
          </select>

          {/* Active filter */}
          <select
            value={filterActive}
            onChange={(e) => setFilterActive(e.target.value)}
            className="oga-select w-36"
          >
            <option value="">All Status</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>

          {/* View mode */}
          <div className="flex border border-oga-grey rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2.5 ${viewMode === 'grid' ? 'bg-oga-green/10 text-oga-green' : 'text-white/40 hover:text-white'}`}
            >
              <Grid3x3 size={16} />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-2.5 ${viewMode === 'table' ? 'bg-oga-green/10 text-oga-green' : 'text-white/40 hover:text-white'}`}
            >
              <List size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-oga-green border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Grid View */}
      {!loading && viewMode === 'grid' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {filtered.map((char) => (
            <Link
              key={char.id}
              to={`/characters/${char.id}`}
              className="oga-card overflow-hidden hover:border-oga-green/40 transition-all group"
            >
              {/* Thumbnail */}
              <div className="aspect-[3/4] bg-oga-black relative overflow-hidden">
                {char.thumbnail || char.hero_image ? (
                  <img
                    src={getCharacterImageUrl(char.thumbnail || char.hero_image)}
                    alt={char.name}
                    className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white/10">
                    <Swords size={48} />
                  </div>
                )}
                {/* Active badge */}
                <div className="absolute top-2 right-2">
                  {char.is_active ? (
                    <Eye size={14} className="text-oga-green" />
                  ) : (
                    <EyeOff size={14} className="text-red-400" />
                  )}
                </div>
              </div>

              {/* Info */}
              <div className="p-3">
                <div className="font-bold text-sm uppercase tracking-wide truncate mb-1">
                  {char.name}
                </div>
                <div className="flex items-center gap-2">
                  {char.rarity && (
                    <span className={`oga-badge text-[10px] ${rarityColors[char.rarity] || rarityColors.Common}`}>
                      {char.rarity}
                    </span>
                  )}
                  {char.ip_brand_name && (
                    <span className="text-[10px] text-white/30 truncate">{char.ip_brand_name}</span>
                  )}
                </div>
                <div className="text-[10px] text-white/20 mt-1">
                  {int(char.owner_count)} owner{int(char.owner_count) !== 1 ? 's' : ''}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Table View */}
      {!loading && viewMode === 'table' && (
        <div className="oga-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-oga-grey text-white/40 uppercase tracking-wider text-xs">
                <th className="text-left p-4">Character</th>
                <th className="text-left p-4">IP Brand</th>
                <th className="text-left p-4">Rarity</th>
                <th className="text-left p-4">Class</th>
                <th className="text-right p-4">Owners</th>
                <th className="text-center p-4">Status</th>
                <th className="text-right p-4">Order</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((char) => (
                <tr key={char.id} className="border-b border-oga-grey/50 hover:bg-white/5 transition-colors">
                  <td className="p-4">
                    <Link to={`/characters/${char.id}`} className="flex items-center gap-3 group">
                      <div className="w-10 h-10 rounded-lg bg-oga-black overflow-hidden flex-shrink-0">
                        {(char.thumbnail || char.hero_image) ? (
                          <img
                            src={getCharacterImageUrl(char.thumbnail || char.hero_image)}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-white/10">
                            <Swords size={14} />
                          </div>
                        )}
                      </div>
                      <span className="font-bold uppercase tracking-wide group-hover:text-oga-green transition-colors">
                        {char.name}
                      </span>
                    </Link>
                  </td>
                  <td className="p-4 text-white/40">{char.ip_brand_name || '—'}</td>
                  <td className="p-4">
                    {char.rarity ? (
                      <span className={`oga-badge text-[10px] ${rarityColors[char.rarity] || rarityColors.Common}`}>
                        {char.rarity}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="p-4 text-white/40">{char.character_class || '—'}</td>
                  <td className="p-4 text-right text-oga-green font-bold">{int(char.owner_count)}</td>
                  <td className="p-4 text-center">
                    {char.is_active ? (
                      <span className="oga-badge bg-oga-green/10 text-oga-green">Active</span>
                    ) : (
                      <span className="oga-badge bg-red-400/10 text-red-400">Inactive</span>
                    )}
                  </td>
                  <td className="p-4 text-right text-white/30">{char.sort_order}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="p-12 text-center text-white/30">No characters found</div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!loading && filtered.length === 0 && characters.length > 0 && (
        <div className="text-center py-20 text-white/30">
          No characters match your filters
        </div>
      )}
    </div>
  )
}

// Helper — safely parse owner_count which comes as string from bigint
function int(val) {
  return parseInt(val?.toString() || '0', 10)
}


