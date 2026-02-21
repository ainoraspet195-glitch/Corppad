import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getMissingPublicEnv } from '@/lib/env'
import { MissingEnv } from '@/components/MissingEnv'
import { redirect } from 'next/navigation'

const navLinks = [
  { href: '/app', label: 'Dashboard' },
  { href: '/app/projects', label: 'Projects' },
  { href: '/app/settings/team', label: 'Team' },
  { href: '/app/settings/billing', label: 'Billing' },
]

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
      <aside className="flex w-60 shrink-0 flex-col border-r border-gray-200 bg-white">
        {/* Logo */}
        <div className="flex h-14 items-center border-b border-gray-100 px-5">
          <Link href="/app" className="text-sm font-bold tracking-widest text-blue-600">
            CORPPAD
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-0.5 p-3">
          {navLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* Sign out */}
        <div className="border-t border-gray-100 p-3">
          <form action="/logout" method="POST">
            <button
              type="submit"
              className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
            >
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="mx-auto max-w-5xl px-8 py-8">{children}</div>
      </main>
    </div>
  )
}
