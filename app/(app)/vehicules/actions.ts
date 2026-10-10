'use server'

import { DEMO } from '@/lib/mode'
import { createClient } from '@/lib/supabase/server'

export type Result = { ok: true } | { ok: false; error: string }

/** Réserve un véhicule. La base refuse les chevauchements et les véhicules au garage. */
export async function createBooking(vehicleId: string, day: string, period: 'm' | 'a' | 'j', motif: string): Promise<Result> {
  if (DEMO) return { ok: true }
  const sb = await createClient()
  const { data: auth } = await sb.auth.getUser()
  if (!auth.user) return { ok: false, error: 'Vous n’êtes pas connecté.' }
  const { data: me } = await sb.from('staff').select('id').eq('profile_id', auth.user.id).maybeSingle()
  const { error } = await sb.from('vehicle_bookings').insert({ vehicle_id: vehicleId, day, period, motif, driver_id: me?.id ?? null })
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}
