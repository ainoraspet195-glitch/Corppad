import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getOrgContext, canWrite } from '@/lib/org'
import { ProjectForm } from '@/components/projects/ProjectForm'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
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

  const { data: project, error: fetchError } = await supabase
    .from('projects')
    .select(
      'id, org_id, name, description, created_by, created_at, updated_at',
    )
    .eq('id', id)
    .eq('org_id', ctx.org_id)
    .maybeSingle()

  if (fetchError || !project) notFound()

  const p = project as Project
  const { error } = await searchParams
  const writer = canWrite(ctx.role)

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <Link href="/app/projects" className="text-gray-500 hover:text-gray-700">
          Projects
        </Link>
        <span className="text-gray-300">/</span>
        <span className="font-medium text-gray-900">{p.name}</span>
      </div>

      {/* Member read-only view */}
      {!writer ? (
        <Card>
          <div className="space-y-4">
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
        </Card>
      ) : (
        /* Owner / Admin edit view */
        <>
          <Card>
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
          </Card>

          {/* Danger zone */}
          <div className="rounded-xl border border-red-100 bg-white p-6 shadow-sm">
            <h2 className="mb-1 text-sm font-semibold text-red-700">
              Danger zone
            </h2>
            <p className="mb-4 text-sm text-gray-500">
              Permanently delete this project. This action cannot be undone.
            </p>
            <form action={deleteProjectAction}>
              <input type="hidden" name="id" value={p.id} />
              <Button type="submit" variant="danger">
                Delete project
              </Button>
            </form>
          </div>
        </>
      )}
    </div>
  )
}
