'use server'

import { DEMO } from '@/lib/mode'
import { createClient } from '@/lib/supabase/server'

export type Result = { ok: true } | { ok: false; error: string }
export type Mark = 'present' | 'absent' | 'excused' | null
export type SessionInput = {
  kind: 'formation' | 'reunion' | 'activite'; title: string; day: string; start: number; end: number; place: string; lead: string
  staffIds: string[]; residentIds: string[]
}

const msg = (m: string) => (m.includes('clôturée') ? 'Cette feuille est clôturée : plus aucune modification possible.' : m)

/** Enregistre une présence (signature), une absence ou une excuse ; `null` annule. Un agent ne signe que pour lui-même. */
export async function markAttendance(attendeeId: string, status: Mark): Promise<Result> {
  if (DEMO) return { ok: true }
  const sb = await createClient()
  const { data, error } = await sb.from('session_attendees')
    .update({ status, signed_at: status === 'present' ? new Date().toISOString() : null })
    .eq('id', attendeeId).select('id')
  if (error) return { ok: false, error: msg(error.message) }
  if (!data?.length) return { ok: false, error: 'Vous ne pouvez signer que pour vous-même.' }
  return { ok: true }
}

/** Clôture la feuille : plus aucune modification ensuite. */
export async function closeSession(sessionId: string): Promise<Result> {
  if (DEMO) return { ok: true }
  const sb = await createClient()
  const { data, error } = await sb.from('sessions').update({ closed_at: new Date().toISOString() }).eq('id', sessionId).select('id')
  if (error) return { ok: false, error: error.message }
  if (!data?.length) return { ok: false, error: 'Seuls les responsables et l’animation peuvent clôturer la feuille.' }
  return { ok: true }
}

/** Crée une séance et sa liste de participants. */
export async function createSession(input: SessionInput): Promise<Result & { id?: string }> {
  if (DEMO) return { ok: true }
  const title = input.title.trim()
  if (title.length < 2) return { ok: false, error: 'Donnez un titre à la séance.' }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.day)) return { ok: false, error: 'Date invalide.' }
  if (!(input.end > input.start)) return { ok: false, error: 'L’heure de fin doit être après le début.' }
  const n = input.staffIds.length + input.residentIds.length
  if (!n) return { ok: false, error: 'Choisissez au moins un participant.' }
  const sb = await createClient()
  const { data, error } = await sb.from('sessions')
    .insert({ kind: input.kind, title, day: input.day, start_min: input.start, end_min: input.end, place: input.place.trim() || null, lead: input.lead.trim() || null })
    .select('id').single()
  if (error) return { ok: false, error: error.code === '42501' ? 'Réservé aux responsables et à l’animation.' : error.message }
  const rows = [
    ...input.staffIds.map((staff_id) => ({ session_id: data.id, staff_id })),
    ...input.residentIds.map((resident_id) => ({ session_id: data.id, resident_id })),
  ]
  const { error: e2 } = await sb.from('session_attendees').insert(rows)
  if (e2) {
    await sb.from('sessions').delete().eq('id', data.id)
    return { ok: false, error: e2.message }
  }
  return { ok: true, id: data.id }
}

/** Supprime une séance (avec sa liste). Impossible une fois la feuille clôturée. */
export async function deleteSession(sessionId: string): Promise<Result> {
  if (DEMO) return { ok: true }
  const sb = await createClient()
  const { data, error } = await sb.from('sessions').delete().eq('id', sessionId).select('id')
  if (error) return { ok: false, error: msg(error.message) }
  return data?.length ? { ok: true } : { ok: false, error: 'Réservé aux responsables et à l’animation.' }
}
