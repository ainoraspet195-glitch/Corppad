import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getOrgContext, canWrite } from '@/lib/org'
import { FREE_PLAN_PROJECT_LIMIT } from '@/lib/limits'
import { ProjectForm } from '@/components/projects/ProjectForm'
import { createProjectAction } from '../actions'
import { redirect } from 'next/navigation'

interface Props {
  searchParams: Promise<{ error?: string }>
}

export default async function NewProjectPage({ searchParams }: Props) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const ctx = await getOrgContext(supabase, user.id)
  if (!ctx) redirect('/app/onboarding')

  // Members can't create — show clear message
  if (!canWrite(ctx.role)) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">New project</h1>
        <div className="mt-6 rounded-md border border-gray-200 bg-white p-6 text-sm text-gray-600">
          Only owners and admins can create projects. Ask your org owner to
          change your role if needed.
        </div>
      </div>
    )
  }

  // Free plan limit — show upgrade prompt instead of form
  if (ctx.plan === 'free') {
    const { count } = await supabase
      .from('projects')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', ctx.org_id)

    if ((count ?? 0) >= FREE_PLAN_PROJECT_LIMIT) {
      return (
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">New project</h1>
          <div className="mt-6 rounded-md border border-amber-200 bg-amber-50 p-6">
            <p className="text-sm font-medium text-amber-800">
              Free plan limit reached
            </p>
            <p className="mt-1 text-sm text-amber-700">
              Your organization is on the Free plan and has reached the limit of{' '}
              {FREE_PLAN_PROJECT_LIMIT} projects.{' '}
              <Link
                href="/app/settings/billing"
                className="font-medium underline hover:no-underline"
              >
                Upgrade to Pro
              </Link>{' '}
              to create unlimited projects.
            </p>
          </div>
        </div>
      )
    }
  }

  const { error } = await searchParams

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/app/projects"
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          &larr; Projects
        </Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-semibold text-gray-900">New project</h1>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <ProjectForm
          action={createProjectAction}
          error={error}
          submitLabel="Create project"
          cancelHref="/app/projects"
        />
      </div>
    </div>
  )
}
