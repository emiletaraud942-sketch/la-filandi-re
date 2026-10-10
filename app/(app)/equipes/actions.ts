'use server'

import { DEMO } from '@/lib/mode'
import { createClient } from '@/lib/supabase/server'

export type Result = { ok: true } | { ok: false; error: string }
const KINDS = ['m', 's', 'n', 'off', 'leave', 'abs'] as const

/** Fixe l'équipe d'une personne pour un jour (matin, soir, nuit, repos, congé, absent). Réservé aux responsables. */
export async function setShift(staffId: string, day: string, kind: (typeof KINDS)[number], pauseStart?: number): Promise<Result> {
  if (DEMO) return { ok: true }
  if (!KINDS.includes(kind) || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return { ok: false, error: 'Valeur invalide.' }
  const sb = await createClient()
  const { error } = await sb.from('shifts').upsert(
    { staff_id: staffId, day, kind, pause_start_min: ['m', 's', 'n'].includes(kind) ? (pauseStart ?? 630) : null },
    { onConflict: 'staff_id,day' },
  )
  if (error) return { ok: false, error: error.code === '42501' ? 'Seuls les responsables peuvent modifier le planning.' : error.message }
  return { ok: true }
}
