import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getStripe } from '@/lib/stripe'
import type Stripe from 'stripe'

// Force dynamic — webhooks must never be cached.
export const dynamic = 'force-dynamic'

/** Extract current_period_end from the first subscription item (Stripe v20+). */
function getPeriodEnd(sub: Stripe.Subscription): string | null {
  const item = sub.items?.data?.[0]
  if (!item) return null
  return new Date(item.current_period_end * 1000).toISOString()
}

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? ''
  if (!webhookSecret) {
    return NextResponse.json(
      { error: 'Missing STRIPE_WEBHOOK_SECRET' },
      { status: 500 },
    )
  }

  const sig = request.headers.get('stripe-signature') ?? ''
  // Read raw bytes — required for Stripe signature verification.
  const buf = Buffer.from(await request.arrayBuffer())

  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(buf, sig, webhookSecret)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json(
      { error: `Webhook signature invalid: ${msg}` },
      { status: 400 },
    )
  }

  const admin = createAdminClient()

  try {
    switch (event.type) {
      // ── checkout completed → org upgrades to Pro ─────────────
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const orgId = session.client_reference_id
        if (!orgId) break

        const customerId =
          typeof session.customer === 'string'
            ? session.customer
            : (session.customer as Stripe.Customer | null)?.id ?? null

        const subscriptionId =
          typeof session.subscription === 'string'
            ? session.subscription
            : (session.subscription as Stripe.Subscription | null)?.id ?? null

        // Retrieve subscription to get status + period end from item
        let subscriptionStatus = 'active'
        let currentPeriodEnd: string | null = null

        if (subscriptionId) {
          const sub = await getStripe().subscriptions.retrieve(subscriptionId)
          subscriptionStatus = sub.status
          currentPeriodEnd = getPeriodEnd(sub)
        }

        await admin
          .from('organizations')
          .update({
            plan: 'pro',
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            subscription_status: subscriptionStatus,
            current_period_end: currentPeriodEnd,
          })
          .eq('id', orgId)

        break
      }

      // ── subscription updated (renewal, pause, plan change…) ──
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        const customerId =
          typeof sub.customer === 'string'
            ? sub.customer
            : (sub.customer as Stripe.Customer).id

        // Keep Pro while active/trialing; revert to free otherwise
        const plan =
          sub.status === 'active' || sub.status === 'trialing' ? 'pro' : 'free'

        await admin
          .from('organizations')
          .update({
            plan,
            stripe_subscription_id: sub.id,
            subscription_status: sub.status,
            current_period_end: getPeriodEnd(sub),
          })
          .eq('stripe_customer_id', customerId)

        break
      }

      // ── subscription deleted (cancel fires this at period end) ─
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        const customerId =
          typeof sub.customer === 'string'
            ? sub.customer
            : (sub.customer as Stripe.Customer).id

        await admin
          .from('organizations')
          .update({
            plan: 'free',
            stripe_subscription_id: null,
            subscription_status: 'canceled',
            current_period_end: null,
          })
          .eq('stripe_customer_id', customerId)

        break
      }

      default:
        // Return 200 for all other events so Stripe doesn't retry them.
        break
    }
  } catch (err) {
    // Log but still return 200 — DB errors shouldn't cause Stripe to retry.
    console.error('[stripe webhook] handler error:', err)
  }

  return NextResponse.json({ received: true })
}
