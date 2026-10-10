'use server'

import { DEMO } from '@/lib/mode'
import { createClient } from '@/lib/supabase/server'

export type Result = { ok: true } | { ok: false; error: string }

/** Signature (présence) d'une personne sur une feuille : la sienne, ou celles de la séance pour l'organisateur. */
export async function signAttendance(attendeeId: string): Promise<Result> {
  if (DEMO) return { ok: true }
  const sb = await createClient()
  const { data, error } = await sb.from('session_attendees').update({ status: 'present' }).eq('id', attendeeId).select('id')
  if (error) return { ok: false, error: error.message }
  if (!data?.length) return { ok: false, error: 'Vous ne pouvez signer que pour vous-même.' }
  return { ok: true }
}

/** Clôture la feuille : plus aucune modification ensuite. */
export async function closeSession(sessionId: string): Promise<Result> {
  if (DEMO) return { ok: true }
  const sb = await createClient()
  const { data, error } = await sb.from('sessions').update({ closed_at: new Date().toISOString() }).eq('id', sessionId).select('id')
  if (error) return { ok: false, error: error.message }
  if (!data?.length) return { ok: false, error: 'Seul l’organisateur peut clôturer la feuille.' }
  return { ok: true }
}
