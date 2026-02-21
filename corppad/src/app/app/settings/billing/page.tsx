import { createClient } from '@/lib/supabase/server'
import { getOrgContext, canWrite } from '@/lib/org'
import { hasStripeConfig } from '@/lib/stripe'
import { FREE_PLAN_PROJECT_LIMIT } from '@/lib/limits'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { redirect } from 'next/navigation'
import { startCheckoutAction, openPortalAction } from './actions'

interface Props {
  searchParams: Promise<{
    success?: string
    canceled?: string
    error?: string
  }>
}

export default async function BillingPage({ searchParams }: Props) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const ctx = await getOrgContext(supabase, user.id)
  if (!ctx) redirect('/app/onboarding')

  const { data: org } = await supabase
    .from('organizations')
    .select(
      'plan, subscription_status, current_period_end, stripe_customer_id',
    )
    .eq('id', ctx.org_id)
    .maybeSingle()

  const { success, canceled, error } = await searchParams

  const plan = (org?.plan ?? ctx.plan) as 'free' | 'pro'
  const stripeReady = hasStripeConfig()
  const isWriter = canWrite(ctx.role)

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Billing</h1>
        <p className="mt-1 text-sm text-gray-500">{ctx.org_name}</p>
      </div>

      {/* Status banners */}
      {success && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          Payment successful! Your plan upgrade is being processed — refresh
          in a few seconds to see your updated plan.
        </div>
      )}
      {canceled && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
          Checkout canceled. No charge was made.
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Current plan card */}
      <Card>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
              Current plan
            </p>
            <p className="mt-1 text-3xl font-semibold capitalize text-gray-900">
              {plan}
            </p>
            {org?.subscription_status && org.subscription_status !== 'active' && (
              <p className="mt-1 text-sm capitalize text-gray-500">
                Status:{' '}
                <span className="font-medium">{org.subscription_status}</span>
              </p>
            )}
            {plan === 'pro' && org?.current_period_end && (
              <p className="mt-1 text-sm text-gray-500">
                Renews{' '}
                <span className="font-medium">
                  {new Date(org.current_period_end as string).toLocaleDateString()}
                </span>
              </p>
            )}
            {plan === 'free' && (
              <p className="mt-2 text-sm text-gray-500">
                Up to {FREE_PLAN_PROJECT_LIMIT} projects included.
              </p>
            )}
            {plan === 'pro' && (
              <p className="mt-2 text-sm text-gray-500">
                Unlimited projects included.
              </p>
            )}
          </div>

          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
              plan === 'pro'
                ? 'bg-indigo-100 text-indigo-700'
                : 'bg-gray-100 text-gray-500'
            }`}
          >
            {plan}
          </span>
        </div>

        {/* Action buttons — owner/admin only */}
        {isWriter && (
          <div className="mt-6 border-t border-gray-100 pt-5">
            {plan === 'free' ? (
              stripeReady ? (
                <form action={startCheckoutAction}>
                  <Button type="submit">Upgrade to Pro</Button>
                </form>
              ) : (
                <p className="text-sm text-amber-700">
                  Stripe is not configured. Add{' '}
                  <code className="rounded bg-amber-100 px-1 font-mono text-xs">STRIPE_SECRET_KEY</code>{' '}
                  and{' '}
                  <code className="rounded bg-amber-100 px-1 font-mono text-xs">STRIPE_PRICE_ID_PRO</code>{' '}
                  to .env.local.
                </p>
              )
            ) : (
              org?.stripe_customer_id && (
                <form action={openPortalAction}>
                  <Button type="submit" variant="secondary">
                    Manage subscription
                  </Button>
                </form>
              )
            )}
          </div>
        )}
      </Card>

      {/* Plan comparison */}
      <Card>
        <h2 className="mb-4 text-sm font-semibold text-gray-700">
          Plan comparison
        </h2>
        <table className="w-full text-sm text-gray-600">
          <thead>
            <tr className="border-b border-gray-100 text-xs font-medium uppercase tracking-wide text-gray-400">
              <th className="pb-2 text-left">Feature</th>
              <th className="pb-2 text-center">Free</th>
              <th className="pb-2 text-center">Pro</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            <tr>
              <td className="py-2">Projects</td>
              <td className="py-2 text-center">{FREE_PLAN_PROJECT_LIMIT}</td>
              <td className="py-2 text-center">Unlimited</td>
            </tr>
            <tr>
              <td className="py-2">Team members</td>
              <td className="py-2 text-center">Unlimited</td>
              <td className="py-2 text-center">Unlimited</td>
            </tr>
            <tr>
              <td className="py-2">Invite links</td>
              <td className="py-2 text-center">✓</td>
              <td className="py-2 text-center">✓</td>
            </tr>
          </tbody>
        </table>
      </Card>
    </div>
  )
}
