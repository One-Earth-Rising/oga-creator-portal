import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Storage helpers
const CHARACTERS_BUCKET = 'characters'

export async function uploadCharacterImage(file, path) {
  const { data, error } = await supabase.storage
    .from(CHARACTERS_BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type })

  if (error) throw error

  const { data: urlData } = supabase.storage
    .from(CHARACTERS_BUCKET)
    .getPublicUrl(path)

  return urlData.publicUrl
}

export function getCharacterImageUrl(path) {
  if (!path) return null
  // If it's already a full URL, return as-is
  if (path.startsWith('http')) return path
  const { data } = supabase.storage.from(CHARACTERS_BUCKET).getPublicUrl(path)
  return data.publicUrl
}
