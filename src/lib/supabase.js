import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Singleton — prevents multiple GoTrueClient instances during Vite HMR
const key = '__supabase_client__'
if (!globalThis[key]) {
  globalThis[key] = createClient(supabaseUrl, supabaseAnonKey)
}
export const supabase = globalThis[key]
