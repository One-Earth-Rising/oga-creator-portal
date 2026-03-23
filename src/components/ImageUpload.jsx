import { useState, useRef } from 'react'
import { Upload, X, Image as ImageIcon } from 'lucide-react'

/**
 * ImageUpload — drag-and-drop or click-to-browse image upload
 * Props:
 *   currentUrl — existing image URL (for edit mode)
 *   onFileSelected(file) — callback when a file is chosen (before upload)
 *   label — field label
 *   hint — dimension hint (e.g. "1024 × 1400")
 *   accept — MIME types (default: image/png, image/jpeg, image/webp)
 */
export default function ImageUpload({ currentUrl, onFileSelected, label, hint, accept = 'image/png,image/jpeg,image/webp' }) {
  const [preview, setPreview] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef(null)

  function handleFile(file) {
    if (!file || !file.type.startsWith('image/')) return
    setPreview(URL.createObjectURL(file))
    onFileSelected(file)
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    handleFile(file)
  }

  function handleChange(e) {
    const file = e.target.files[0]
    handleFile(file)
  }

  function clearPreview() {
    setPreview(null)
    onFileSelected(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  const displayUrl = preview || currentUrl

  return (
    <div>
      {label && <label className="oga-label">{label}</label>}
      
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`
          relative border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200
          ${dragOver ? 'border-oga-green bg-oga-green/5' : 'border-oga-grey hover:border-white/30'}
          ${displayUrl ? 'p-2' : 'p-8'}
        `}
      >
        {displayUrl ? (
          <div className="relative group">
            <img
              src={displayUrl}
              alt="Preview"
              className="w-full max-h-64 object-contain rounded-lg"
            />
            <button
              onClick={(e) => { e.stopPropagation(); clearPreview() }}
              className="absolute top-2 right-2 p-1.5 bg-red-500/80 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X size={14} />
            </button>
            {preview && (
              <div className="absolute bottom-2 left-2 oga-badge bg-oga-green/20 text-oga-green text-[10px]">
                New file
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 text-white/30">
            <Upload size={32} className={dragOver ? 'text-oga-green' : ''} />
            <div className="text-sm font-bold uppercase tracking-wider">
              {dragOver ? 'Drop image here' : 'Drag & drop or click to browse'}
            </div>
            {hint && <div className="text-xs text-white/20">{hint}</div>}
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleChange}
          className="hidden"
        />
      </div>
    </div>
  )
}
