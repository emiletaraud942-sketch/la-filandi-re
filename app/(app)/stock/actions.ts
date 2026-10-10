'use server'

import { DEMO } from '@/lib/mode'
import { createClient } from '@/lib/supabase/server'

export type Result = { ok: true } | { ok: false; error: string }

/** Marque un article comme commandé (réservé aux responsables et à l'équipe technique). */
export async function orderItem(id: string): Promise<Result> {
  if (DEMO) return { ok: true }
  const sb = await createClient()
  const { data, error } = await sb.from('stock_items').update({ ordered_at: new Date().toISOString() }).eq('id', id).select('id')
  if (error) return { ok: false, error: error.message }
  if (!data?.length) return { ok: false, error: 'Seuls les responsables et l’équipe technique peuvent commander.' }
  return { ok: true }
}
