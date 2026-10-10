'use server'

import { DEMO } from '@/lib/mode'
import { createClient } from '@/lib/supabase/server'

export type TaskUpdate = { ok: true } | { ok: false; error: string }

/** Change l'avancement d'une tâche. La base décide : un soignant ne peut changer que ses propres tâches. */
export async function setTaskStatus(id: string, status: 'todo' | 'wip' | 'done'): Promise<TaskUpdate> {
  if (DEMO) return { ok: true }
  const sb = await createClient()
  const { data, error } = await sb.from('tasks').update({ status }).eq('id', id).select('id')
  if (error) return { ok: false, error: error.message }
  if (!data?.length) return { ok: false, error: 'Cette tâche ne vous est pas attribuée.' }
  return { ok: true }
}
