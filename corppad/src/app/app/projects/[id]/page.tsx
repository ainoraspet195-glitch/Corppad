import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getOrgContext, canWrite } from '@/lib/org'
import { ProjectForm } from '@/components/projects/ProjectForm'
import { updateProjectAction, deleteProjectAction } from '../actions'
import { redirect, notFound } from 'next/navigation'
import type { Project } from '@/types/project'

interface Props {
  params: Promise<{ id: string }>
  searchParams: Promise<{ error?: string }>
}

export default async function ProjectDetailPage({
  params,
  searchParams,
}: Props) {
  const { id } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const ctx = await getOrgContext(supabase, user.id)
  if (!ctx) redirect('/app/onboarding')

  // Fetch project — RLS ensures only projects in user's org are returned
  const { data: project, error: fetchError } = await supabase
    .from('projects')
    .select(
      'id, org_id, name, description, created_by, created_at, updated_at',
    )
    .eq('id', id)
    .eq('org_id', ctx.org_id) // belt-and-suspenders
    .maybeSingle()

  if (fetchError || !project) notFound()

  const p = project as Project
  const { error } = await searchParams
  const writer = canWrite(ctx.role)

  return (
    <div>
      {/* Breadcrumb */}
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/app/projects"
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          &larr; Projects
        </Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-semibold text-gray-900">{p.name}</h1>
      </div>

      {/* Member read-only view */}
      {!writer ? (
        <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
              Name
            </p>
            <p className="mt-1 text-sm text-gray-900">{p.name}</p>
          </div>
          {p.description && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                Description
              </p>
              <p className="mt-1 text-sm text-gray-700">{p.description}</p>
            </div>
          )}
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
              Created
            </p>
            <p className="mt-1 text-sm text-gray-500">
              {new Date(p.created_at).toLocaleString()}
            </p>
          </div>
          <p className="text-xs text-gray-400">
            You have read-only access. Contact an owner or admin to make
            changes.
          </p>
        </div>
      ) : (
        /* Owner / Admin edit view */
        <div className="space-y-6">
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h2 className="mb-5 text-sm font-semibold text-gray-700">
              Edit project
            </h2>
            <ProjectForm
              action={updateProjectAction}
              projectId={p.id}
              defaultValues={{ name: p.name, description: p.description }}
              error={error}
              submitLabel="Save changes"
              cancelHref="/app/projects"
            />
          </div>

          {/* Danger zone */}
          <div className="rounded-lg border border-red-100 bg-white p-6">
            <h2 className="mb-1 text-sm font-semibold text-red-700">
              Danger zone
            </h2>
            <p className="mb-4 text-sm text-gray-500">
              Permanently delete this project. This action cannot be undone.
            </p>
            <form action={deleteProjectAction}>
              <input type="hidden" name="id" value={p.id} />
              <button
                type="submit"
                className="rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                Delete project
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
