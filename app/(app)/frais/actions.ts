'use server'

import { DEMO } from '@/lib/mode'
import { createClient } from '@/lib/supabase/server'

export type Result = { ok: true } | { ok: false; error: string }

/** Enregistre une dépense cachée (tout le personnel connecté peut en saisir ; seuls les responsables les consultent). */
export async function addExpense(category: 'pet' | 'tps' | 'cout', subcategory: string, euros: number, hours: number): Promise<Result> {
  if (DEMO) return { ok: true }
  const sb = await createClient()
  const { error } = await sb.from('expenses').insert({ category, subcategory, amount_cents: Math.round(euros * 100), hours })
  return error ? { ok: false, error: error.message } : { ok: true }
}
