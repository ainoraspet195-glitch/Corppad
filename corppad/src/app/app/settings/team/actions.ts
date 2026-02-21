'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getOrgContext, canWrite } from '@/lib/org'
import { redirect } from 'next/navigation'

const BASE = '/app/settings/team'

// ─── generate invite link ────────────────────────────────────

export async function generateInviteAction(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const ctx = await getOrgContext(supabase, user.id)
  if (!ctx) redirect('/app/onboarding')

  if (!canWrite(ctx.role)) {
    redirect(
      `${BASE}?error=${encodeURIComponent('Only owners and admins can generate invite links.')}`,
    )
  }

  const role = (formData.get('role') as string) ?? 'member'
  if (!['member', 'admin'].includes(role)) {
    redirect(`${BASE}?error=Invalid+role`)
  }

  // Insert invite via user's session (RLS will enforce has_org_role)
  const { data: invite, error } = await supabase
    .from('invites')
    .insert({
      org_id: ctx.org_id,
      role,
      created_by: user.id,
    })
    .select('token')
    .single()

  if (error || !invite) {
    redirect(
      `${BASE}?error=${encodeURIComponent(error?.message ?? 'Failed to generate invite')}`,
    )
  }

  // Pass the token back via URL so the page can show the copy-link box
  redirect(`${BASE}?invite=${invite.token}`)
}

// ─── remove member ───────────────────────────────────────────

export async function removeMemberAction(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const ctx = await getOrgContext(supabase, user.id)
  if (!ctx) redirect('/app/onboarding')

  if (!canWrite(ctx.role)) {
    redirect(
      `${BASE}?error=${encodeURIComponent('Only owners and admins can remove members.')}`,
    )
  }

  const targetUserId = (formData.get('user_id') as string).trim()
  if (!targetUserId) redirect(BASE)

  if (targetUserId === user.id) {
    redirect(`${BASE}?error=You+cannot+remove+yourself.`)
  }

  // Use admin client for the delete (no user-client delete policy on org_members)
  const admin = createAdminClient()

  // Verify the target is actually in this org and get their role
  const { data: target } = await admin
    .from('org_members')
    .select('role')
    .eq('org_id', ctx.org_id)
    .eq('user_id', targetUserId)
    .maybeSingle()

  if (!target) {
    redirect(`${BASE}?error=Member+not+found.`)
  }

  if (target.role === 'owner') {
    redirect(`${BASE}?error=${encodeURIComponent('Cannot remove the org owner.')}`)
  }

  const { error } = await admin
    .from('org_members')
    .delete()
    .eq('org_id', ctx.org_id)
    .eq('user_id', targetUserId)

  if (error) {
    redirect(`${BASE}?error=${encodeURIComponent(error.message)}`)
  }

  redirect(BASE)
}
