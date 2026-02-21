import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getMissingPublicEnv } from '@/lib/env'

export async function POST() {
  if (getMissingPublicEnv().length > 0) {
    return NextResponse.redirect(new URL('/login', getBaseUrl()))
  }

  const supabase = await createClient()
  await supabase.auth.signOut()

  return NextResponse.redirect(new URL('/login', getBaseUrl()))
}

function getBaseUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
}
