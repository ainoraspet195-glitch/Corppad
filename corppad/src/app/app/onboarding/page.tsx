import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getMissingPublicEnv } from '@/lib/env'
import { MissingEnv } from '@/components/MissingEnv'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { redirect } from 'next/navigation'
import { createOrgAction } from './actions'

interface Props {
  searchParams: Promise<{ error?: string }>
}

export default async function OnboardingPage({ searchParams }: Props) {
  const missing = getMissingPublicEnv()
  if (missing.length > 0) return <MissingEnv missing={missing} />

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // If the user already has an org, skip onboarding
  const { data: membership } = await supabase
    .from('org_members')
    .select('org_id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle()

  if (membership) redirect('/app')

  const { error } = await searchParams

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="mb-8 text-center">
          <Link href="/app" className="text-sm font-bold tracking-widest text-blue-600">
            CORPPAD
          </Link>
          <h1 className="mt-4 text-2xl font-semibold text-gray-900">
            Set up your organization
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            You can invite teammates after setup.
          </p>
        </div>

        {/* Card */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <form action={createOrgAction} className="space-y-4">
            <Input
              label="Organization name"
              id="name"
              name="name"
              type="text"
              required
              placeholder="Acme Corp"
            />

            <Button type="submit" className="w-full mt-2">
              Create organization
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
