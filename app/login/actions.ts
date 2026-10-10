'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function signIn(formData: FormData) {
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: String(formData.get('email') ?? ''),
    password: String(formData.get('password') ?? ''),
  })
  if (error) redirect('/login?erreur=1')
  redirect('/')
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

/** Envoie le lien de réinitialisation. La réponse est la même que l'adresse existe ou non. */
export async function requestReset(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim()
  if (email) {
    const h = await headers()
    const host = h.get('x-forwarded-host') ?? h.get('host')
    const proto = h.get('x-forwarded-proto') ?? 'https'
    const supabase = await createClient()
    await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${proto}://${host}/auth/callback` })
  }
  redirect('/login/oubli?envoye=1')
}
