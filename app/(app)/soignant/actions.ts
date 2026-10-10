'use server'

import { DEMO } from '@/lib/mode'
import { createClient } from '@/lib/supabase/server'

export type Result = { ok: true } | { ok: false; error: string }

async function myStaffId() {
  const sb = await createClient()
  const { data: auth } = await sb.auth.getUser()
  if (!auth.user) return { sb, id: null as string | null }
  const { data } = await sb.from('staff').select('id').eq('profile_id', auth.user.id).maybeSingle()
  return { sb, id: data?.id ?? null }
}

/** Pointe l'arrivée. */
export async function clockIn(): Promise<Result> {
  if (DEMO) return { ok: true }
  const { sb, id } = await myStaffId()
  if (!id) return { ok: false, error: 'Votre compte n’est pas lié à une fiche du personnel.' }
  const { data: open } = await sb.from('time_clock').select('id').eq('staff_id', id).is('out_at', null).limit(1)
  if (open?.length) return { ok: false, error: 'Vous avez déjà pointé votre arrivée.' }
  const { error } = await sb.from('time_clock').insert({ staff_id: id })
  return error ? { ok: false, error: error.message } : { ok: true }
}

/** Pointe le départ. */
export async function clockOut(): Promise<Result> {
  if (DEMO) return { ok: true }
  const { sb, id } = await myStaffId()
  if (!id) return { ok: false, error: 'Votre compte n’est pas lié à une fiche du personnel.' }
  const { data, error } = await sb.from('time_clock').update({ out_at: new Date().toISOString() }).eq('staff_id', id).is('out_at', null).select('id')
  if (error) return { ok: false, error: error.message }
  return data?.length ? { ok: true } : { ok: false, error: 'Aucune arrivée à clôturer.' }
}
