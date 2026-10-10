'use server'

import { DEMO } from '@/lib/mode'
import { createClient } from '@/lib/supabase/server'

export type Result = { ok: true } | { ok: false; error: string }
const refused = 'Seuls les responsables et l’équipe technique peuvent faire cette modification.'

async function me() {
  const sb = await createClient()
  const { data: auth } = await sb.auth.getUser()
  const staff = auth.user ? (await sb.from('staff').select('id').eq('profile_id', auth.user.id).maybeSingle()).data : null
  return { sb, user: auth.user, staffId: staff?.id ?? null }
}

/** Réserve un véhicule. La base refuse les chevauchements et les véhicules au garage. */
export async function createBooking(vehicleId: string, day: string, period: 'm' | 'a' | 'j', motif: string): Promise<Result> {
  if (DEMO) return { ok: true }
  const { sb, user, staffId } = await me()
  if (!user) return { ok: false, error: 'Vous n’êtes pas connecté.' }
  const { error } = await sb.from('vehicle_bookings').insert({ vehicle_id: vehicleId, day, period, motif, driver_id: staffId })
  return error ? { ok: false, error: error.message } : { ok: true }
}

/** Annule une réservation (la sienne, ou n'importe laquelle pour les responsables). */
export async function cancelBooking(id: string): Promise<Result> {
  if (DEMO) return { ok: true }
  const sb = await createClient()
  const { data, error } = await sb.from('vehicle_bookings').delete().eq('id', id).select('id')
  if (error) return { ok: false, error: error.message }
  return data?.length ? { ok: true } : { ok: false, error: 'Vous ne pouvez annuler que vos propres réservations.' }
}

/** Ajoute une ligne au carnet de bord : trajet (km), plein (€) ou entretien (note). Un trajet fait avancer le compteur. */
export async function addLog(vehicleId: string, kind: 'trip' | 'fuel' | 'maint', label: string, km: number, euros: number): Promise<Result> {
  if (DEMO) return { ok: true }
  if (kind === 'trip' && !(km > 0)) return { ok: false, error: 'Indiquez les kilomètres parcourus.' }
  const { sb, user, staffId } = await me()
  if (!user) return { ok: false, error: 'Vous n’êtes pas connecté.' }
  const { error } = await sb.from('vehicle_logs').insert({
    vehicle_id: vehicleId, kind, label: label.trim() || (kind === 'trip' ? 'Trajet' : kind === 'fuel' ? 'Plein de carburant' : 'Entretien'),
    km: kind === 'trip' ? Math.round(km) : 0, amount_cents: kind === 'fuel' ? Math.round(euros * 100) : 0, driver_id: staffId,
  })
  return error ? { ok: false, error: error.message } : { ok: true }
}

/** Met un véhicule au garage, ou le remet en service. */
export async function setGarage(vehicleId: string, inGarage: boolean): Promise<Result> {
  if (DEMO) return { ok: true }
  const sb = await createClient()
  const { data, error } = await sb.from('vehicles').update({ in_garage: inGarage }).eq('id', vehicleId).select('id')
  if (error) return { ok: false, error: error.message }
  return data?.length ? { ok: true } : { ok: false, error: refused }
}

export type VehicleInput = { id?: string; name: string; model: string; plate: string; odometer: number; nextServiceKm: number; ct: string; insurance: string }

/** Crée ou modifie un véhicule. */
export async function saveVehicle(v: VehicleInput): Promise<Result> {
  if (DEMO) return { ok: true }
  const name = v.name.trim(), plate = v.plate.trim().toUpperCase()
  if (!name || !plate || v.odometer < 0 || v.nextServiceKm <= 0) return { ok: false, error: 'Vérifiez le nom, la plaque et les kilomètres.' }
  const sb = await createClient()
  const row = { name, model: v.model.trim() || '—', plate, odometer: v.odometer, next_service_km: v.nextServiceKm, ct_due: v.ct || null, insurance_due: v.insurance || null }
  if (v.id) {
    const { data, error } = await sb.from('vehicles').update(row).eq('id', v.id).select('id')
    if (error) return { ok: false, error: error.code === '23505' ? 'Cette plaque existe déjà.' : error.message }
    return data?.length ? { ok: true } : { ok: false, error: refused }
  }
  const { error } = await sb.from('vehicles').insert(row)
  if (error) return { ok: false, error: error.code === '23505' ? 'Cette plaque existe déjà.' : error.code === '42501' ? refused : error.message }
  return { ok: true }
}
