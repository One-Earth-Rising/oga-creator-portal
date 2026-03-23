import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { uploadCharacterImage, getCharacterImageUrl } from '../lib/supabase'
import { Plus, Pencil, X, Save, Loader2, Tag, Upload, Info } from 'lucide-react'

export default function IPBrandsPage() {
  const [brands, setBrands] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null) // brand id or 'new'
  const [form, setForm] = useState({ name: '', website: '', description: '' })
  const [logoFile, setLogoFile] = useState(null)
  const [logoPreview, setLogoPreview] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    loadBrands()
  }, [])

  async function loadBrands() {
    try {
      const { data, error } = await supabase.rpc('get_ip_brands')
      if (error) throw error
      setBrands(data || [])
    } catch (err) {
      console.error('Failed to load brands:', err)
    } finally {
      setLoading(false)
    }
  }

  function startEdit(brand) {
    setEditing(brand.id)
    setForm({ name: brand.name, website: brand.website || '', description: brand.description || '' })
    setLogoFile(null)
    setLogoPreview(brand.logo_url || null)
    setError(null)
  }

  function startNew() {
    setEditing('new')
    setForm({ name: '', website: '', description: '' })
    setLogoFile(null)
    setLogoPreview(null)
    setError(null)
  }

  function cancelEdit() {
    setEditing(null)
    setForm({ name: '', website: '', description: '' })
    setLogoFile(null)
    setLogoPreview(null)
    setError(null)
  }

  function handleLogoSelect(e) {
    const file = e.target.files[0]
    if (!file) return

    // Validate file type
    if (!['image/png', 'image/webp', 'image/svg+xml'].includes(file.type)) {
      setError('Logo must be PNG, WebP, or SVG (transparent background required)')
      return
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setError('Logo must be under 2MB')
      return
    }

    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
    setError(null)
  }

  function clearLogo() {
    setLogoFile(null)
    setLogoPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleSave() {
    if (!form.name.trim()) {
      setError('Brand name is required')
      return
    }

    setSaving(true)
    setError(null)

    try {
      // Upload logo if a new file was selected
      let logoUrl = null
      if (logoFile) {
        const slug = form.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')
        const ext = logoFile.name.split('.').pop()
        const path = `brands/${slug}-logo.${ext}`

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('characters')
          .upload(path, logoFile, { upsert: true, contentType: logoFile.type })

        if (uploadError) throw uploadError

        const { data: urlData } = supabase.storage
          .from('characters')
          .getPublicUrl(path)

        logoUrl = urlData.publicUrl
      }

      const params = {
        p_name: form.name.trim(),
        p_website: form.website || null,
        p_description: form.description || null,
      }
      if (logoUrl) params.p_logo_url = logoUrl
      if (editing !== 'new') params.p_id = editing

      const { data, error } = await supabase.rpc('upsert_ip_brand', params)
      if (error) throw error
      if (data && !data.success) throw new Error(data.error)

      await loadBrands()
      cancelEdit()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  // Shared form component used for both new and edit modes
  function renderForm(isNew) {
    return (
      <div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Left column: fields */}
          <div className="space-y-4">
            <div>
              <label className="oga-label">Brand Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Final Boss Sour"
                className="oga-input"
                autoFocus
              />
            </div>
            <div>
              <label className="oga-label">Website</label>
              <input
                type="text"
                value={form.website}
                onChange={(e) => setForm({ ...form, website: e.target.value })}
                placeholder="https://..."
                className="oga-input"
              />
            </div>
            <div>
              <label className="oga-label">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Brief description of the brand or IP..."
                className="oga-input"
                rows={3}
                style={{ resize: 'vertical', minHeight: '80px' }}
              />
            </div>
          </div>

          {/* Right column: logo upload */}
          <div>
            <label className="oga-label">Brand Logo</label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`
                relative border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200
                ${logoPreview ? 'border-oga-grey p-4' : 'border-oga-grey hover:border-white/30 p-8'}
              `}
            >
              {logoPreview ? (
                <div className="relative group">
                  {/* Checkerboard background to show transparency */}
                  <div
                    className="rounded-lg p-4 flex items-center justify-center"
                    style={{
                      backgroundImage: 'linear-gradient(45deg, #1a1a1a 25%, transparent 25%), linear-gradient(-45deg, #1a1a1a 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #1a1a1a 75%), linear-gradient(-45deg, transparent 75%, #1a1a1a 75%)',
                      backgroundSize: '16px 16px',
                      backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
                      backgroundColor: '#0a0a0a',
                      minHeight: '120px',
                    }}
                  >
                    <img
                      src={logoPreview}
                      alt="Logo preview"
                      className="max-h-28 max-w-full object-contain"
                    />
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); clearLogo() }}
                    className="absolute top-2 right-2 p-1.5 bg-red-500/80 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={14} />
                  </button>
                  {logoFile && (
                    <div className="absolute bottom-2 left-2 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-oga-green/20 text-oga-green">
                      New file
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 text-white/30">
                  <Upload size={28} />
                  <div className="text-sm font-bold uppercase tracking-wider">
                    Drop logo or click to browse
                  </div>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/webp,image/svg+xml"
                onChange={handleLogoSelect}
                className="hidden"
              />
            </div>

            {/* Requirements */}
            <div className="mt-3 p-3 bg-oga-black rounded-lg border border-oga-grey/50">
              <div className="flex items-center gap-2 mb-2">
                <Info size={12} className="text-oga-green" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">Logo Requirements</span>
              </div>
              <ul className="space-y-1 text-[11px] text-white/30">
                <li>• <span className="text-white/50">Format:</span> PNG or WebP with transparent background, or SVG</li>
                <li>• <span className="text-white/50">Size:</span> 400 × 400px recommended (square)</li>
                <li>• <span className="text-white/50">Max file:</span> 2MB</li>
                <li>• <span className="text-white/50">Usage:</span> Displayed in top-right corner of character hero cards</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={handleSave} disabled={saving} className="oga-btn-primary text-sm flex items-center gap-2">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {saving ? 'Saving...' : (isNew ? 'Create Brand' : 'Save Changes')}
          </button>
          <button onClick={cancelEdit} className="oga-btn-secondary text-sm">Cancel</button>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold uppercase tracking-wider mb-2">IP Brands</h1>
          <p className="text-white/40">Manage IP holders and brand partners</p>
        </div>
        <button onClick={startNew} className="oga-btn-primary flex items-center gap-2">
          <Plus size={18} />
          New Brand
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 bg-red-400/10 border border-red-400/30 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* New brand form */}
      {editing === 'new' && (
        <div className="oga-card p-6 mb-6 oga-glow">
          <h3 className="text-sm font-bold uppercase tracking-wider text-oga-green mb-4">New Brand</h3>
          {renderForm(true)}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-oga-green border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Brands list */}
      {!loading && (
        <div className="space-y-3">
          {brands.map((brand) => (
            <div key={brand.id} className="oga-card p-5">
              {editing === brand.id ? (
                renderForm(false)
              ) : (
                /* Display row */
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-oga-black flex items-center justify-center overflow-hidden border border-oga-grey/50">
                      {brand.logo_url ? (
                        <img src={brand.logo_url} alt="" className="w-10 h-10 object-contain" />
                      ) : (
                        <Tag size={18} className="text-white/20" />
                      )}
                    </div>
                    <div>
                      <div className="font-bold uppercase tracking-wide">{brand.name}</div>
                      <div className="text-xs text-white/30">
                        {[brand.website, brand.description].filter(Boolean).join(' — ') || 'No details'}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => startEdit(brand)}
                    className="p-2 hover:bg-white/5 rounded-lg transition-colors text-white/30 hover:text-white"
                  >
                    <Pencil size={16} />
                  </button>
                </div>
              )}
            </div>
          ))}

          {brands.length === 0 && (
            <div className="text-center py-16 text-white/30">
              <Tag size={48} className="mx-auto mb-4 opacity-30" />
              <p className="text-lg font-bold uppercase mb-2">No brands yet</p>
              <p className="text-sm">Click "New Brand" to add your first IP partner.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
