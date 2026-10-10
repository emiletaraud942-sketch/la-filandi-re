'use server'

import { DEMO } from '@/lib/mode'
import { createClient } from '@/lib/supabase/server'

export type Result = { ok: true } | { ok: false; error: string }
const refusedResidents = 'Seuls les responsables peuvent modifier les résidents.'
const refusedEvents = 'Seuls les responsables et l’animation peuvent modifier le programme.'

/** Marque un résident en sortie, ou de retour. */
export async function setAway(residentId: string, away: boolean): Promise<Result> {
  if (DEMO) return { ok: true }
  const sb = await createClient()
  const { data, error } = await sb.from('residents').update({ away }).eq('id', residentId).select('id')
  if (error) return { ok: false, error: error.message }
  return data?.length ? { ok: true } : { ok: false, error: refusedResidents }
}

/** Accueille un résident dans une chambre libre (nom pseudonymisé : civilité et initiales). */
export async function admitResident(roomId: string, civility: string, initials: string): Promise<Result> {
  if (DEMO) return { ok: true }
  const ini = initials.trim().toUpperCase().replace(/[^A-ZÀ-Ý]/g, '')
  if (ini.length < 1 || ini.length > 3 || !['Mme', 'M.'].includes(civility)) return { ok: false, error: 'Indiquez la civilité et deux ou trois initiales.' }
  const name = `${civility} ${ini.split('').join('. ')}.`
  const sb = await createClient()
  const { error } = await sb.from('residents').insert({ room_id: roomId, display_name: name })
  if (error) return { ok: false, error: error.code === '23505' ? 'Cette chambre est déjà occupée.' : error.code === '42501' ? refusedResidents : error.message }
  return { ok: true }
}

/** Départ définitif d'un résident : la chambre redevient libre, l'historique reste. */
export async function dischargeResident(residentId: string): Promise<Result> {
  if (DEMO) return { ok: true }
  const sb = await createClient()
  const { data, error } = await sb.from('residents').update({ active: false }).eq('id', residentId).select('id')
  if (error) return { ok: false, error: error.message }
  return data?.length ? { ok: true } : { ok: false, error: refusedResidents }
}

export type NewEvent = { residentId: string; day: string; start: number; label: string; place: string; kind: 'meal' | 'ani' | 'vis' | 'coif' | 'out' }

export async function addEvent(e: NewEvent): Promise<Result & { id?: string }> {
  if (DEMO) return { ok: true, id: 'demo' }
  const label = e.label.trim()
  if (!label || e.start < 0 || e.start > 1439) return { ok: false, error: 'Indiquez un libellé et une heure valide.' }
  const sb = await createClient()
  const { data, error } = await sb.from('resident_events').insert({ resident_id: e.residentId, day: e.day, start_min: e.start, label, place: e.place.trim() || null, kind: e.kind }).select('id').single()
  if (error) return { ok: false, error: error.code === '42501' ? refusedEvents : error.message }
  return { ok: true, id: data.id }
}

export async function deleteEvent(id: string): Promise<Result> {
  if (DEMO) return { ok: true }
  const sb = await createClient()
  const { data, error } = await sb.from('resident_events').delete().eq('id', id).select('id')
  if (error) return { ok: false, error: error.message }
  return data?.length ? { ok: true } : { ok: false, error: refusedEvents }
}
