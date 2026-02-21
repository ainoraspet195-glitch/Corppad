'use server'

import type Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'
import { getOrgContext, canWrite } from '@/lib/org'
import { getStripe } from '@/lib/stripe'
import { redirect } from 'next/navigation'

const BILLING = '/app/settings/billing'

// ─── upgrade: start Stripe Checkout ─────────────────────────

export async function startCheckoutAction() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const ctx = await getOrgContext(supabase, user.id)
  if (!ctx) redirect('/app/onboarding')

  if (!canWrite(ctx.role)) {
    redirect(
      `${BILLING}?error=${encodeURIComponent('Only owners and admins can upgrade the plan.')}`,
    )
  }

  if (ctx.plan === 'pro') redirect(BILLING)

  const priceId = process.env.STRIPE_PRICE_ID_PRO ?? ''
  if (!priceId) {
    redirect(
      `${BILLING}?error=${encodeURIComponent('Stripe is not configured (missing STRIPE_PRICE_ID_PRO).')}`,
    )
  }

  // Fetch existing stripe_customer_id so returning customers are pre-filled
  const { data: orgRow } = await supabase
    .from('organizations')
    .select('stripe_customer_id')
    .eq('id', ctx.org_id)
    .maybeSingle()

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const stripe = getStripe()

  // Build params: use existing customer if present, else pre-fill email
  const baseParams: Stripe.Checkout.SessionCreateParams = {
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    client_reference_id: ctx.org_id,
    metadata: { org_id: ctx.org_id },
    success_url: `${appUrl}${BILLING}?success=1`,
    cancel_url: `${appUrl}${BILLING}?canceled=1`,
  }

  const sessionParams: Stripe.Checkout.SessionCreateParams =
    orgRow?.stripe_customer_id
      ? { ...baseParams, customer: orgRow.stripe_customer_id as string }
      : { ...baseParams, customer_email: user.email ?? undefined }

  const session = await stripe.checkout.sessions.create(sessionParams)

  if (!session.url) {
    redirect(
      `${BILLING}?error=${encodeURIComponent('Could not start checkout. Try again.')}`,
    )
  }

  redirect(session.url)
}

// ─── manage: open Stripe Customer Portal ────────────────────

export async function openPortalAction() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const ctx = await getOrgContext(supabase, user.id)
  if (!ctx) redirect('/app/onboarding')

  if (!canWrite(ctx.role)) {
    redirect(
      `${BILLING}?error=${encodeURIComponent('Only owners and admins can manage billing.')}`,
    )
  }

  const { data: orgRow } = await supabase
    .from('organizations')
    .select('stripe_customer_id')
    .eq('id', ctx.org_id)
    .maybeSingle()

  if (!orgRow?.stripe_customer_id) {
    redirect(
      `${BILLING}?error=${encodeURIComponent('No billing account found. Please upgrade first.')}`,
    )
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const stripe = getStripe()

  const portal = await stripe.billingPortal.sessions.create({
    customer: orgRow.stripe_customer_id as string,
    return_url: `${appUrl}${BILLING}`,
  })

  redirect(portal.url)
}
