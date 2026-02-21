import type { SupabaseClient } from '@supabase/supabase-js'
import type { OrgContext } from '@/types/project'

/**
 * Fetch the current user's first org membership + org plan.
 * Uses the caller's Supabase client (RLS applies).
 * Returns null if the user has no org.
 */
export async function getOrgContext(
  supabase: SupabaseClient,
  userId: string,
): Promise<OrgContext | null> {
  const { data } = await supabase
    .from('org_members')
    .select('org_id, role, organizations(id, name, plan)')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle()

  if (!data) return null

  const orgRaw = data.organizations
  const org = (Array.isArray(orgRaw) ? orgRaw[0] : orgRaw) as {
    id: string
    name: string
    plan: string
  } | null

  if (!org) return null

  return {
    org_id: data.org_id as string,
    role: data.role as OrgContext['role'],
    plan: (org.plan ?? 'free') as OrgContext['plan'],
    org_name: org.name,
  }
}

/** Returns true for roles that can write (create / edit / delete projects). */
export function canWrite(role: OrgContext['role']): boolean {
  return role === 'owner' || role === 'admin'
}
