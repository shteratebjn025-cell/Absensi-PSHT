'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function loginAction(
  email: string,
  password: string
): Promise<{ error: string } | never> {
  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { error: 'Email atau password salah. Silakan coba lagi.' }
  }

  // redirect() melempar exception internal Next.js — normal, akan ditangkap
  // oleh client dan menyebabkan navigasi ke /dashboard
  redirect('/dashboard')
}
