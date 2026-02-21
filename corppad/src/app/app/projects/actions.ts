'use server'

import { createClient } from '@/lib/supabase/server'
import { getOrgContext, canWrite } from '@/lib/org'
import { FREE_PLAN_PROJECT_LIMIT } from '@/lib/limits'
import { redirect } from 'next/navigation'

const BASE = '/app/projects'

// ─── helpers ────────────────────────────────────────────────

async function requireWriteCtx(redirectOnError: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const ctx = await getOrgContext(supabase, user.id)
  if (!ctx) redirect('/app/onboarding')

  if (!canWrite(ctx.role)) {
    redirect(
      `${redirectOnError}?error=${encodeURIComponent('Only owners and admins can modify projects.')}`,
    )
  }

  return { supabase, user, ctx }
}

// ─── create ─────────────────────────────────────────────────

export async function createProjectAction(formData: FormData) {
  const { supabase, user, ctx } = await requireWriteCtx(`${BASE}/new`)

  // Free plan project limit — checked server-side (never trust client)
  if (ctx.plan === 'free') {
    const { count } = await supabase
      .from('projects')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', ctx.org_id)

    if ((count ?? 0) >= FREE_PLAN_PROJECT_LIMIT) {
      redirect(
        `${BASE}/new?error=${encodeURIComponent(
          `Free plan is limited to ${FREE_PLAN_PROJECT_LIMIT} projects. Upgrade to Pro to create more.`,
        )}`,
      )
    }
  }

  const name = (formData.get('name') as string).trim()
  if (!name) {
    redirect(`${BASE}/new?error=Project+name+is+required.`)
  }

  const description =
    ((formData.get('description') as string) ?? '').trim() || null

  const { error } = await supabase.from('projects').insert({
    org_id: ctx.org_id,
    name,
    description,
    created_by: user.id,
  })

  if (error) {
    redirect(`${BASE}/new?error=${encodeURIComponent(error.message)}`)
  }

  redirect(BASE)
}

// ─── update ─────────────────────────────────────────────────

export async function updateProjectAction(formData: FormData) {
  const id = (formData.get('id') as string).trim()
  if (!id) redirect(BASE)

  const { supabase, ctx } = await requireWriteCtx(`${BASE}/${id}`)

  const name = (formData.get('name') as string).trim()
  if (!name) {
    redirect(`${BASE}/${id}?error=Project+name+is+required.`)
  }

  const description =
    ((formData.get('description') as string) ?? '').trim() || null

  // org_id filter is belt-and-suspenders on top of RLS
  const { error } = await supabase
    .from('projects')
    .update({ name, description, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('org_id', ctx.org_id)

  if (error) {
    redirect(`${BASE}/${id}?error=${encodeURIComponent(error.message)}`)
  }

  redirect(`${BASE}/${id}`)
}

// ─── delete ─────────────────────────────────────────────────

export async function deleteProjectAction(formData: FormData) {
  const id = (formData.get('id') as string).trim()
  if (!id) redirect(BASE)

  const { supabase, ctx } = await requireWriteCtx(`${BASE}/${id}`)

  // org_id filter is belt-and-suspenders on top of RLS
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', id)
    .eq('org_id', ctx.org_id)

  if (error) {
    redirect(`${BASE}/${id}?error=${encodeURIComponent(error.message)}`)
  }

  redirect(BASE)
}
