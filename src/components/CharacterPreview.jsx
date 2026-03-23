import { getCharacterImageUrl } from '../lib/supabase'
import { Shield, Star, Eye, EyeOff } from 'lucide-react'

/**
 * CharacterPreview — live preview of how the character will look in the consumer app.
 * Updates in real-time as the form is edited.
 */
export default function CharacterPreview({ data }) {
  const {
    name = 'Character Name',
    description = '',
    lore = '',
    character_class = '',
    rarity = '',
    accent_color = '#39FF14',
    hero_image = null,
    heroFile = null,
    is_active = true,
  } = data || {}

  // Use local file preview if available, otherwise existing URL
  const heroUrl = heroFile
    ? URL.createObjectURL(heroFile)
    : getCharacterImageUrl(hero_image)

  const accentHex = accent_color || '#39FF14'

  const rarityColors = {
    Common: '#9CA3AF',
    Rare: '#60A5FA',
    Epic: '#A78BFA',
    Legendary: '#FBBF24',
  }
  const rarityColor = rarityColors[rarity] || rarityColors.Common

  return (
    <div className="sticky top-8">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-white/40">Live Preview</h3>
        <div className="flex items-center gap-1.5 text-xs text-white/30">
          {is_active ? (
            <><Eye size={12} className="text-oga-green" /> Active</>
          ) : (
            <><EyeOff size={12} className="text-red-400" /> Inactive</>
          )}
        </div>
      </div>

      {/* Phone frame */}
      <div
        className="bg-oga-black border border-oga-grey rounded-2xl overflow-hidden max-w-[320px] mx-auto"
        style={{ boxShadow: `0 0 40px ${accentHex}10` }}
      >
        {/* Hero image */}
        <div className="relative aspect-[3/4] bg-oga-charcoal overflow-hidden">
          {heroUrl ? (
            <img
              src={heroUrl}
              alt={name}
              className="w-full h-full object-cover object-top"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Shield size={64} className="text-white/5" />
            </div>
          )}

          {/* Gradient overlay at bottom */}
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black to-transparent" />

          {/* Name overlay */}
          <div className="absolute bottom-4 left-4 right-4">
            <h2
              className="text-2xl font-bold uppercase tracking-wider leading-tight"
              style={{ textShadow: `0 0 20px ${accentHex}40` }}
            >
              {name || 'Character Name'}
            </h2>
            {character_class && (
              <div className="text-xs uppercase tracking-widest mt-1" style={{ color: accentHex }}>
                {character_class}
              </div>
            )}
          </div>

          {/* Rarity badge */}
          {rarity && (
            <div className="absolute top-3 right-3">
              <span
                className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
                style={{ backgroundColor: `${rarityColor}20`, color: rarityColor }}
              >
                <Star size={10} fill={rarityColor} />
                {rarity}
              </span>
            </div>
          )}
        </div>

        {/* Content section */}
        <div className="p-4 space-y-4">
          {/* Description */}
          {description && (
            <div>
              <div className="text-[10px] uppercase tracking-widest text-white/30 mb-1">About</div>
              <p className="text-xs text-white/70 leading-relaxed line-clamp-4">{description}</p>
            </div>
          )}

          {/* Lore */}
          {lore && (
            <div>
              <div className="text-[10px] uppercase tracking-widest text-white/30 mb-1">Lore</div>
              <p className="text-xs text-white/50 leading-relaxed line-clamp-3 italic">{lore}</p>
            </div>
          )}

          {/* Stats bar placeholder */}
          <div className="flex items-center gap-4 pt-2 border-t border-oga-grey/50">
            <div className="flex-1">
              <div className="text-[10px] uppercase tracking-widest text-white/30">Rarity</div>
              <div className="text-xs font-bold" style={{ color: rarityColor }}>{rarity || '—'}</div>
            </div>
            <div className="flex-1">
              <div className="text-[10px] uppercase tracking-widest text-white/30">Class</div>
              <div className="text-xs font-bold text-white/70">{character_class || '—'}</div>
            </div>
            <div className="flex-1">
              <div className="text-[10px] uppercase tracking-widest text-white/30">Theme</div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: accentHex }} />
                <span className="text-[10px] text-white/40">{accentHex}</span>
              </div>
            </div>
          </div>

          {/* CTA */}
          <button
            className="w-full py-3 rounded-lg text-xs font-bold uppercase tracking-widest transition-all"
            style={{ backgroundColor: accentHex, color: '#000' }}
          >
            Character Locked
          </button>
        </div>
      </div>

      <p className="text-[10px] text-white/20 text-center mt-3 uppercase tracking-wider">
        Consumer app preview (approximate)
      </p>
    </div>
  )
}
