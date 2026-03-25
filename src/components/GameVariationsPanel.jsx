import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  Plus, Trash2, ChevronDown, ChevronUp, MoveUp, MoveDown,
  Gamepad2, X, AlertCircle, Check, ExternalLink
} from 'lucide-react';

// ─── Platform Config ────────────────────────────────────────────────
const PLATFORMS = [
  { key: 'playstation_url', label: 'PlayStation', placeholder: 'https://store.playstation.com/...' },
  { key: 'steam_url', label: 'Steam', placeholder: 'https://store.steampowered.com/...' },
  { key: 'xbox_url', label: 'Xbox', placeholder: 'https://www.xbox.com/...' },
  { key: 'epic_url', label: 'Epic Games', placeholder: 'https://store.epicgames.com/...' },
  { key: 'nintendo_url', label: 'Nintendo', placeholder: 'https://www.nintendo.com/...' },
  { key: 'ios_url', label: 'App Store (iOS)', placeholder: 'https://apps.apple.com/...' },
  { key: 'android_url', label: 'Google Play', placeholder: 'https://play.google.com/...' },
];

// ─── Image Uploader (lightweight inline version) ────────────────────
function VariationImageUploader({ value, onChange, characterId, gameLabel }) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const resolveUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    return `https://jmbzrbteizvuqwukojzu.supabase.co/storage/v1/object/public/characters/${path}`;
  };

  const handleFile = async (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    if (file.size > 5 * 1024 * 1024) return;

    setUploading(true);
    try {
      const ext = file.name.split('.').pop().toLowerCase();
      const safeName = (gameLabel || 'game').toLowerCase().replace(/[^a-z0-9]/g, '_');
      const fileName = `game-variations/${characterId}_${safeName}_${Date.now()}.${ext}`;

      const { data, error } = await supabase.storage
        .from('characters')
        .upload(fileName, file, { upsert: true, contentType: file.type });

      if (error) throw error;
      onChange(data.path);
    } catch (err) {
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
    }
  };

  const previewUrl = resolveUrl(value);

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
      className={`relative border-2 border-dashed rounded-lg transition-colors cursor-pointer
        ${dragOver ? 'border-[#39FF14] bg-[#39FF14]/5' : 'border-[#2C2C2C] hover:border-[#39FF14]/40'}
        ${previewUrl ? 'p-1' : 'p-4'}`}
    >
      <input
        type="file"
        accept="image/*"
        onChange={(e) => handleFile(e.target.files[0])}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      />
      {uploading ? (
        <div className="flex items-center justify-center py-3">
          <div className="w-5 h-5 border-2 border-[#39FF14] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : previewUrl ? (
        <div className="flex items-center gap-2">
          <img
            src={previewUrl}
            alt={gameLabel || 'Preview'}
            className="w-14 h-14 rounded object-cover border border-[#2C2C2C]"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-gray-500 truncate">{value}</p>
          </div>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onChange(''); }}
            className="text-gray-600 hover:text-red-400 p-1"
          >
            <X size={12} />
          </button>
        </div>
      ) : (
        <div className="text-center">
          <Plus size={16} className="mx-auto text-gray-600 mb-1" />
          <p className="text-[10px] text-gray-500">Drop image or click</p>
        </div>
      )}
    </div>
  );
}

// ─── Variation Card ─────────────────────────────────────────────────
function VariationCard({ variation, index, total, games, characterId, onChange, onDelete, onMoveUp, onMoveDown }) {
  const [expanded, setExpanded] = useState(variation._isNew || false);

  const update = (field, value) => {
    const updated = { ...variation, [field]: value };
    delete updated._isNew;
    onChange(updated);
  };

  const gameName = variation.game_name ||
    (variation.game_id && games.find(g => g.id === variation.game_id)?.name) ||
    'Unknown Game';

  // Count how many platform URLs are filled
  const platformCount = PLATFORMS.filter(p => variation[p.key]?.trim()).length;

  return (
    <div className="border border-[#2C2C2C] rounded-lg bg-[#0A0A0A] overflow-hidden group">
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Reorder */}
        <div className="flex flex-col gap-0.5">
          <button onClick={onMoveUp} disabled={index === 0}
            className="text-gray-600 hover:text-[#39FF14] disabled:opacity-20 disabled:cursor-not-allowed">
            <MoveUp size={14} />
          </button>
          <button onClick={onMoveDown} disabled={index === total - 1}
            className="text-gray-600 hover:text-[#39FF14] disabled:opacity-20 disabled:cursor-not-allowed">
            <MoveDown size={14} />
          </button>
        </div>

        {/* Game icon */}
        <div className="w-7 h-7 rounded flex items-center justify-center bg-[#FF6B6B]/10 text-[#FF6B6B] flex-shrink-0">
          <Gamepad2 size={14} />
        </div>

        {/* Game name */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex-1 text-left text-sm font-semibold text-white truncate hover:text-[#39FF14] transition-colors"
        >
          {gameName}
        </button>

        {/* Platform count badge */}
        {platformCount > 0 && (
          <span className="text-xs text-gray-400 bg-[#2C2C2C] px-2 py-0.5 rounded whitespace-nowrap flex items-center gap-1">
            <ExternalLink size={10} /> {platformCount}
          </span>
        )}

        {/* Thumbnail preview */}
        {variation.character_image && (
          <img
            src={variation.character_image.startsWith('http') ? variation.character_image :
              `https://jmbzrbteizvuqwukojzu.supabase.co/storage/v1/object/public/characters/${variation.character_image}`}
            alt=""
            className="w-8 h-8 rounded object-cover border border-[#2C2C2C]"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        )}

        <button onClick={() => setExpanded(!expanded)} className="text-gray-500 hover:text-white">
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        <button onClick={onDelete}
          className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
          <Trash2 size={14} />
        </button>
      </div>

      {expanded && (
        <div className="px-4 pb-4 pt-2 border-t border-[#2C2C2C] space-y-4">
          {/* Game selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="oga-label">Game</label>
              <select
                value={variation.game_id || ''}
                onChange={(e) => {
                  const selectedGame = games.find(g => g.id === e.target.value);
                  update('game_id', e.target.value || null);
                  if (selectedGame) update('game_name', selectedGame.name);
                }}
                className="oga-select"
              >
                <option value="">Select game...</option>
                {games.map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
              <p className="text-xs text-gray-500">Or enter manually below if game not in registry</p>
            </div>
            <div className="space-y-1.5">
              <label className="oga-label">Game Name (override)</label>
              <input
                type="text"
                value={variation.game_name || ''}
                onChange={(e) => update('game_name', e.target.value)}
                placeholder="e.g., Plague Hunters"
                className="oga-input"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="oga-label">Description</label>
            <textarea
              value={variation.description || ''}
              onChange={(e) => update('description', e.target.value)}
              placeholder="How this character appears or plays in this game"
              rows={2}
              className="oga-input resize-none"
            />
          </div>

          {/* Image */}
          <div className="space-y-1.5">
            <label className="oga-label">Character Image (in-game preview)</label>
            <VariationImageUploader
              value={variation.character_image || ''}
              onChange={(v) => update('character_image', v)}
              characterId={characterId}
              gameLabel={gameName}
            />
          </div>

          {/* Sort Order */}
          <div className="space-y-1.5">
            <label className="oga-label">Sort Order</label>
            <input
              type="number"
              value={variation.sort_order ?? ''}
              onChange={(e) => update('sort_order', parseInt(e.target.value) || 0)}
              min={0}
              className="oga-input w-28"
            />
          </div>

          {/* ── Platform Store URLs ──────────────────────────────── */}
          <div className="border-t border-[#2C2C2C] pt-4 mt-2">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-3 font-bold flex items-center gap-2">
              <ExternalLink size={12} /> Platform Store Links
            </p>
            <p className="text-xs text-gray-600 mb-3">
              Add store URLs for each platform where this game is available. Buttons render dynamically in the consumer app.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {PLATFORMS.map((platform) => (
                <div key={platform.key} className="space-y-1">
                  <label className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">{platform.label}</label>
                  <input
                    type="url"
                    value={variation[platform.key] || ''}
                    onChange={(e) => update(platform.key, e.target.value)}
                    placeholder={platform.placeholder}
                    className="oga-input text-xs"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════
// ─── MAIN PANEL COMPONENT ───────────────────────────────────────────
// ═════════════════════════════════════════════════════════════════════

export default function GameVariationsPanel({ characterId }) {
  const [variations, setVariations] = useState([]);
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [deletedIds, setDeletedIds] = useState([]);

  // ── Load ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!characterId) return;
    loadVariations();
  }, [characterId]);

  const loadVariations = async () => {
    setLoading(true);
    try {
      const [varsRes, gamesRes] = await Promise.all([
        supabase.rpc('get_character_game_variations', { p_character_id: characterId }),
        supabase.from('game_projects').select('id, name').order('name'),
      ]);

      if (varsRes.error) throw varsRes.error;
      const varsData = Array.isArray(varsRes.data) ? varsRes.data : (varsRes.data || []);
      setVariations(varsData.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)));
      setGames(gamesRes.data || []);
    } catch (err) {
      console.error('Load game variations error:', err);
      // Fallback: direct table query
      try {
        const [varsRes, gamesRes] = await Promise.all([
          supabase.from('game_variations').select('*').eq('character_id', characterId).order('sort_order'),
          supabase.from('game_projects').select('id, name').order('name'),
        ]);
        setVariations(varsRes.data || []);
        setGames(gamesRes.data || []);
      } catch (fallbackErr) {
        console.error('Fallback load error:', fallbackErr);
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Add ───────────────────────────────────────────────────────────
  const addVariation = () => {
    setVariations(prev => [...prev, {
      id: `temp_${Date.now()}`,
      _isNew: true,
      _isTemp: true,
      character_id: characterId,
      game_id: null,
      game_name: '',
      character_image: '',
      description: '',
      sort_order: variations.length,
      // Platform URLs
      playstation_url: '',
      steam_url: '',
      xbox_url: '',
      nintendo_url: '',
      ios_url: '',
      android_url: '',
      epic_url: '',
    }]);
  };

  // ── Update ────────────────────────────────────────────────────────
  const updateVariation = (index, updated) => {
    setVariations(prev => prev.map((v, i) => i === index ? updated : v));
  };

  // ── Delete ────────────────────────────────────────────────────────
  const deleteVariation = (index) => {
    const v = variations[index];
    if (!v._isTemp && v.id) {
      setDeletedIds(prev => [...prev, v.id]);
    }
    setVariations(prev => prev.filter((_, i) => i !== index));
  };

  // ── Reorder ───────────────────────────────────────────────────────
  const moveVariation = (fromIndex, direction) => {
    const toIndex = fromIndex + direction;
    if (toIndex < 0 || toIndex >= variations.length) return;
    setVariations(prev => {
      const updated = [...prev];
      [updated[fromIndex], updated[toIndex]] = [updated[toIndex], updated[fromIndex]];
      return updated.map((v, i) => ({ ...v, sort_order: i }));
    });
  };

  // ── Save All ──────────────────────────────────────────────────────
  const saveAll = async () => {
    setSaving(true);
    try {
      // Delete removed variations
      for (const vid of deletedIds) {
        await supabase.rpc('delete_game_variation', { p_id: vid });
      }

      // Upsert all variations (14 params now)
      for (const v of variations) {
        const { error } = await supabase.rpc('upsert_game_variation', {
          p_id: v._isTemp ? null : v.id,
          p_character_id: characterId,
          p_game_id: v.game_id || null,
          p_game_name: v.game_name || null,
          p_character_image: v.character_image || null,
          p_description: v.description || null,
          p_sort_order: v.sort_order || 0,
          p_playstation_url: v.playstation_url || null,
          p_steam_url: v.steam_url || null,
          p_xbox_url: v.xbox_url || null,
          p_nintendo_url: v.nintendo_url || null,
          p_ios_url: v.ios_url || null,
          p_android_url: v.android_url || null,
          p_epic_url: v.epic_url || null,
        });
        if (error) throw error;
      }

      setDeletedIds([]);
      setToast({ message: 'Game variations saved', type: 'success' });
      await loadVariations();
    } catch (err) {
      console.error('Save game variations error:', err);
      setToast({ message: `Save failed: ${err.message}`, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  // ── Toast auto-dismiss ────────────────────────────────────────────
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  if (!characterId) return null;

  return (
    <div className="oga-card">
      <div className="px-5 py-4 flex items-center justify-between border-b border-[#2C2C2C]">
        <div className="flex items-center gap-3">
          <Gamepad2 size={18} className="text-[#39FF14]" />
          <span className="text-white font-bold text-sm uppercase tracking-wider">Multigameverse</span>
          <span className="text-xs bg-[#39FF14]/10 text-[#39FF14] px-2 py-0.5 rounded-full font-medium">
            {variations.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {deletedIds.length > 0 && (
            <span className="text-xs text-amber-400 mr-2">{deletedIds.length} pending removal</span>
          )}
          <button
            onClick={saveAll}
            disabled={saving}
            className="oga-btn-primary flex items-center gap-2 !px-4 !py-1.5 text-xs"
          >
            {saving ? (
              <div className="w-3 h-3 border-2 border-black border-t-transparent rounded-full animate-spin" />
            ) : (
              <Check size={14} />
            )}
            {saving ? 'Saving...' : 'Save Variations'}
          </button>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`mx-5 mt-3 flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium
          ${toast.type === 'success' ? 'bg-[#0a1f0a] text-[#39FF14] border border-[#39FF14]/20' : ''}
          ${toast.type === 'error' ? 'bg-[#1f0a0a] text-red-400 border border-red-500/20' : ''}
        `}>
          {toast.type === 'success' ? <Check size={12} /> : <AlertCircle size={12} />}
          {toast.message}
        </div>
      )}

      <div className="px-5 py-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-[#39FF14] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-2">
            {variations.length === 0 && (
              <div className="text-center py-6 text-gray-500">
                <Gamepad2 size={28} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">No game variations yet.</p>
                <p className="text-xs text-gray-600 mt-1">Add games where this character appears.</p>
              </div>
            )}

            {variations.map((v, i) => (
              <VariationCard
                key={v.id}
                variation={v}
                index={i}
                total={variations.length}
                games={games}
                characterId={characterId}
                onChange={(updated) => updateVariation(i, updated)}
                onDelete={() => deleteVariation(i)}
                onMoveUp={() => moveVariation(i, -1)}
                onMoveDown={() => moveVariation(i, 1)}
              />
            ))}

            <button
              onClick={addVariation}
              className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-[#2C2C2C]
                rounded-lg text-gray-500 hover:border-[#FF6B6B]/50 hover:text-[#FF6B6B] transition-colors"
            >
              <Plus size={16} />
              <span className="text-sm font-medium">Add Game Variation</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}