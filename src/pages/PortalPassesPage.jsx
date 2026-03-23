import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Plus, Zap, Trophy, Calendar, ToggleLeft, ToggleRight, Search } from 'lucide-react';

export default function PortalPassesPage() {
  const navigate = useNavigate();
  const [passes, setPasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterActive, setFilterActive] = useState('all'); // 'all' | 'active' | 'inactive'

  useEffect(() => {
    loadPasses();
  }, []);

  async function loadPasses() {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_portal_passes_admin');
      if (error) throw error;
      setPasses(data || []);
    } catch (err) {
      console.error('Failed to load passes:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreatePass() {
    try {
      const { data, error } = await supabase.rpc('upsert_portal_pass', {
        p_name: 'New Portal Pass',
        p_slug: 'new_pass_' + Date.now(),
        p_type: 'brand_campaign',
        p_description: '',
        p_is_active: false,
      });
      if (error) throw error;
      const result = typeof data === 'string' ? JSON.parse(data) : data;
      if (result.id) {
        navigate(`/portal-passes/${result.id}`);
      }
    } catch (err) {
      console.error('Failed to create pass:', err);
    }
  }

  const filtered = passes.filter((p) => {
    const matchesSearch =
      !search ||
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.brand_name?.toLowerCase().includes(search.toLowerCase()) ||
      p.slug?.toLowerCase().includes(search.toLowerCase());
    const matchesFilter =
      filterActive === 'all' ||
      (filterActive === 'active' && p.is_active) ||
      (filterActive === 'inactive' && !p.is_active);
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-oga-green" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">PORTAL PASSES</h1>
          <p className="text-sm text-gray-400 mt-1">
            {passes.length} pass{passes.length !== 1 ? 'es' : ''} configured
          </p>
        </div>
        <button onClick={handleCreatePass} className="oga-btn-primary flex items-center gap-2">
          <Plus size={16} />
          NEW PASS
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Search passes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="oga-input pl-9 w-full"
          />
        </div>
        <div className="flex gap-1 bg-oga-charcoal rounded-lg p-1">
          {['all', 'active', 'inactive'].map((f) => (
            <button
              key={f}
              onClick={() => setFilterActive(f)}
              className={`px-3 py-1.5 text-xs font-semibold uppercase rounded-md transition-colors ${
                filterActive === f
                  ? 'bg-oga-green/20 text-oga-green'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="oga-card p-12 text-center">
          <Trophy size={48} className="mx-auto text-gray-600 mb-4" />
          <p className="text-gray-400 text-lg">No portal passes yet</p>
          <p className="text-gray-500 text-sm mt-1">
            Create your first pass to build engagement loops for your characters.
          </p>
          <button onClick={handleCreatePass} className="oga-btn-primary mt-6">
            <Plus size={16} className="inline mr-1" />
            CREATE FIRST PASS
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((pass) => (
            <PassCard key={pass.id} pass={pass} onClick={() => navigate(`/portal-passes/${pass.id}`)} />
          ))}
        </div>
      )}
    </div>
  );
}

function PassCard({ pass, onClick }) {
  const isExpired = pass.expires_at && new Date(pass.expires_at) < new Date();

  return (
    <button
      onClick={onClick}
      className="oga-card p-5 text-left hover:border-oga-green/40 transition-all group w-full"
    >
      {/* Top row: brand logo + status */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          {pass.brand_logo_url ? (
            <img
              src={pass.brand_logo_url}
              alt={pass.brand_name}
              className="h-10 w-10 rounded-lg object-contain bg-black/50"
            />
          ) : (
            <div className="h-10 w-10 rounded-lg bg-oga-charcoal flex items-center justify-center">
              <Trophy size={20} className="text-gray-600" />
            </div>
          )}
          <div>
            <h3 className="text-white font-bold text-sm leading-tight group-hover:text-oga-green transition-colors">
              {pass.name || 'Untitled Pass'}
            </h3>
            {pass.season_name && (
              <span className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">
                {pass.season_name}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {pass.is_active ? (
            <span className="oga-badge text-[10px]">LIVE</span>
          ) : (
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-gray-700 text-gray-400">
              DRAFT
            </span>
          )}
          {isExpired && (
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-red-900/50 text-red-400">
              EXPIRED
            </span>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-4 mt-4 pt-3 border-t border-gray-800">
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <Zap size={13} className="text-oga-green" />
          <span className="font-semibold text-white">{pass.task_count || 0}</span> tasks
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <Trophy size={13} className="text-yellow-500" />
          <span className="font-semibold text-white">{pass.reward_count || 0}</span> rewards
        </div>
        {pass.expires_at && (
          <div className="flex items-center gap-1.5 text-xs text-gray-400 ml-auto">
            <Calendar size={13} />
            {new Date(pass.expires_at).toLocaleDateString()}
          </div>
        )}
      </div>

      {/* Type badge */}
      <div className="mt-3">
        <span className="text-[10px] uppercase tracking-wider text-gray-600 font-semibold">
          {pass.type?.replace('_', ' ')}
          {pass.character_id ? ` · ${pass.character_id}` : ''}
        </span>
      </div>
    </button>
  );
}
