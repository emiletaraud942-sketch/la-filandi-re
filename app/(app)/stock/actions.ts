'use server'

import { DEMO } from '@/lib/mode'
import { createClient } from '@/lib/supabase/server'

export type Result = { ok: true } | { ok: false; error: string }
export type Movement = { id: string; at: string; delta: number; reason: string | null; who: string | null }
export type ItemInput = { id?: string; name: string; category: string; location: string; unit: string; qty: number; min: number; max: number; weekly: number }

const refused = 'Cette action est réservée aux responsables et à l’équipe technique.'
const msg = (e: { code?: string; message: string }) =>
  e.code === '23514' ? 'Quantité insuffisante : le stock ne peut pas descendre sous zéro.' : e.message

/** Enregistre une consommation (négatif) ou une livraison (positif). La quantité de l'article suit automatiquement. */
export async function moveStock(itemId: string, delta: number, reason: string): Promise<Result> {
  if (DEMO) return { ok: true }
  if (!Number.isInteger(delta) || delta === 0) return { ok: false, error: 'Quantité invalide.' }
  const sb = await createClient()
  const { error } = await sb.from('stock_movements').insert({ item_id: itemId, delta, reason: reason || null })
  return error ? { ok: false, error: msg(error) } : { ok: true }
}

/** Fixe la quantité exacte comptée (inventaire) : enregistre l'écart comme un mouvement. */
export async function setStockQty(itemId: string, target: number): Promise<Result> {
  if (DEMO) return { ok: true }
  if (!Number.isInteger(target) || target < 0) return { ok: false, error: 'Quantité invalide.' }
  const sb = await createClient()
  const { data, error } = await sb.from('stock_items').select('qty').eq('id', itemId).maybeSingle()
  if (error || !data) return { ok: false, error: error?.message ?? 'Article introuvable.' }
  if (data.qty === target) return { ok: true }
  return moveStock(itemId, target - data.qty, 'Inventaire')
}

/** Marque un article comme commandé. */
export async function orderItem(id: string): Promise<Result> {
  if (DEMO) return { ok: true }
  const sb = await createClient()
  const { data, error } = await sb.from('stock_items').update({ ordered_at: new Date().toISOString() }).eq('id', id).select('id')
  if (error) return { ok: false, error: error.message }
  return data?.length ? { ok: true } : { ok: false, error: refused }
}

/** Crée ou modifie un article (responsables et équipe technique). */
export async function saveItem(input: ItemInput): Promise<Result & { id?: string }> {
  if (DEMO) return { ok: true, id: input.id ?? 'demo' }
  const name = input.name.trim()
  if (!name || input.max <= 0 || input.min < 0 || input.qty < 0 || input.weekly < 0) return { ok: false, error: 'Vérifiez les champs : nom, quantités et maximum.' }
  const sb = await createClient()
  const row = { name, category: input.category, location_code: input.location, unit: input.unit.trim() || 'pièces', min_qty: input.min, max_qty: input.max, weekly_use: input.weekly }
  if (input.id) {
    const { data, error } = await sb.from('stock_items').update(row).eq('id', input.id).select('id')
    if (error) return { ok: false, error: error.message }
    return data?.length ? { ok: true, id: input.id } : { ok: false, error: refused }
  }
  const { data, error } = await sb.from('stock_items').insert({ ...row, qty: input.qty }).select('id').single()
  if (error) return { ok: false, error: error.code === '42501' ? refused : error.message }
  return { ok: true, id: data.id }
}

/** Derniers mouvements d'un article. */
export async function loadMovements(itemId: string): Promise<Movement[]> {
  if (DEMO) return [{ id: 'd1', at: new Date().toISOString(), delta: -5, reason: 'Consommation (démo)', who: null }]
  const sb = await createClient()
  const { data } = await sb.from('stock_movements').select('id, at, delta, reason, by:by_user(full_name)').eq('item_id', itemId).order('at', { ascending: false }).limit(8)
  return (data ?? []).map((m) => ({ id: m.id, at: m.at, delta: m.delta, reason: m.reason, who: (m.by as { full_name: string } | null)?.full_name ?? null }))
}
