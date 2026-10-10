import 'server-only'
import { DEMO } from '@/lib/mode'
import { createClient } from '@/lib/supabase/server'
import { LOCATIONS, STOCK, type Art } from '@/lib/demo/stock'
import { RATE, SUBS, demoEntries, type Cat, type Entry } from '@/lib/demo/expenses'
import { BOOKINGS, TODAY_IDX, VEHICLES, WEEK, type Booking, type Vehicle, type WeekDay } from '@/lib/demo/vehicles'
import {
  FLOORS, NOW, ROLES, ROLE_LBL, dotOf, floorData, residentDay, staffAll,
  type DayEvent, type Floor, type Room, type Staff, type Task, type TaskStatus,
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

/** Articles de stock et leurs locaux. */
export async function loadStock(): Promise<{ items: Art[]; locations: Record<string, string> }> {
  if (DEMO) return { items: STOCK, locations: LOCATIONS }
  const sb = await createClient()
  const [items, locs] = await Promise.all([
    sb.from('stock_items').select('id, name, category, location_code, qty, min_qty, max_qty, weekly_use, unit, ordered_at').order('name'),
    sb.from('stock_locations').select('code, label'),
  ])
  fail('stock', items.error); fail('locaux', locs.error)
  return {
    items: (items.data ?? []).map((i) => ({
      id: i.id, n: i.name, c: i.category, l: i.location_code, q: i.qty, min: i.min_qty, max: i.max_qty,
      w: i.weekly_use, u: i.unit, ord: !!i.ordered_at,
    })),
    locations: Object.fromEntries((locs.data ?? []).map((l) => [l.code, l.label])),
  }
}

const MONTH = (d: string | null) => (d ? new Date(d + 'T12:00:00Z').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric', timeZone: 'UTC' }) : 'à renseigner')

/** Véhicules, réservations de la semaine en cours et nom de la personne connectée. */
export async function loadVehicles(): Promise<{ vehicles: Vehicle[]; bookings: Booking[]; week: WeekDay[]; today: number; me: string }> {
  if (DEMO) return { vehicles: VEHICLES, bookings: BOOKINGS, week: WEEK, today: TODAY_IDX, me: 'Camille R.' }
  const sb = await createClient()
  const now = new Date(parisToday() + 'T12:00:00Z')
  const dow = (now.getUTCDay() + 6) % 7
  const week: WeekDay[] = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now.getTime() + (i - dow) * 86400000)
    return { n: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'][i], d: d.getUTCDate(), iso: d.toISOString().slice(0, 10) }
  })
  const [veh, bk, staff, auth] = await Promise.all([
    sb.from('vehicles').select('id, name, model, plate, odometer, next_service_km, ct_due, insurance_due, in_garage').order('name'),
    sb.from('vehicle_bookings').select('id, vehicle_id, day, period, motif, driver_id').gte('day', week[0].iso).lte('day', week[6].iso),
    sb.from('staff').select('id, display_name'),
    sb.auth.getUser(),
  ])
  fail('véhicules', veh.error); fail('réservations', bk.error); fail('personnel', staff.error)
  const names = new Map((staff.data ?? []).map((s) => [s.id, s.display_name]))
  const me = auth.data.user ? (await sb.from('staff').select('display_name').eq('profile_id', auth.data.user.id).maybeSingle()).data?.display_name : null
  return {
    vehicles: (veh.data ?? []).map((v) => ({ id: v.id, n: v.name, model: v.model, plate: v.plate, km: v.odometer, svc: v.next_service_km, ct: MONTH(v.ct_due), ass: MONTH(v.insurance_due), garage: v.in_garage })),
    bookings: (bk.data ?? []).map((b) => ({ id: b.id, v: b.vehicle_id, d: week.findIndex((w) => w.iso === b.day), p: b.period, motif: b.motif, who: (b.driver_id && names.get(b.driver_id)) || '—' })),
    week, today: dow, me: me ?? 'Moi',
  }
}

export { SUBS }

/** Dépenses du mois en cours et repères mensuels. Réservé aux responsables : renvoie null pour les autres. */
export async function loadExpenses() {
  if (DEMO) {
    const period = { label: 'octobre', day: 14, days: 31 }
    const entries = demoEntries()
    const tot = (c: Cat) => entries.filter((e) => e.cat === c).reduce((a, e) => a + e.eur, 0)
    const k = { pet: 1.05, tps: 0.78, cout: 0.88 }
    const targets = Object.fromEntries((['pet', 'tps', 'cout'] as Cat[]).map((c) => [c, Math.round(((tot(c) / period.day) * period.days * k[c]) / 10) * 10])) as Record<Cat, number>
    return { entries, rate: RATE, targets, period }
  }
  const sb = await createClient()
  const { data: auth } = await sb.auth.getUser()
  if (!auth.user) return null
  const { data: me } = await sb.from('profiles').select('role').eq('id', auth.user.id).maybeSingle()
  if (!me || !['admin', 'direction', 'cadre'].includes(me.role)) return null
  const today = parisToday()
  const monthStart = today.slice(0, 8) + '01'
  const [rows, targets] = await Promise.all([
    sb.from('expenses').select('id, day, category, subcategory, floor_id, amount_cents, hours').gte('day', monthStart).lte('day', today),
    sb.from('expense_targets').select('category, target_cents').eq('month', monthStart),
  ])
  fail('frais', rows.error); fail('repères', targets.error)
  const date = new Date(today + 'T12:00:00Z')
  const days = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate()
  const t = Object.fromEntries((targets.data ?? []).map((x) => [x.category, x.target_cents / 100]))
  return {
    entries: (rows.data ?? []).map((e): Entry => ({ id: e.id, d: Number(e.day.slice(8)), cat: e.category, sub: e.subcategory, f: e.floor_id ?? 4, eur: e.amount_cents / 100, hrs: Number(e.hours) })),
    rate: RATE,
    targets: targets.data?.length ? ({ pet: 0, tps: 0, cout: 0, ...t } as Record<Cat, number>) : null,
    period: { label: date.toLocaleDateString('fr-FR', { month: 'long', timeZone: 'UTC' }), day: date.getUTCDate(), days },
  }
}

export type ResidentRoom = { no: string; floor: number; who: string | null; state: 'free' | 'out' | 'occ'; days: DayEvent[][] }

/** Emploi du temps des résidents sur la semaine en cours, par étage et par chambre. */
export async function loadResidents(): Promise<{ floors: { floor: Floor; rooms: ResidentRoom[] }[]; today: number }> {
  if (DEMO) {
    return {
      today: 2,
      floors: FLOORS.map((f) => ({
        floor: f,
        rooms: floorData(f.id).rooms.map((r) => ({
          no: r.no, floor: r.floor, who: r.who, state: r.state,
          days: Array.from({ length: 7 }, (_, d) => (r.state === 'free' ? [] : residentDay(r, d))),
        })),
      })),
    }
  }
  const sb = await createClient()
  const now = new Date(parisToday() + 'T12:00:00Z')
  const dow = (now.getUTCDay() + 6) % 7
  const iso = (i: number) => new Date(now.getTime() + (i - dow) * 86400000).toISOString().slice(0, 10)
  const [floors, rooms, events] = await Promise.all([
    sb.from('floors').select('id, name, short, note').order('id'),
    sb.from('rooms_overview').select('number, floor_id, resident_id, resident_name, state').order('number'),
    sb.from('resident_events').select('resident_id, day, start_min, label, place, kind').gte('day', iso(0)).lte('day', iso(6)).order('start_min'),
  ])
  fail('étages', floors.error); fail('chambres', rooms.error); fail('événements', events.error)
  const days = Array.from({ length: 7 }, (_, i) => iso(i))
  const byRes = new Map<string, DayEvent[][]>()
  for (const e of events.data ?? []) {
    const di = days.indexOf(e.day)
    if (di < 0) continue
    const grid = byRes.get(e.resident_id) ?? Array.from({ length: 7 }, () => [] as DayEvent[])
    grid[di].push({ t: e.start_min, label: e.label, place: e.place ?? '', k: e.kind })
    byRes.set(e.resident_id, grid)
  }
  return {
    today: dow,
    floors: (floors.data ?? []).map((f) => ({
      floor: { id: f.id, name: f.name, short: f.short, note: f.note ?? undefined },
      rooms: (rooms.data ?? []).filter((r) => r.floor_id === f.id).map((r): ResidentRoom => ({
        no: r.number ?? '', floor: f.id, who: r.resident_name,
        state: r.state === 'free' ? 'free' : r.state === 'away' ? 'out' : 'occ',
        days: (r.resident_id && byRes.get(r.resident_id)) || Array.from({ length: 7 }, () => []),
      })),
    })),
  }
}

export type Attendee = { id: string; n: string; sub: string; at: string | null }
export type SessionSheet = { id: string; type: 'form' | 'reun' | 'act'; n: string; when: string; place: string; lead: string; closed: boolean; who: Attendee[] }

const KIND: Record<string, SessionSheet['type']> = { formation: 'form', reunion: 'reun', activite: 'act' }
const clock = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`

/** Feuilles d'émargement du jour : formations, réunions et activités des résidents. */
export async function loadSessions(): Promise<{ sessions: SessionSheet[]; now: string }> {
  if (DEMO) {
    const staff = staffAll()
    const pick = (roles: string[], n: number, skip = 0) =>
      staff.filter((p) => roles.includes(p.role)).slice(skip, skip + n).map((p, i) => ({ id: `${p.name}-${i}`, n: p.name, sub: ROLE_LBL[p.role] ?? p.role }))
    const withSigned = (l: { id: string; n: string; sub: string }[], k: number): Attendee[] =>
      l.map((p, i) => ({ ...p, at: i < k ? clock(9 * 60 + 52 + i * 2) : null }))
    const residents = floorData(2).rooms.filter((r) => r.state === 'occ').slice(0, 12).map((r) => ({ id: 'r' + r.no, n: r.who as string, sub: `Chambre ${r.no}` }))
    return {
      now: clock(NOW),
      sessions: [
        { id: 'f1', type: 'form', n: 'Gestes et postures', when: 'mer. 14 octobre · 10:00–12:00', place: 'Salle de formation', lead: 'Intervenant extérieur', closed: false, who: withSigned(pick(['AS', 'AES', 'ASHQ'], 8, 2), 5) },
        { id: 'r1', type: 'reun', n: 'Réunion d’équipe', when: 'mer. 14 octobre · 14:00–14:45', place: 'Salle de réunion', lead: 'Cadre de santé', closed: false, who: withSigned(pick(['IDE', 'AS', 'AES'], 9, 0), 0) },
        { id: 'a1', type: 'act', n: 'Loto', when: 'mer. 14 octobre · 10:30–11:30', place: 'Salon d’animation', lead: 'Animation', closed: false, who: withSigned(residents, 0) },
      ],
    }
  }
  const sb = await createClient()
  const today = parisToday()
  const { data: sess, error } = await sb.from('sessions').select('id, kind, title, day, start_min, end_min, place, lead, closed_at').eq('day', today).order('start_min')
  fail('séances', error)
  const ids = (sess ?? []).map((s) => s.id)
  const { data: att, error: e2 } = ids.length
    ? await sb.from('session_attendees').select('id, session_id, status, signed_at, staff:staff_id(display_name, job_code), resident:resident_id(display_name, room:room_id(number))').in('session_id', ids)
    : { data: [], error: null }
  fail('présences', e2)
  const date = new Date(today + 'T12:00:00Z').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'long', timeZone: 'UTC' })
  const time = (iso: string) => new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' })
  return {
    now: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' }),
    sessions: (sess ?? []).map((s) => ({
      id: s.id, type: KIND[s.kind] ?? 'reun', n: s.title, when: `${date} · ${clock(s.start_min)}–${clock(s.end_min)}`,
      place: s.place ?? '', lead: s.lead ?? '', closed: !!s.closed_at,
      who: (att ?? []).filter((a) => a.session_id === s.id).map((a): Attendee => {
        const st = a.staff as { display_name: string; job_code: string } | null
        const re = a.resident as { display_name: string; room: { number: string } | null } | null
        return {
          id: a.id, n: st?.display_name ?? re?.display_name ?? '—',
          sub: st ? (ROLE_LBL[st.job_code] ?? st.job_code) : `Chambre ${re?.room?.number ?? '?'}`,
          at: a.status === 'present' && a.signed_at ? time(a.signed_at) : null,
        }
      }),
    })),
  }
}
