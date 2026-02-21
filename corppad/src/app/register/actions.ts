'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getMissingPublicEnv } from '@/lib/env'

export async function registerAction(formData: FormData) {
  if (getMissingPublicEnv().length > 0) return

  const supabase = await createClient()

  const { error } = await supabase.auth.signUp({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  })

  if (error) {
    redirect(`/register?error=${encodeURIComponent(error.message)}`)
  }

  // After sign-up the session is set; send to onboarding
  redirect('/app/onboarding')
}
