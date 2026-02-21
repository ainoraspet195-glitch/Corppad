'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48)
}

export async function createOrgAction(formData: FormData) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const rawName = (formData.get('name') as string).trim()
  if (!rawName) {
    redirect('/app/onboarding?error=Organization+name+is+required')
  }

  const slug = slugify(rawName)

  // Use the admin client so we can insert org + member bypassing RLS
  const admin = createAdminClient()

  // Check slug uniqueness
  const { data: existing } = await admin
    .from('organizations')
    .select('id')
    .eq('slug', slug)
    .maybeSingle()

  if (existing) {
    redirect(
      `/app/onboarding?error=${encodeURIComponent('An organization with that name already exists. Try a different name.')}`,
    )
  }

  // Create the organization
  const { data: org, error: orgError } = await admin
    .from('organizations')
    .insert({ name: rawName, slug })
    .select('id')
    .single()

  if (orgError || !org) {
    redirect(
      `/app/onboarding?error=${encodeURIComponent(orgError?.message ?? 'Failed to create organization')}`,
    )
  }

  // Add the current user as Owner
  const { error: memberError } = await admin.from('org_members').insert({
    org_id: org.id,
    user_id: user.id,
    role: 'owner',
  })

  if (memberError) {
    // Best-effort cleanup
    await admin.from('organizations').delete().eq('id', org.id)
    redirect(
      `/app/onboarding?error=${encodeURIComponent(memberError.message)}`,
    )
  }

  redirect('/app')
}
