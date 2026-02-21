import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { acceptInviteAction } from './actions'

interface Props {
  params: Promise<{ token: string }>
  searchParams: Promise<{ error?: string }>
}

export default async function AcceptInvitePage({ params, searchParams }: Props) {
  const { token } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Not signed in — send to login with return URL
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/invite/${token}`)}`)
  }

  const admin = createAdminClient()

  // Read invite via admin client (user is not yet an org member)
  const { data: invite } = await admin
    .from('invites')
    .select('id, org_id, role, expires_at, used_at, organizations(name)')
    .eq('token', token)
    .maybeSingle()

  const { error } = await searchParams

  // ── Invalid token ────────────────────────────────────────────
  if (!invite) {
    return (
      <InviteShell>
        <h1 className="text-xl font-semibold text-gray-900">Invalid invite</h1>
        <p className="mt-2 text-sm text-gray-500">
          This invite link is invalid or has been deleted.
        </p>
        <Link
          href="/app"
          className="mt-4 inline-block text-sm text-blue-600 hover:underline"
        >
          Go to dashboard
        </Link>
      </InviteShell>
    )
  }

  // ── Already used ─────────────────────────────────────────────
  if (invite.used_at) {
    return (
      <InviteShell>
        <h1 className="text-xl font-semibold text-gray-900">
          Invite already used
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          This invite link has already been used and is no longer valid.
        </p>
        <Link
          href="/app"
          className="mt-4 inline-block text-sm text-blue-600 hover:underline"
        >
          Go to dashboard
        </Link>
      </InviteShell>
    )
  }

  // ── Expired ──────────────────────────────────────────────────
  if (new Date(invite.expires_at as string) < new Date()) {
    return (
      <InviteShell>
        <h1 className="text-xl font-semibold text-gray-900">Invite expired</h1>
        <p className="mt-2 text-sm text-gray-500">
          This invite link expired on{' '}
          {new Date(invite.expires_at as string).toLocaleDateString()}. Ask an
          admin to generate a new one.
        </p>
      </InviteShell>
    )
  }

  // ── Already a member of this org ─────────────────────────────
  const { data: existing } = await admin
    .from('org_members')
    .select('id')
    .eq('org_id', invite.org_id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (existing) {
    redirect('/app')
  }

  const orgRaw = invite.organizations
  const orgName =
    (Array.isArray(orgRaw) ? orgRaw[0] : orgRaw)?.name ?? 'the organization'

  // ── Ready to accept ──────────────────────────────────────────
  return (
    <InviteShell>
      <h1 className="text-xl font-semibold text-gray-900">
        You&apos;ve been invited
      </h1>
      <p className="mt-2 text-sm text-gray-500">
        Join{' '}
        <span className="font-medium text-gray-700">{orgName}</span> as a{' '}
        <span className="font-medium capitalize text-gray-700">
          {invite.role as string}
        </span>
        .
      </p>
      <p className="mt-1 text-xs text-gray-400">
        Signed in as {user.email}
      </p>

      {error && (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form action={acceptInviteAction} className="mt-6">
        <input type="hidden" name="token" value={token} />
        <button
          type="submit"
          className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Accept &amp; join {orgName}
        </button>
      </form>

      <p className="mt-3 text-center text-xs text-gray-400">
        Not you?{' '}
        <Link href="/logout" className="text-blue-600 hover:underline">
          Sign out
        </Link>
      </p>
    </InviteShell>
  )
}

function InviteShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
        {children}
      </div>
    </div>
  )
}
