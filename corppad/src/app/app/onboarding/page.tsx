import { createClient } from '@/lib/supabase/server'
import { getMissingPublicEnv } from '@/lib/env'
import { MissingEnv } from '@/components/MissingEnv'
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
        <h1 className="mb-2 text-center text-2xl font-semibold text-gray-900">
          Create your organization
        </h1>
        <p className="mb-6 text-center text-sm text-gray-500">
          You can invite teammates after setup.
        </p>

        {error && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form action={createOrgAction} className="space-y-4">
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700"
            >
              Organization name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              placeholder="Acme Corp"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Create organization
          </button>
        </form>
      </div>
    </div>
  )
}
