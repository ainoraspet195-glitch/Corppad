import { createBrowserClient } from '@supabase/ssr'

// Env vars are baked in at build time for NEXT_PUBLIC_* keys.
// Guards prevent crashes; pages show <MissingEnv> when values are absent.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

export function createClient() {
  if (!url || !key) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY',
    )
  }
  return createBrowserClient(url, key)
}
