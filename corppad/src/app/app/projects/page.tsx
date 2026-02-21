import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getOrgContext, canWrite } from '@/lib/org'
import { FREE_PLAN_PROJECT_LIMIT } from '@/lib/limits'
import { Button } from '@/components/ui/Button'
import { redirect } from 'next/navigation'
import type { Project } from '@/types/project'

const PAGE_SIZE = 10

interface Props {
  searchParams: Promise<{ q?: string; page?: string }>
}

export default async function ProjectsPage({ searchParams }: Props) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const ctx = await getOrgContext(supabase, user.id)
  if (!ctx) redirect('/app/onboarding')

  const { q = '', page: pageParam = '1' } = await searchParams
  const page = Math.max(1, parseInt(pageParam, 10) || 1)
  const rangeStart = (page - 1) * PAGE_SIZE
  const rangeEnd = rangeStart + PAGE_SIZE - 1

  let query = supabase
    .from('projects')
    .select('id, name, description, created_at, updated_at', {
      count: 'exact',
    })
    .eq('org_id', ctx.org_id)
    .order('created_at', { ascending: false })
    .range(rangeStart, rangeEnd)

  if (q.trim()) {
    query = query.or(
      `name.ilike.%${q.trim()}%,description.ilike.%${q.trim()}%`,
    )
  }

  const { data: projects, count, error } = await query

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE)
  const totalCount = count ?? 0
  const atFreeLimit =
    ctx.plan === 'free' && totalCount >= FREE_PLAN_PROJECT_LIMIT

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Projects</h1>
          <p className="mt-1 text-sm text-gray-500">
            {ctx.plan === 'free' ? (
              <>
                {totalCount} / {FREE_PLAN_PROJECT_LIMIT} on Free plan
                {atFreeLimit && (
                  <>
                    {' '}·{' '}
                    <Link
                      href="/app/settings/billing"
                      className="font-medium text-indigo-600 hover:text-indigo-700"
                    >
                      Upgrade to Pro
                    </Link>
                  </>
                )}
              </>
            ) : (
              <>{totalCount} projects · Pro plan</>
            )}
          </p>
        </div>

        {canWrite(ctx.role) &&
          (atFreeLimit ? (
            <span className="inline-flex cursor-not-allowed items-center rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-400">
              + New project
            </span>
          ) : (
            <Link
              href="/app/projects/new"
              className="inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
            >
              + New project
            </Link>
          ))}
      </div>

      {/* Free-limit banner */}
      {atFreeLimit && canWrite(ctx.role) && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          You&apos;ve reached the Free plan limit of {FREE_PLAN_PROJECT_LIMIT} projects.{' '}
          <Link
            href="/app/settings/billing"
            className="font-medium underline hover:no-underline"
          >
            Upgrade to Pro
          </Link>{' '}
          to create unlimited projects.
        </div>
      )}

      {/* Search */}
      <form method="GET">
        <div className="flex gap-2">
          <input
            name="q"
            type="search"
            defaultValue={q}
            placeholder="Search projects…"
            className="w-full max-w-xs rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
          <Button type="submit" variant="secondary" size="md">
            Search
          </Button>
          {q && (
            <Link
              href="/app/projects"
              className="flex items-center rounded-lg px-3 py-2 text-sm text-gray-500 hover:text-gray-700"
            >
              Clear
            </Link>
          )}
        </div>
      </form>

      {/* List */}
      {error ? (
        <p className="text-sm text-red-600">
          Failed to load projects: {error.message}
        </p>
      ) : !projects || projects.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-12 text-center">
          <p className="text-sm text-gray-500">
            {q ? 'No projects match your search.' : 'No projects yet.'}
          </p>
          {!q && canWrite(ctx.role) && !atFreeLimit && (
            <Link
              href="/app/projects/new"
              className="mt-4 inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Create your first project
            </Link>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <ul className="divide-y divide-gray-100">
            {(projects as Project[]).map((p) => (
              <li key={p.id}>
                <Link
                  href={`/app/projects/${p.id}`}
                  className="flex items-start justify-between gap-4 px-5 py-4 transition-colors hover:bg-gray-50"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900">
                      {p.name}
                    </p>
                    {p.description && (
                      <p className="mt-0.5 truncate text-sm text-gray-500">
                        {p.description}
                      </p>
                    )}
                  </div>
                  <time className="shrink-0 text-xs text-gray-400">
                    {new Date(p.created_at).toLocaleDateString()}
                  </time>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`/app/projects?page=${page - 1}${q ? `&q=${encodeURIComponent(q)}` : ''}`}
                className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm hover:bg-gray-50"
              >
                &larr; Previous
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`/app/projects?page=${page + 1}${q ? `&q=${encodeURIComponent(q)}` : ''}`}
                className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm hover:bg-gray-50"
              >
                Next &rarr;
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
