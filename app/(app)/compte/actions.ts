'use server'

import { DEMO } from '@/lib/mode'
import { createClient } from '@/lib/supabase/server'

export type Result = { ok: true } | { ok: false; error: string }

export async function changePassword(password: string, confirm: string): Promise<Result> {
  if (DEMO) return { ok: true }
  if (password.length < 10) return { ok: false, error: 'Le mot de passe doit faire au moins 10 caractères.' }
  if (password !== confirm) return { ok: false, error: 'Les deux saisies sont différentes.' }
  const sb = await createClient()
  const { error } = await sb.auth.updateUser({ password })
  return error ? { ok: false, error: error.message.includes('same') ? 'Choisissez un mot de passe différent de l’ancien.' : error.message } : { ok: true }
}
