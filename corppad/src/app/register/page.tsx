import Link from 'next/link'
import { getMissingPublicEnv } from '@/lib/env'
import { MissingEnv } from '@/components/MissingEnv'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { registerAction } from './actions'

interface Props {
  searchParams: Promise<{ error?: string }>
}

export default async function RegisterPage({ searchParams }: Props) {
  const missing = getMissingPublicEnv()
  if (missing.length > 0) return <MissingEnv missing={missing} />

  const { error } = await searchParams

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="mb-8 text-center">
          <Link href="/app" className="text-sm font-bold tracking-widest text-blue-600">
            CORPPAD
          </Link>
          <h1 className="mt-4 text-2xl font-semibold text-gray-900">
            Create your account
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Get started for free — no credit card required
          </p>
        </div>

        {/* Card */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <form action={registerAction} className="space-y-4">
            <Input
              label="Email"
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
            />

            <Input
              label="Password"
              id="password"
              name="password"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              placeholder="Min. 6 characters"
            />

            <Button type="submit" className="w-full mt-2">
              Create account
            </Button>
          </form>
        </div>

        <p className="mt-4 text-center text-sm text-gray-500">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-indigo-600 hover:text-indigo-700">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
