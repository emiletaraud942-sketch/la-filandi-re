'use server'

import { DEMO } from '@/lib/mode'
import { createClient } from '@/lib/supabase/server'

export type Result = { ok: true } | { ok: false; error: string }
export type VisitInput = { slotId: string; name: string; email: string; resident: string; persons: number; charter: boolean; website?: string }

const refused = 'Cette action est réservée à l’accueil et aux responsables.'

/** Demande de visite d'une famille (sans compte). Les contrôles sont faits par la fonction SQL request_visit. */
export async function submitVisit(input: VisitInput): Promise<Result> {
  if (input.website) return { ok: true } // champ piège : un robot l'a rempli, on fait semblant
  if (DEMO) return { ok: true }
  const sb = await createClient()
  const { error } = await sb.rpc('request_visit', {
    p_slot: input.slotId, p_name: input.name, p_email: input.email,
    p_resident: input.resident, p_persons: input.persons, p_charter: input.charter,
  })
  return error ? { ok: false, error: error.message } : { ok: true }
}

/** Confirme ou refuse une demande. Le courrier correspondant est mis en file par la base. */
export async function decideVisit(id: string, status: 'confirmed' | 'refused'): Promise<Result> {
  if (DEMO) return { ok: true }
  const sb = await createClient()
  const { data: u } = await sb.auth.getUser()
  const { data, error } = await sb.from('visit_requests')
    .update({ status, decided_at: new Date().toISOString(), decided_by: u.user?.id ?? null })
    .eq('id', id).select('id')
  if (error) return { ok: false, error: error.message }
  return data?.length ? { ok: true } : { ok: false, error: refused }
}

/** Ouvre les créneaux standard des 14 prochains jours (sans doublon). */
export async function openSlots(): Promise<Result & { created?: number }> {
  if (DEMO) return { ok: true, created: 0 }
  const sb = await createClient()
  const { data, error } = await sb.rpc('generate_visit_slots', { p_days: 14 })
  if (error) return { ok: false, error: error.message.includes('Réservé') ? refused : error.message }
  return { ok: true, created: data ?? 0 }
}

/** Envoie les courriers en attente via Resend. Sans RESEND_API_KEY et MAIL_FROM, rien n'est envoyé. */
export async function sendOutbox(): Promise<Result & { sent?: number }> {
  if (DEMO) return { ok: true, sent: 0 }
  const key = process.env.RESEND_API_KEY, from = process.env.MAIL_FROM
  if (!key || !from) return { ok: false, error: 'L’envoi d’e-mails n’est pas encore configuré (RESEND_API_KEY et MAIL_FROM).' }
  const sb = await createClient()
  const { data, error } = await sb.from('outbox').select('id, to_email, subject, body').is('sent_at', null).order('created_at').limit(25)
  if (error) return { ok: false, error: error.message }
  let sent = 0, last = ''
  for (const m of data ?? []) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to: [m.to_email], subject: m.subject, text: m.body }),
      })
      if (res.ok) {
        await sb.from('outbox').update({ sent_at: new Date().toISOString(), error: null }).eq('id', m.id)
        sent++
      } else {
        last = `${res.status} ${(await res.text()).slice(0, 160)}`
        await sb.from('outbox').update({ error: last }).eq('id', m.id)
      }
    } catch (e) {
      last = e instanceof Error ? e.message : 'Erreur réseau'
      await sb.from('outbox').update({ error: last }).eq('id', m.id)
    }
  }
  if (last && !sent) return { ok: false, error: `Envoi impossible : ${last}` }
  return { ok: true, sent }
}
