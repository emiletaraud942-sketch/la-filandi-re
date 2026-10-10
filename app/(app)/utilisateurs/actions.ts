'use server'

import { DEMO } from '@/lib/mode'
import { createClient } from '@/lib/supabase/server'

export type Result = { ok: true } | { ok: false; error: string }
const ROLES = ['admin', 'direction', 'cadre', 'soignant', 'animation', 'accueil', 'technique'] as const
export type Role = (typeof ROLES)[number]
const refused = 'Réservé à l’administrateur.'

async function guard(id: string): Promise<{ sb: Awaited<ReturnType<typeof createClient>>; self: boolean } | { error: string }> {
  const sb = await createClient()
  const { data } = await sb.auth.getUser()
  if (!data.user) return { error: 'Session expirée.' }
  return { sb, self: data.user.id === id }
}

export async function setRole(id: string, role: Role): Promise<Result> {
  if (DEMO) return { ok: true }
  if (!ROLES.includes(role)) return { ok: false, error: 'Rôle inconnu.' }
  const g = await guard(id)
  if ('error' in g) return { ok: false, error: g.error }
  if (g.self) return { ok: false, error: 'Vous ne pouvez pas changer votre propre rôle (pour ne pas perdre l’accès administrateur).' }
  const { data, error } = await g.sb.from('profiles').update({ role }).eq('id', id).select('id')
  if (error) return { ok: false, error: error.message }
  return data?.length ? { ok: true } : { ok: false, error: refused }
}

export async function setActive(id: string, active: boolean): Promise<Result> {
  if (DEMO) return { ok: true }
  const g = await guard(id)
  if ('error' in g) return { ok: false, error: g.error }
  if (g.self) return { ok: false, error: 'Vous ne pouvez pas désactiver votre propre compte.' }
  const { data, error } = await g.sb.from('profiles').update({ active }).eq('id', id).select('id')
  if (error) return { ok: false, error: error.message }
  return data?.length ? { ok: true } : { ok: false, error: refused }
}

export async function setName(id: string, name: string): Promise<Result> {
  if (DEMO) return { ok: true }
  const n = name.trim()
  if (n.length < 2 || n.length > 80) return { ok: false, error: 'Nom invalide (2 à 80 caractères).' }
  const g = await guard(id)
  if ('error' in g) return { ok: false, error: g.error }
  const { data, error } = await g.sb.from('profiles').update({ full_name: n }).eq('id', id).select('id')
  if (error) return { ok: false, error: error.message }
  return data?.length ? { ok: true } : { ok: false, error: refused }
}

/** Relie un compte à une fiche du personnel (nécessaire pour pointer et signer). `staffId` null délie. */
export async function linkStaff(id: string, staffId: string | null): Promise<Result> {
  if (DEMO) return { ok: true }
  const g = await guard(id)
  if ('error' in g) return { ok: false, error: g.error }
  const { error: e1 } = await g.sb.from('staff').update({ profile_id: null }).eq('profile_id', id)
  if (e1) return { ok: false, error: e1.message }
  if (!staffId) return { ok: true }
  const { data, error } = await g.sb.from('staff').update({ profile_id: id }).eq('id', staffId).select('id')
  if (error) return { ok: false, error: error.code === '23505' ? 'Cette fiche est déjà reliée à un autre compte.' : error.message }
  return data?.length ? { ok: true } : { ok: false, error: refused }
}
