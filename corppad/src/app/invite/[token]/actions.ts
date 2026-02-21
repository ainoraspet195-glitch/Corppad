'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'

export async function acceptInviteAction(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const token = (formData.get('token') as string).trim()

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/invite/${token}`)}`)
  }

  if (!token) redirect('/app')

  const admin = createAdminClient()

  // Re-validate invite server-side (never trust the page-level check)
  const { data: invite } = await admin
    .from('invites')
    .select('id, org_id, role, expires_at, used_at')
    .eq('token', token)
    .maybeSingle()

  if (!invite) {
    redirect(`/invite/${token}?error=${encodeURIComponent('Invalid invite link.')}`)
  }

  if (invite.used_at) {
    redirect(
      `/invite/${token}?error=${encodeURIComponent('This invite has already been used.')}`,
    )
  }

  if (new Date(invite.expires_at as string) < new Date()) {
    redirect(
      `/invite/${token}?error=${encodeURIComponent('This invite link has expired.')}`,
    )
  }

  // Check if already a member of this specific org
  const { data: existing } = await admin
    .from('org_members')
    .select('id')
    .eq('org_id', invite.org_id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (existing) {
    // Already in this org — just send them to the app
    redirect('/app')
  }

  // Add user to the org
  const { error: memberError } = await admin.from('org_members').insert({
    org_id: invite.org_id,
    user_id: user.id,
    role: invite.role,
  })

  if (memberError) {
    redirect(
      `/invite/${token}?error=${encodeURIComponent(memberError.message)}`,
    )
  }

  // Mark invite as used (single-use)
  await admin
    .from('invites')
    .update({ used_at: new Date().toISOString() })
    .eq('id', invite.id)

  redirect('/app')
}
