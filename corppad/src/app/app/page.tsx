import { createClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/Card'
import { redirect } from 'next/navigation'

export default async function AppDashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: membership } = await supabase
    .from('org_members')
    .select('org_id, role, organizations(id, name, plan)')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  if (!membership) {
    redirect('/app/onboarding')
  }

  const orgRaw = membership.organizations
  const org = (Array.isArray(orgRaw) ? orgRaw[0] : orgRaw) as {
    id: string
    name: string
    plan: string
  } | null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
          {org && (
            <p className="mt-1 text-sm text-gray-500">
              {org.name}
            </p>
          )}
        </div>
        {org && (
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
              org.plan === 'pro'
                ? 'bg-indigo-100 text-indigo-700'
                : 'bg-gray-100 text-gray-500'
            }`}
          >
            {org.plan}
          </span>
        )}
      </div>

      {/* Welcome card */}
      <Card>
        <p className="text-sm text-gray-600">
          Welcome back,{' '}
          <span className="font-medium text-gray-900">{user.email}</span>.
        </p>
        <p className="mt-1 text-sm text-gray-500">
          Your role:{' '}
          <span className="font-medium capitalize text-gray-700">
            {membership.role}
          </span>
        </p>
      </Card>
    </div>
  )
}
