import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase, uploadCharacterImage, getCharacterImageUrl } from '../lib/supabase'
import ImageUpload from '../components/ImageUpload'
import CharacterPreview from '../components/CharacterPreview'
import { ArrowLeft, Save, Trash2, Loader2 } from 'lucide-react'

const RARITIES = ['Common', 'Rare', 'Epic', 'Legendary']

export default function CharacterEditPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isNew = !id || id === 'new'

  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [brands, setBrands] = useState([])

  // Form state
  const [form, setForm] = useState({
    id: '',
    name: '',
    description: '',
    lore: '',
    character_class: '',
    rarity: '',
    accent_color: '#39FF14',
    hero_image: '',
    thumbnail: '',
    is_active: true,
    sort_order: 0,
    ip_brand_id: '',
  })

  // File state (local files before upload)
  const [heroFile, setHeroFile] = useState(null)
  const [thumbFile, setThumbFile] = useState(null)

  useEffect(() => {
    loadBrands()
    if (!isNew) loadCharacter()
  }, [id])

  async function loadBrands() {
    try {
      const { data, error } = await supabase.rpc('get_ip_brands')
      if (error) throw error
      setBrands(data || [])
    } catch (err) {
      console.error('Failed to load brands:', err)
    }
  }

  async function loadCharacter() {
    try {
      const { data, error } = await supabase.rpc('get_characters_admin')
      if (error) throw error
      const char = data?.find((c) => c.id === id)
      if (!char) {
        setError('Character not found')
        return
      }
      setForm({
        id: char.id || '',
        name: char.name || '',
        description: char.description || '',
        lore: char.lore || '',
        character_class: char.character_class || '',
        rarity: char.rarity || '',
        accent_color: char.accent_color || '#39FF14',
        hero_image: char.hero_image || '',
        thumbnail: char.thumbnail || '',
        is_active: char.is_active ?? true,
        sort_order: char.sort_order ?? 0,
        ip_brand_id: char.ip_brand_id || '',
      })
    } catch (err) {
      console.error('Failed to load character:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSave() {
    setError(null)
    setSuccess(null)
    setSaving(true)

    try {
      // Validate required fields
      if (!form.id.trim()) throw new Error('Character ID is required')
      if (!form.name.trim()) throw new Error('Name is required')

      // Upload images if new files were selected
      let heroPath = form.hero_image
      let thumbPath = form.thumbnail

      if (heroFile) {
        const path = `heroes/${form.id}.${heroFile.name.split('.').pop()}`
        heroPath = await uploadCharacterImage(heroFile, path)
      }

      if (thumbFile) {
        const path = `thumbs/${form.id}.${thumbFile.name.split('.').pop()}`
        thumbPath = await uploadCharacterImage(thumbFile, path)
      }

      // Call upsert RPC
      const { data, error } = await supabase.rpc('upsert_character', {
        p_id: form.id.trim(),
        p_name: form.name.trim(),
        p_description: form.description || null,
        p_lore: form.lore || null,
        p_character_class: form.character_class || null,
        p_rarity: form.rarity || null,
        p_accent_color: form.accent_color || null,
        p_hero_image: heroPath || null,
        p_thumbnail: thumbPath || null,
        p_is_active: form.is_active,
        p_sort_order: parseInt(form.sort_order) || 0,
        p_ip_brand_id: form.ip_brand_id || null,
      })

      if (error) throw error
      if (data && !data.success) throw new Error(data.error || 'Save failed')

      setSuccess(`Character ${data.action === 'created' ? 'created' : 'updated'} successfully`)
      setHeroFile(null)
      setThumbFile(null)

      // Update form with uploaded paths
      if (heroPath) updateField('hero_image', heroPath)
      if (thumbPath) updateField('thumbnail', thumbPath)

      // If new, navigate to edit URL
      if (isNew) {
        setTimeout(() => navigate(`/characters/${form.id}`, { replace: true }), 500)
      }
    } catch (err) {
      console.error('Save failed:', err)
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDeactivate() {
    if (!confirm(`Deactivate "${form.name}"? It will be hidden from the consumer app.`)) return

    try {
      const { data, error } = await supabase.rpc('deactivate_character', { p_id: form.id })
      if (error) throw error
      updateField('is_active', false)
      setSuccess('Character deactivated')
    } catch (err) {
      setError(err.message)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-2 border-oga-green border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // Build preview data (merge form + local file previews)
  const previewData = {
    ...form,
    heroFile,
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link to="/characters" className="p-2 hover:bg-white/5 rounded-lg transition-colors">
          <ArrowLeft size={20} className="text-white/40" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold uppercase tracking-wider">
            {isNew ? 'New Character' : `Edit: ${form.name}`}
          </h1>
          {!isNew && <p className="text-white/30 text-sm font-mono">{form.id}</p>}
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-6 p-4 bg-red-400/10 border border-red-400/30 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-6 p-4 bg-oga-green/10 border border-oga-green/30 rounded-lg text-oga-green text-sm">
          {success}
        </div>
      )}

      {/* Two-column layout: Form + Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Identity Card */}
          <div className="oga-card p-6">
            <h2 className="text-lg font-bold uppercase tracking-wider mb-6">Identity</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Character ID */}
              <div>
                <label className="oga-label">Character ID</label>
                <input
                  type="text"
                  value={form.id}
                  onChange={(e) => updateField('id', e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                  placeholder="e.g. caustica"
                  className="oga-input font-mono"
                  disabled={!isNew}
                />
                <p className="text-[10px] text-white/20 mt-1">Lowercase, no spaces. Cannot be changed after creation.</p>
              </div>

              {/* Name */}
              <div>
                <label className="oga-label">Display Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  placeholder="e.g. Caustica"
                  className="oga-input"
                />
              </div>

              {/* Character Class */}
              <div>
                <label className="oga-label">Character Class</label>
                <input
                  type="text"
                  value={form.character_class}
                  onChange={(e) => updateField('character_class', e.target.value)}
                  placeholder="e.g. The Miniboss"
                  className="oga-input"
                />
              </div>

              {/* Rarity */}
              <div>
                <label className="oga-label">Rarity</label>
                <select
                  value={form.rarity}
                  onChange={(e) => updateField('rarity', e.target.value)}
                  className="oga-select"
                >
                  <option value="">Select rarity...</option>
                  {RARITIES.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              {/* IP Brand */}
              <div>
                <label className="oga-label">IP / Brand</label>
                <select
                  value={form.ip_brand_id}
                  onChange={(e) => updateField('ip_brand_id', e.target.value)}
                  className="oga-select"
                >
                  <option value="">No brand</option>
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              {/* Accent Color */}
              <div>
                <label className="oga-label">Accent Color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={form.accent_color || '#39FF14'}
                    onChange={(e) => updateField('accent_color', e.target.value)}
                    className="w-12 h-12 rounded-lg border border-oga-grey cursor-pointer bg-transparent"
                  />
                  <input
                    type="text"
                    value={form.accent_color || '#39FF14'}
                    onChange={(e) => updateField('accent_color', e.target.value)}
                    placeholder="#39FF14"
                    className="oga-input flex-1 font-mono text-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Description + Lore Card */}
          <div className="oga-card p-6">
            <h2 className="text-lg font-bold uppercase tracking-wider mb-6">Content</h2>
            <div className="space-y-6">
              <div>
                <label className="oga-label">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => updateField('description', e.target.value)}
                  placeholder="Short description shown on the character detail page..."
                  className="oga-textarea"
                  rows={3}
                />
              </div>
              <div>
                <label className="oga-label">Lore</label>
                <textarea
                  value={form.lore}
                  onChange={(e) => updateField('lore', e.target.value)}
                  placeholder="Extended backstory and lore..."
                  className="oga-textarea"
                  rows={5}
                />
              </div>
            </div>
          </div>

          {/* Images Card */}
          <div className="oga-card p-6">
            <h2 className="text-lg font-bold uppercase tracking-wider mb-6">Images</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ImageUpload
                label="Hero Image"
                hint="Recommended: 1024 × 1400px"
                currentUrl={getCharacterImageUrl(form.hero_image)}
                onFileSelected={(file) => setHeroFile(file)}
              />
              <ImageUpload
                label="Thumbnail"
                hint="Recommended: 400 × 400px"
                currentUrl={getCharacterImageUrl(form.thumbnail)}
                onFileSelected={(file) => setThumbFile(file)}
              />
            </div>
          </div>

          {/* Display Settings Card */}
          <div className="oga-card p-6">
            <h2 className="text-lg font-bold uppercase tracking-wider mb-6">Display Settings</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="oga-label">Sort Order</label>
                <input
                  type="number"
                  value={form.sort_order}
                  onChange={(e) => updateField('sort_order', e.target.value)}
                  className="oga-input"
                  min={0}
                />
                <p className="text-[10px] text-white/20 mt-1">Lower numbers appear first in the catalog.</p>
              </div>
              <div>
                <label className="oga-label">Visibility</label>
                <div className="flex items-center gap-4 mt-2">
                  <button
                    onClick={() => updateField('is_active', true)}
                    className={`flex-1 py-3 rounded-lg text-sm font-bold uppercase tracking-wider border transition-all ${
                      form.is_active
                        ? 'bg-oga-green/10 border-oga-green text-oga-green'
                        : 'border-oga-grey text-white/30 hover:border-white/30'
                    }`}
                  >
                    Active
                  </button>
                  <button
                    onClick={() => updateField('is_active', false)}
                    className={`flex-1 py-3 rounded-lg text-sm font-bold uppercase tracking-wider border transition-all ${
                      !form.is_active
                        ? 'bg-red-400/10 border-red-400 text-red-400'
                        : 'border-oga-grey text-white/30 hover:border-white/30'
                    }`}
                  >
                    Inactive
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          {!isNew && (
            <div className="oga-card p-6 border-red-400/20">
              <h2 className="text-lg font-bold uppercase tracking-wider mb-4 text-red-400">Danger Zone</h2>
              <p className="text-white/40 text-sm mb-4">
                Deactivating hides this character from the consumer app. It does not delete data.
              </p>
              <button
                onClick={handleDeactivate}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-red-400/30 text-red-400 text-sm font-bold uppercase hover:bg-red-400/10 transition-colors"
              >
                <Trash2 size={14} />
                Deactivate Character
              </button>
            </div>
          )}
        </div>

        {/* Preview (1 col) */}
        <div className="lg:col-span-1">
          <CharacterPreview data={previewData} />
        </div>
      </div>

      {/* Sticky Bottom Save Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-oga-black/95 backdrop-blur border-t border-oga-grey z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-end gap-4">
          <Link to="/characters" className="px-6 py-3 rounded-lg border border-oga-grey text-white/50 text-sm font-bold uppercase tracking-wider hover:border-white/30 hover:text-white/70 transition-colors">
            Cancel
          </Link>
          <button onClick={handleSave} disabled={saving} className="oga-btn-primary flex items-center gap-2">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {saving ? 'Saving...' : 'Save Character'}
          </button>
        </div>
      </div>
    </div>
  )
}
