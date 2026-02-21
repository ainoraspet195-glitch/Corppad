import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function AppDashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Redirect unauthenticated users (layout also guards, but belt-and-suspenders)
  if (!user) redirect('/login')

  // Check if the user belongs to any org; if not, send to onboarding
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
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
      {org && (
        <p className="mt-2 text-sm text-gray-500">
          Organization:{' '}
          <span className="font-medium text-gray-700">{org.name}</span>
          <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 capitalize">
            {org.plan}
          </span>
        </p>
      )}
      <div className="mt-8 rounded-lg border border-gray-200 bg-white p-6">
        <p className="text-sm text-gray-500">
          Welcome back,{' '}
          <span className="font-medium text-gray-700">{user.email}</span>. Your
          role in this org:{' '}
          <span className="font-medium text-gray-700 capitalize">
            {membership.role}
          </span>
          .
        </p>
      </div>
    </div>
  )
}
