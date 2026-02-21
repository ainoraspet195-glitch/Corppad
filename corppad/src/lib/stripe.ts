import 'server-only'
import Stripe from 'stripe'

// Lazy singleton — no crash at import time if key is absent.
let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY ?? ''
  if (!key) throw new Error('Missing STRIPE_SECRET_KEY')
  if (!_stripe) _stripe = new Stripe(key)
  return _stripe
}

export function hasStripeConfig(): boolean {
  return !!(
    process.env.STRIPE_SECRET_KEY &&
    process.env.STRIPE_PRICE_ID_PRO &&
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  )
}
