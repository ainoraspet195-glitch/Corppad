// Public env vars needed at runtime (browser + server)
const PUBLIC_REQUIRED = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
] as const

export function getMissingPublicEnv(): string[] {
  return PUBLIC_REQUIRED.filter((key) => !process.env[key])
}

export function hasRequiredEnv(): boolean {
  return getMissingPublicEnv().length === 0
}
