'use server'

import { DEMO } from '@/lib/mode'
import { createClient } from '@/lib/supabase/server'

export type TaskUpdate = { ok: true } | { ok: false; error: string }
const refused = 'Seuls les responsables peuvent faire cette modification.'

/** Change l'avancement d'une tâche. La base décide : un soignant ne peut changer que ses propres tâches. */
export async function setTaskStatus(id: string, status: 'todo' | 'wip' | 'done'): Promise<TaskUpdate> {
  if (DEMO) return { ok: true }
  const sb = await createClient()
  const { data, error } = await sb.from('tasks').update({ status }).eq('id', id).select('id')
  if (error) return { ok: false, error: error.message }
  if (!data?.length) return { ok: false, error: 'Cette tâche ne vous est pas attribuée.' }
  return { ok: true }
}

export type NewTask = { roomId: string; typeCode: string | null; label: string; start: number; end: number; assignedTo: string | null }

export async function createTask(t: NewTask): Promise<TaskUpdate & { id?: string }> {
  if (DEMO) return { ok: true, id: 'demo' }
  const label = t.label.trim()
  if (!label || t.end <= t.start || t.start < 0 || t.end > 1440) return { ok: false, error: 'Vérifiez le libellé et les horaires.' }
  const sb = await createClient()
  const { data, error } = await sb.from('tasks').insert({
    room_id: t.roomId, type_code: t.typeCode, label, start_min: t.start, end_min: t.end, assigned_to: t.assignedTo,
  }).select('id').single()
  if (error) return { ok: false, error: error.code === '42501' ? refused : error.message }
  return { ok: true, id: data.id }
}

export async function assignTask(id: string, staffId: string | null): Promise<TaskUpdate> {
  if (DEMO) return { ok: true }
  const sb = await createClient()
  const { data, error } = await sb.from('tasks').update({ assigned_to: staffId }).eq('id', id).select('id')
  if (error) return { ok: false, error: error.message }
  return data?.length ? { ok: true } : { ok: false, error: refused }
}

export async function rescheduleTask(id: string, start: number, end: number): Promise<TaskUpdate> {
  if (DEMO) return { ok: true }
  if (end <= start || start < 0 || end > 1440) return { ok: false, error: 'Horaires invalides.' }
  const sb = await createClient()
  const { data, error } = await sb.from('tasks').update({ start_min: start, end_min: end }).eq('id', id).select('id')
  if (error) return { ok: false, error: error.message }
  return data?.length ? { ok: true } : { ok: false, error: refused }
}

export async function deleteTask(id: string): Promise<TaskUpdate> {
  if (DEMO) return { ok: true }
  const sb = await createClient()
  const { data, error } = await sb.from('tasks').delete().eq('id', id).select('id')
  if (error) return { ok: false, error: error.message }
  return data?.length ? { ok: true } : { ok: false, error: refused }
}

/** Génère les tâches automatiques du jour (repas, ménage, linge) pour les résidents présents. */
export async function generateTodayTasks(): Promise<TaskUpdate & { created?: number }> {
  if (DEMO) return { ok: true, created: 0 }
  const sb = await createClient()
  const { data, error } = await sb.rpc('generate_daily_tasks')
  if (error) return { ok: false, error: error.message.includes('Réservé') ? refused : error.message }
  return { ok: true, created: data ?? 0 }
}
