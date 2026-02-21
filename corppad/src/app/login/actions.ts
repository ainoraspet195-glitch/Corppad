'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getMissingPublicEnv } from '@/lib/env'

export async function loginAction(formData: FormData) {
  if (getMissingPublicEnv().length > 0) return

  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  })

  // Preserve next param in error redirect so it survives the failed attempt
  const nextParam = (formData.get('next') as string | null)?.trim() ?? ''
  const nextSuffix = nextParam ? `&next=${encodeURIComponent(nextParam)}` : ''

  if (error) {
    redirect(
      `/login?error=${encodeURIComponent(error.message)}${nextSuffix}`,
    )
  }

  // Only allow relative paths to prevent open-redirect
  const destination =
    nextParam.startsWith('/') && !nextParam.startsWith('//') ? nextParam : '/app'

  redirect(destination)
}
