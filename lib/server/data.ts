import 'server-only'
import { DEMO } from '@/lib/mode'
import { createClient } from '@/lib/supabase/server'
import {
  FLOORS, ROLES, dotOf, floorData, staffAll,
  type Floor, type Room, type Staff, type Task, type TaskStatus,
} from '@/lib/data'

export type FloorRooms = { floor: Floor; rooms: Room[] }
export type MyTask = Task & { id: string; who: string | null }
export type MyDay = { name: string; first: string; floor: number; tasks: MyTask[] } | null

const parisToday = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' })
const fail = (what: string, error: { message: string } | null) => {
  if (error) throw new Error(`${what} : ${error.message}`)
}

/** Étages, chambres, occupants et tâches du jour, avec le statut calculé (retard, en cours…). */
export async function loadFloors(): Promise<FloorRooms[]> {
  if (DEMO) return FLOORS.map((f) => floorData(f.id))
  const sb = await createClient()
  const day = parisToday()
  const [floors, rooms, tasks, staff] = await Promise.all([
    sb.from('floors').select('id, name, short, note').order('id'),
    sb.from('rooms_overview').select('id, number, wing, floor_id, resident_name, state').order('number'),
    sb.from('task_progress').select('id, room_id, label, type_code, start_min, end_min, effective_status, assigned_to').eq('day', day),
    sb.from('staff').select('id, display_name, job_code'),
  ])
  fail('étages', floors.error); fail('chambres', rooms.error); fail('tâches', tasks.error); fail('personnel', staff.error)

  const people = new Map((staff.data ?? []).map((s) => [s.id, s]))
  const byRoom = new Map<string, Task[]>()
  for (const t of tasks.data ?? []) {
    if (!t.id || !t.room_id) continue
    const who = t.assigned_to ? people.get(t.assigned_to) : undefined
    const list = byRoom.get(t.room_id) ?? []
    list.push({
      k: t.id, label: t.label ?? '', role: who?.job_code ?? '', start: t.start_min ?? 0, end: t.end_min ?? 0,
      st: (t.effective_status ?? 'todo') as TaskStatus, by: who?.display_name ?? 'Non attribuée', room: '',
    })
    byRoom.set(t.room_id, list)
  }

  return (floors.data ?? []).map((f) => ({
    floor: { id: f.id, name: f.name, short: f.short, note: f.note ?? undefined },
    rooms: (rooms.data ?? []).filter((r) => r.floor_id === f.id).map((r, i): Room => {
      const list = (byRoom.get(r.id ?? '') ?? []).map((t) => ({ ...t, room: r.number ?? '' })).sort((a, b) => a.start - b.start)
      return {
        no: r.number ?? '', n: i + 1, floor: f.id, side: r.wing === 'S' ? 'S' : 'N',
        state: r.state === 'free' ? 'free' : r.state === 'away' ? 'out' : 'occ',
        who: r.resident_name, tasks: list, dot: dotOf(list),
      }
    }),
  }))
}

/** La journée de la personne connectée : son étage et ses tâches. */
export async function loadMyDay(): Promise<MyDay> {
  if (DEMO) {
    const rooms = floorData(2).rooms
    const tasks = rooms.flatMap((r) => r.tasks.map((t) => ({ ...t, id: r.no + t.k, who: r.who }))).filter((t) => t.by === 'Camille R.')
    return { name: 'Camille R.', first: 'Camille', floor: 2, tasks }
  }
  const sb = await createClient()
  const { data: auth } = await sb.auth.getUser()
  if (!auth.user) return null
  const { data: me, error } = await sb.from('staff').select('id, display_name, floor_id').eq('profile_id', auth.user.id).maybeSingle()
  fail('personnel', error)
  if (!me) return null
  const { data: tasks, error: e2 } = await sb
    .from('task_progress')
    .select('id, room_id, label, start_min, end_min, effective_status')
    .eq('assigned_to', me.id).eq('day', parisToday()).order('start_min')
  fail('tâches', e2)
  const ids = [...new Set((tasks ?? []).map((t) => t.room_id).filter((x): x is string => !!x))]
  const { data: rooms, error: e3 } = ids.length
    ? await sb.from('rooms_overview').select('id, number, resident_name').in('id', ids)
    : { data: [], error: null }
  fail('chambres', e3)
  const room = new Map((rooms ?? []).map((r) => [r.id, r]))
  return {
    name: me.display_name, first: me.display_name.split(' ')[0], floor: me.floor_id ?? 0,
    tasks: (tasks ?? []).map((t) => ({
      id: t.id ?? '', k: t.id ?? '', label: t.label ?? '', role: '', start: t.start_min ?? 0, end: t.end_min ?? 0,
      st: (t.effective_status ?? 'todo') as TaskStatus, by: me.display_name,
      room: room.get(t.room_id ?? '')?.number ?? '', who: room.get(t.room_id ?? '')?.resident_name ?? null,
    })),
  }
}

/** Personnel du jour : poste (code), équipe (matin, soir, nuit, repos…) et étage. */
export async function loadStaff(): Promise<Staff[]> {
  if (DEMO) return staffAll()
  const sb = await createClient()
  const [staff, shifts] = await Promise.all([
    sb.from('staff').select('id, display_name, job_code, floor_id').eq('active', true).order('display_name'),
    sb.from('shifts').select('staff_id, kind, pause_start_min').eq('day', parisToday()),
  ])
  fail('personnel', staff.error); fail('plannings', shifts.error)
  const today = new Map((shifts.data ?? []).map((s) => [s.staff_id, s]))
  return (staff.data ?? []).map((s): Staff => ({
    name: s.display_name, role: s.job_code, shift: today.get(s.id)?.kind ?? 'off',
    floor: s.floor_id ?? 0, pause: today.get(s.id)?.pause_start_min ?? 10 * 60 + 30,
  }))
}

/** Postes et effectifs minimum souhaités. */
export async function loadRoles() {
  if (DEMO) return ROLES
  const sb = await createClient()
  const { data, error } = await sb.from('job_roles').select('code, label, min_morning, min_evening, min_night').order('sort')
  fail('postes', error)
  return (data ?? []).map((r) => ({ k: r.code, label: r.label, n: 0, min: { m: r.min_morning, s: r.min_evening, n: r.min_night } }))
}
