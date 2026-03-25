import { useState, useEffect } from 'react'
import { supabase, uploadCharacterImage, getCharacterImageUrl } from '../lib/supabase'
import {
  Play, Plus, Trash2, ChevronUp, ChevronDown,
  Loader2, ExternalLink, Image, Film, X
} from 'lucide-react'

/**
 * Gameplay Videos sub-panel for CharacterEditPage
 * 
 * Usage:
 *   <GameplayVideosPanel characterId={form.id} />
 * 
 * Only renders when characterId is set (existing character, not new).
 */
export default function GameplayVideosPanel({ characterId }) {
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showAdd, setShowAdd] = useState(false)

  useEffect(() => {
    if (characterId) loadVideos()
  }, [characterId])

  async function loadVideos() {
    try {
      const { data, error } = await supabase.rpc('get_character_videos', {
        p_character_id: characterId
      })
      if (error) throw error
      setVideos(data || [])
    } catch (err) {
      console.error('Failed to load videos:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // ── Add / Edit Form State ──
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({ game_name: '', video_url: '', thumbnail_url: '' })
  const [thumbFile, setThumbFile] = useState(null)
  const [thumbPreview, setThumbPreview] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(null)

  function startAdd() {
    setEditingId(null)
    setForm({ game_name: '', video_url: '', thumbnail_url: '' })
    setThumbFile(null)
    setThumbPreview(null)
    setShowAdd(true)
  }

  function startEdit(video) {
    setEditingId(video.id)
    setForm({
      game_name: video.game_name || '',
      video_url: video.video_url || '',
      thumbnail_url: video.thumbnail_url || '',
    })
    setThumbFile(null)
    setThumbPreview(video.thumbnail_url || null)
    setShowAdd(true)
  }

  function cancelForm() {
    setShowAdd(false)
    setEditingId(null)
    setForm({ game_name: '', video_url: '', thumbnail_url: '' })
    setThumbFile(null)
    setThumbPreview(null)
  }

  function handleThumbSelect(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) return
    if (file.size > 5 * 1024 * 1024) {
      setError('Thumbnail must be under 5MB')
      return
    }
    setThumbFile(file)
    setThumbPreview(URL.createObjectURL(file))
  }

  async function handleSave() {
    if (!form.game_name.trim() || !form.video_url.trim()) {
      setError('Game name and video URL are required')
      return
    }
    setError(null)
    setSaving(true)

    try {
      let thumbnailUrl = form.thumbnail_url

      // Upload thumbnail if new file selected
      if (thumbFile) {
        const ts = Date.now()
        const ext = thumbFile.name.split('.').pop()
        const path = `gameplay/${characterId}_${form.game_name.toLowerCase().replace(/\s+/g, '_')}_${ts}.${ext}`
        thumbnailUrl = await uploadCharacterImage(thumbFile, path)
        // Build full URL
        if (thumbnailUrl && !thumbnailUrl.startsWith('http')) {
          thumbnailUrl = `https://jmbzrbteizvuqwukojzu.supabase.co/storage/v1/object/public/characters/${thumbnailUrl}`
        }
      }

      const { data, error } = await supabase.rpc('upsert_gameplay_video', {
        p_id: editingId || null,
        p_character_id: characterId,
        p_game_name: form.game_name.trim(),
        p_video_url: form.video_url.trim(),
        p_thumbnail_url: thumbnailUrl || null,
        p_sort_order: editingId
          ? (videos.find(v => v.id === editingId)?.sort_order || 0)
          : videos.length,
      })

      if (error) throw error
      if (data?.error) throw new Error(data.error)

      cancelForm()
      loadVideos()
    } catch (err) {
      console.error('Save video failed:', err)
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(videoId) {
    if (!confirm('Delete this gameplay video?')) return
    setDeleting(videoId)
    try {
      const { data, error } = await supabase.rpc('delete_gameplay_video', { p_id: videoId })
      if (error) throw error
      if (data?.error) throw new Error(data.error)
      loadVideos()
    } catch (err) {
      console.error('Delete failed:', err)
      setError(err.message)
    } finally {
      setDeleting(null)
    }
  }

  async function handleReorder(videoId, direction) {
    const idx = videos.findIndex(v => v.id === videoId)
    if (idx < 0) return
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= videos.length) return

    const a = videos[idx]
    const b = videos[swapIdx]

    try {
      // Swap sort_order values
      await supabase.rpc('upsert_gameplay_video', {
        p_id: a.id,
        p_character_id: characterId,
        p_game_name: a.game_name,
        p_video_url: a.video_url,
        p_thumbnail_url: a.thumbnail_url,
        p_sort_order: b.sort_order ?? swapIdx,
      })
      await supabase.rpc('upsert_gameplay_video', {
        p_id: b.id,
        p_character_id: characterId,
        p_game_name: b.game_name,
        p_video_url: b.video_url,
        p_thumbnail_url: b.thumbnail_url,
        p_sort_order: a.sort_order ?? idx,
      })
      loadVideos()
    } catch (err) {
      console.error('Reorder failed:', err)
    }
  }

  // Extract YouTube thumbnail from URL
  function getYouTubeThumbnail(url) {
    if (!url) return null
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/watch\?v=|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/)
    if (match) return `https://img.youtube.com/vi/${match[1]}/mqdefault.jpg`
    return null
  }

  if (loading) {
    return (
      <div className="oga-card p-6">
        <h2 className="text-lg font-bold uppercase tracking-wider mb-4">Gameplay Videos</h2>
        <div className="flex justify-center py-8">
          <Loader2 size={20} className="animate-spin text-white/20" />
        </div>
      </div>
    )
  }

  return (
    <div className="oga-card p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold uppercase tracking-wider">Gameplay Videos</h2>
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-white/5 text-white/30 border border-white/10">
            {videos.length}
          </span>
        </div>
        {!showAdd && (
          <button onClick={startAdd} className="oga-btn-secondary flex items-center gap-2 text-sm">
            <Plus size={14} />
            Add Video
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 bg-red-400/10 border border-red-400/30 rounded-lg text-red-400 text-sm flex items-center justify-between">
          {error}
          <button onClick={() => setError(null)}><X size={14} /></button>
        </div>
      )}

      {/* Add / Edit Form */}
      {showAdd && (
        <div className="mb-6 p-5 rounded-xl bg-white/[0.02] border border-oga-green/20">
          <h3 className="text-sm font-bold uppercase tracking-wider text-oga-green mb-4">
            {editingId ? 'Edit Video' : 'Add Video'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="oga-label">Game Name</label>
              <input
                type="text"
                value={form.game_name}
                onChange={e => setForm(prev => ({ ...prev, game_name: e.target.value }))}
                placeholder="e.g. Plague Hunters"
                className="oga-input"
              />
            </div>
            <div>
              <label className="oga-label">YouTube URL</label>
              <input
                type="text"
                value={form.video_url}
                onChange={e => setForm(prev => ({ ...prev, video_url: e.target.value }))}
                placeholder="https://youtu.be/..."
                className="oga-input font-mono text-sm"
              />
            </div>
            <div className="md:col-span-2">
              <label className="oga-label">Thumbnail</label>
              <div className="flex items-start gap-4">
                {/* Preview */}
                <div className="w-40 h-24 rounded-lg bg-white/5 border border-oga-grey overflow-hidden flex-shrink-0 flex items-center justify-center">
                  {thumbPreview ? (
                    <img src={thumbPreview} alt="" className="w-full h-full object-cover" />
                  ) : form.video_url ? (
                    <img
                      src={getYouTubeThumbnail(form.video_url) || ''}
                      alt=""
                      className="w-full h-full object-cover"
                      onError={e => { e.target.style.display = 'none' }}
                    />
                  ) : (
                    <Image size={24} className="text-white/10" />
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <label className="oga-btn-secondary inline-flex items-center gap-2 text-sm cursor-pointer">
                    <Image size={14} />
                    Upload Thumbnail
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleThumbSelect}
                      className="hidden"
                    />
                  </label>
                  <p className="text-[10px] text-white/20">
                    Or leave blank — YouTube thumbnail will be auto-extracted if available.
                  </p>
                  {form.video_url && !thumbFile && !form.thumbnail_url && (
                    <button
                      onClick={() => {
                        const yt = getYouTubeThumbnail(form.video_url)
                        if (yt) {
                          setForm(prev => ({ ...prev, thumbnail_url: yt }))
                          setThumbPreview(yt)
                        }
                      }}
                      className="text-xs text-oga-green hover:underline"
                    >
                      Use YouTube thumbnail
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 mt-5">
            <button onClick={cancelForm} className="px-4 py-2 rounded-lg border border-oga-grey text-white/50 text-sm font-bold uppercase hover:border-white/30 transition-colors">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !form.game_name.trim() || !form.video_url.trim()}
              className="oga-btn-primary flex items-center gap-2 text-sm"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Film size={14} />}
              {saving ? 'Saving...' : (editingId ? 'Update Video' : 'Add Video')}
            </button>
          </div>
        </div>
      )}

      {/* Video List */}
      {videos.length === 0 ? (
        <div className="py-8 text-center">
          <Film size={36} className="mx-auto text-white/10 mb-3" />
          <p className="text-white/20 text-sm">No gameplay videos yet.</p>
          {!showAdd && (
            <button onClick={startAdd} className="mt-3 text-oga-green text-sm hover:underline">
              Add the first one
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {videos.map((video, idx) => (
            <div
              key={video.id}
              className="flex items-center gap-4 p-3 rounded-lg bg-white/[0.02] border border-white/[0.04] group hover:border-white/[0.08] transition-colors"
            >
              {/* Reorder arrows */}
              <div className="flex flex-col gap-0.5 flex-shrink-0">
                <button
                  onClick={() => handleReorder(video.id, 'up')}
                  disabled={idx === 0}
                  className="p-0.5 rounded hover:bg-white/5 disabled:opacity-10 transition-colors"
                >
                  <ChevronUp size={14} className="text-white/30" />
                </button>
                <button
                  onClick={() => handleReorder(video.id, 'down')}
                  disabled={idx === videos.length - 1}
                  className="p-0.5 rounded hover:bg-white/5 disabled:opacity-10 transition-colors"
                >
                  <ChevronDown size={14} className="text-white/30" />
                </button>
              </div>

              {/* Thumbnail */}
              <div className="w-28 h-16 rounded-lg bg-white/5 overflow-hidden flex-shrink-0 relative">
                {video.thumbnail_url ? (
                  <img src={video.thumbnail_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Film size={20} className="text-white/10" />
                  </div>
                )}
                {/* Play overlay */}
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Play size={20} className="text-white" />
                </div>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm truncate">{video.game_name}</p>
                <a
                  href={video.video_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-white/30 hover:text-oga-green truncate flex items-center gap-1 transition-colors"
                >
                  {video.video_url}
                  <ExternalLink size={10} />
                </a>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => startEdit(video)}
                  className="px-3 py-1.5 rounded-lg border border-oga-grey text-white/40 text-xs font-bold uppercase hover:border-white/30 hover:text-white/70 transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(video.id)}
                  disabled={deleting === video.id}
                  className="p-1.5 rounded-lg border border-red-400/20 text-red-400/40 hover:border-red-400/40 hover:text-red-400 transition-colors"
                >
                  {deleting === video.id
                    ? <Loader2 size={14} className="animate-spin" />
                    : <Trash2 size={14} />
                  }
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
