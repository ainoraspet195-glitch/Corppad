import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getMissingPublicEnv } from '@/lib/env'
import { MissingEnv } from '@/components/MissingEnv'
import { redirect } from 'next/navigation'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const missing = getMissingPublicEnv()
  if (missing.length > 0) return <MissingEnv missing={missing} />

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 border-r border-gray-200 bg-white">
        <div className="flex h-14 items-center border-b border-gray-200 px-4">
          <span className="text-lg font-semibold text-gray-900">Corppad</span>
        </div>
        <nav className="p-3 space-y-1">
          <Link
            href="/app"
            className="flex items-center rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            Dashboard
          </Link>
          <Link
            href="/app/projects"
            className="flex items-center rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            Projects
          </Link>
          <Link
            href="/app/settings/team"
            className="flex items-center rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            Team
          </Link>
          <Link
            href="/app/settings/billing"
            className="flex items-center rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            Billing
          </Link>
        </nav>
        <div className="absolute bottom-0 left-0 w-56 border-t border-gray-200 bg-white p-3">
          <form action="/logout" method="POST">
            <button
              type="submit"
              className="w-full rounded-md px-3 py-2 text-left text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            >
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="mx-auto max-w-5xl px-6 py-8">{children}</div>
      </main>
    </div>
  )
}
