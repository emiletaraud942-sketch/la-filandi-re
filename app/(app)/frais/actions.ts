'use server'

import { DEMO } from '@/lib/mode'
import { createClient } from '@/lib/supabase/server'

export type Result = { ok: true } | { ok: false; error: string }
type Cat = 'pet' | 'tps' | 'cout'

const refused = 'Réservé à l’administration, à la direction et aux cadres.'

/** Enregistre une dépense cachée (tout le personnel connecté peut en saisir ; seuls les responsables les consultent). */
export async function addExpense(category: Cat, subcategory: string, euros: number, hours: number, floor: number | null): Promise<Result> {
  if (DEMO) return { ok: true }
  if (!(euros >= 0) || !(hours >= 0)) return { ok: false, error: 'Montant invalide.' }
  const sb = await createClient()
  const { error } = await sb.from('expenses').insert({ category, subcategory, amount_cents: Math.round(euros * 100), hours, floor_id: floor })
  return error ? { ok: false, error: error.message } : { ok: true }
}

/** Corrige le montant et les heures d'une saisie. */
export async function updateExpense(id: string, euros: number, hours: number): Promise<Result> {
  if (DEMO) return { ok: true }
  if (!(euros >= 0) || !(hours >= 0)) return { ok: false, error: 'Montant invalide.' }
  const sb = await createClient()
  const { data, error } = await sb.from('expenses').update({ amount_cents: Math.round(euros * 100), hours }).eq('id', id).select('id')
  if (error) return { ok: false, error: error.message }
  return data?.length ? { ok: true } : { ok: false, error: refused }
}

export async function deleteExpense(id: string): Promise<Result> {
  if (DEMO) return { ok: true }
  const sb = await createClient()
  const { data, error } = await sb.from('expenses').delete().eq('id', id).select('id')
  if (error) return { ok: false, error: error.message }
  return data?.length ? { ok: true } : { ok: false, error: refused }
}

/** Fixe les repères mensuels (en euros) pour un mois « AAAA-MM ». */
export async function saveTargets(month: string, targets: Record<Cat, number>): Promise<Result> {
  if (DEMO) return { ok: true }
  if (!/^\d{4}-\d{2}$/.test(month)) return { ok: false, error: 'Mois invalide.' }
  const rows = (Object.keys(targets) as Cat[]).map((category) => ({ category, month: month + '-01', target_cents: Math.max(0, Math.round((targets[category] || 0) * 100)) }))
  const sb = await createClient()
  const { data, error } = await sb.from('expense_targets').upsert(rows, { onConflict: 'category,month' }).select('category')
  if (error) return { ok: false, error: error.code === '42501' ? refused : error.message }
  return data?.length ? { ok: true } : { ok: false, error: refused }
}
