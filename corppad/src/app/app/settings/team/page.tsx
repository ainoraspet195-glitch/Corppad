import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getOrgContext, canWrite } from '@/lib/org'
import { CopyLink } from '@/components/CopyLink'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { generateInviteAction, removeMemberAction } from './actions'
import { redirect } from 'next/navigation'

interface Props {
  searchParams: Promise<{ invite?: string; error?: string }>
}

export default async function TeamPage({ searchParams }: Props) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const ctx = await getOrgContext(supabase, user.id)
  if (!ctx) redirect('/app/onboarding')

  const { data: members } = await supabase
    .from('org_members')
    .select('id, user_id, role, created_at')
    .eq('org_id', ctx.org_id)
    .order('created_at', { ascending: true })

  const admin = createAdminClient()
  const {
    data: { users: authUsers },
  } = await admin.auth.admin.listUsers({ perPage: 1000 })
  const emailMap = new Map(authUsers.map((u) => [u.id, u.email ?? u.id]))

  const membersWithEmail = (members ?? []).map((m) => ({
    ...m,
    email: emailMap.get(m.user_id as string) ?? (m.user_id as string),
  }))

  const { invite: inviteToken, error } = await searchParams

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const inviteLink = inviteToken
    ? `${appUrl}/invite/${inviteToken}`
    : null

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Team</h1>
        <p className="mt-1 text-sm text-gray-500">
          {ctx.org_name} &mdash;{' '}
          {membersWithEmail.length}{' '}
          {membersWithEmail.length === 1 ? 'member' : 'members'}
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Generated invite link banner */}
      {inviteLink && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-5">
          <p className="mb-3 text-sm font-semibold text-green-800">
            Invite link created — share it with your teammate:
          </p>
          <CopyLink link={inviteLink} />
          <p className="mt-2 text-xs text-green-700">
            Single-use link · expires in 7 days.
          </p>
        </div>
      )}

      {/* Generate invite form (owner/admin only) */}
      {canWrite(ctx.role) && (
        <Card>
          <h2 className="mb-4 text-sm font-semibold text-gray-700">
            Invite a new member
          </h2>
          <form action={generateInviteAction} className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label htmlFor="role" className="text-sm text-gray-600">
                Role
              </label>
              <select
                id="role"
                name="role"
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <Button type="submit">Generate invite link</Button>
          </form>
        </Card>
      )}

      {/* Member list */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-gray-700">Members</h2>
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <ul className="divide-y divide-gray-100">
            {membersWithEmail.map((m) => (
              <li
                key={m.id as string}
                className="flex items-center justify-between px-5 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-900">
                    {m.email}
                    {m.user_id === user.id && (
                      <span className="ml-2 text-xs font-normal text-gray-400">(you)</span>
                    )}
                  </p>
                  <p className="text-xs capitalize text-gray-500">{m.role as string}</p>
                </div>

                {canWrite(ctx.role) &&
                  (m.role as string) !== 'owner' &&
                  m.user_id !== user.id && (
                    <form action={removeMemberAction}>
                      <input
                        type="hidden"
                        name="user_id"
                        value={m.user_id as string}
                      />
                      <button
                        type="submit"
                        className="ml-4 shrink-0 rounded-lg px-2.5 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500"
                      >
                        Remove
                      </button>
                    </form>
                  )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
