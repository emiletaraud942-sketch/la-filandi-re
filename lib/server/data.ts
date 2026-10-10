import 'server-only'
import { DEMO } from '@/lib/mode'
import { createClient } from '@/lib/supabase/server'
import { LOCATIONS, STOCK, type Art } from '@/lib/demo/stock'
import { RATE, SUBS, demoEntries, type Cat, type Entry } from '@/lib/demo/expenses'
import { DEMO_REQS, demoSlots, type Slot, type VReq } from '@/lib/demo/visits'
import { BOOKINGS, LOGS, TODAY_IDX, VEHICLES, WEEK, type Booking, type Log, type Vehicle, type WeekDay } from '@/lib/demo/vehicles'
import {
  CAT, FLOORS, NOW, ROLES, ROLE_LBL, dotOf, floorData, residentDay, staffAll,
  type DayEvent, type Floor, type Room, type Staff, type Task, type TaskStatus,
} from '@/lib/data'

export type FloorRooms = { floor: Floor; rooms: Room[] }
export type MyTask = Task & { id: string; who: string | null }
export type MyDay = { name: string; first: string; floor: number; tasks: MyTask[] } | null

export const parisToday = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' })
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
      st: (t.effective_status ?? 'todo') as TaskStatus, by: who?.display_name ?? 'Non attribuée', room: '', byId: t.assigned_to ?? undefined,
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

/** Rôle de la personne connectée (admin en démo). */
export async function loadMyRole(): Promise<string | null> {
  if (DEMO) return 'admin'
  const sb = await createClient()
  const { data: auth } = await sb.auth.getUser()
  if (!auth.user) return null
  const { data } = await sb.from('profiles').select('role').eq('id', auth.user.id).maybeSingle()
  return data?.role ?? null
}

/** Personnel d'un jour : poste (code), équipe (matin, soir, nuit, repos…), étage et heure de pointage. */
export async function loadStaff(day?: string): Promise<Staff[]> {
  if (DEMO) return staffAll().map((p) => ({ ...p, id: p.name, clock: p.shift === 'm' ? '06:' + String(40 + (p.name.length % 8)).padStart(2, '0') : null }))
  const sb = await createClient()
  const d = day ?? parisToday()
  const [staff, shifts, clock] = await Promise.all([
    sb.from('staff').select('id, display_name, job_code, floor_id').eq('active', true).order('display_name'),
    sb.from('shifts').select('staff_id, kind, pause_start_min').eq('day', d),
    sb.from('time_clock').select('staff_id, in_at').eq('day', d).order('in_at'),
  ])
  fail('personnel', staff.error); fail('plannings', shifts.error); fail('pointages', clock.error)
  const today = new Map((shifts.data ?? []).map((s) => [s.staff_id, s]))
  const first = new Map<string, string>()
  for (const c of clock.data ?? []) if (!first.has(c.staff_id)) first.set(c.staff_id, c.in_at)
  const time = (iso: string) => new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' })
  return (staff.data ?? []).map((s): Staff => ({
    id: s.id, name: s.display_name, role: s.job_code, shift: today.get(s.id)?.kind ?? 'off',
    floor: s.floor_id ?? 0, pause: today.get(s.id)?.pause_start_min ?? 10 * 60 + 30,
    clock: first.has(s.id) ? time(first.get(s.id) as string) : null,
  }))
}

export type MyClock = { open: boolean; since: string | null; known: boolean }

/** État du pointage de la personne connectée aujourd'hui. */
export async function loadMyClock(): Promise<MyClock> {
  if (DEMO) return { open: true, since: '06:42', known: true }
  const sb = await createClient()
  const { data: auth } = await sb.auth.getUser()
  if (!auth.user) return { open: false, since: null, known: false }
  const { data: me } = await sb.from('staff').select('id').eq('profile_id', auth.user.id).maybeSingle()
  if (!me) return { open: false, since: null, known: false }
  const { data } = await sb.from('time_clock').select('in_at, out_at').eq('staff_id', me.id).eq('day', parisToday()).order('in_at', { ascending: false }).limit(1)
  const last = data?.[0]
  const time = (iso: string) => new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' })
  return { open: !!last && !last.out_at, since: last ? time(last.in_at) : null, known: true }
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

export type VehiclesData = { vehicles: Vehicle[]; bookings: Booking[]; logs: Log[]; week: WeekDay[]; today: number; me: string; canManage: boolean }

/** Véhicules, réservations de la semaine en cours, carnet de bord et nom de la personne connectée. */
export async function loadVehicles(): Promise<VehiclesData> {
  if (DEMO) return { vehicles: VEHICLES, bookings: BOOKINGS, logs: LOGS, week: WEEK, today: TODAY_IDX, me: 'Camille R.', canManage: true }
  const sb = await createClient()
  const now = new Date(parisToday() + 'T12:00:00Z')
  const dow = (now.getUTCDay() + 6) % 7
  const week: WeekDay[] = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now.getTime() + (i - dow) * 86400000)
    return { n: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'][i], d: d.getUTCDate(), iso: d.toISOString().slice(0, 10) }
  })
  const [veh, bk, logs, staff, auth, role] = await Promise.all([
    sb.from('vehicles').select('id, name, model, plate, odometer, next_service_km, ct_due, insurance_due, in_garage').order('name'),
    sb.from('vehicle_bookings').select('id, vehicle_id, day, period, motif, driver_id, created_by').gte('day', week[0].iso).lte('day', week[6].iso),
    sb.from('vehicle_logs').select('id, vehicle_id, day, kind, label, km, amount_cents, driver_id').order('day', { ascending: false }).order('id').limit(60),
    sb.from('staff').select('id, display_name'),
    sb.auth.getUser(),
    loadMyRole(),
  ])
  fail('véhicules', veh.error); fail('réservations', bk.error); fail('carnet', logs.error); fail('personnel', staff.error)
  const names = new Map((staff.data ?? []).map((s) => [s.id, s.display_name]))
  const uid = auth.data.user?.id
  const me = uid ? (await sb.from('staff').select('display_name').eq('profile_id', uid).maybeSingle()).data?.display_name : null
  return {
    vehicles: (veh.data ?? []).map((v) => ({ id: v.id, n: v.name, model: v.model, plate: v.plate, km: v.odometer, svc: v.next_service_km, ct: MONTH(v.ct_due), ass: MONTH(v.insurance_due), garage: v.in_garage, ctIso: v.ct_due ?? '', assIso: v.insurance_due ?? '' })),
    bookings: (bk.data ?? []).map((b) => ({ id: b.id, v: b.vehicle_id, d: week.findIndex((w) => w.iso === b.day), p: b.period, motif: b.motif, who: (b.driver_id && names.get(b.driver_id)) || '—', mine: b.created_by === uid })),
    logs: (logs.data ?? []).map((l) => ({ id: l.id, v: l.vehicle_id, day: l.day, kind: l.kind as 'trip' | 'fuel' | 'maint', label: l.label, km: l.km, eur: l.amount_cents / 100, who: (l.driver_id && names.get(l.driver_id)) || '—' })),
    week, today: dow, me: me ?? 'Moi', canManage: !!role && ['admin', 'direction', 'cadre', 'technique'].includes(role),
  }
}

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

export type ResidentRoom = { no: string; floor: number; who: string | null; state: 'free' | 'out' | 'occ'; days: DayEvent[][]; roomId?: string; residentId?: string | null }

/** Emploi du temps des résidents sur la semaine en cours, par étage et par chambre. */
export type ResidentsData = { floors: { floor: Floor; rooms: ResidentRoom[] }[]; today: number; week: string[]; canEvents: boolean; canResidents: boolean }

export async function loadResidents(): Promise<ResidentsData> {
  if (DEMO) {
    return {
      today: 2, week: Array.from({ length: 7 }, (_, i) => `2026-10-${12 + i}`), canEvents: true, canResidents: true,
      floors: FLOORS.map((f) => ({
        floor: f,
        rooms: floorData(f.id).rooms.map((r) => ({
          no: r.no, floor: r.floor, who: r.who, state: r.state, roomId: r.no, residentId: r.state === 'free' ? null : 'res' + r.no,
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
    sb.from('rooms_overview').select('id, number, floor_id, resident_id, resident_name, state').order('number'),
    sb.from('resident_events').select('id, resident_id, day, start_min, label, place, kind').gte('day', iso(0)).lte('day', iso(6)).order('start_min'),
  ])
  fail('étages', floors.error); fail('chambres', rooms.error); fail('événements', events.error)
  const days = Array.from({ length: 7 }, (_, i) => iso(i))
  const byRes = new Map<string, DayEvent[][]>()
  for (const e of events.data ?? []) {
    const di = days.indexOf(e.day)
    if (di < 0) continue
    const grid = byRes.get(e.resident_id) ?? Array.from({ length: 7 }, () => [] as DayEvent[])
    grid[di].push({ t: e.start_min, label: e.label, place: e.place ?? '', k: e.kind, id: e.id })
    byRes.set(e.resident_id, grid)
  }
  const role = await loadMyRole()
  return {
    today: dow, week: days,
    canEvents: !!role && ['admin', 'direction', 'cadre', 'animation'].includes(role),
    canResidents: !!role && ['admin', 'direction', 'cadre'].includes(role),
    floors: (floors.data ?? []).map((f) => ({
      floor: { id: f.id, name: f.name, short: f.short, note: f.note ?? undefined },
      rooms: (rooms.data ?? []).filter((r) => r.floor_id === f.id).map((r): ResidentRoom => ({
        no: r.number ?? '', floor: f.id, who: r.resident_name, roomId: r.id ?? undefined, residentId: r.resident_id,
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

export type TaskAdmin = {
  staff: { id: string; name: string; job: string }[]
  types: { code: string; label: string; start: number; duration: number }[]
  rooms: { id: string; no: string; floor: number }[]
}

/** Listes nécessaires pour créer et réattribuer des tâches. Renvoie null si la personne n'est pas responsable. */
export async function loadTaskAdmin(): Promise<TaskAdmin | null> {
  if (DEMO) {
    const staff = staffAll()
    return {
      staff: staff.map((p) => ({ id: p.name, name: p.name, job: p.role })),
      types: CAT.map((c) => ({ code: c.k, label: c.label, start: c.start, duration: c.dur })),
      rooms: FLOORS.flatMap((f) => floorData(f.id).rooms.map((r) => ({ id: r.no, no: r.no, floor: f.id }))),
    }
  }
  const sb = await createClient()
  const { data: auth } = await sb.auth.getUser()
  if (!auth.user) return null
  const { data: me } = await sb.from('profiles').select('role').eq('id', auth.user.id).maybeSingle()
  if (!me || !['admin', 'direction', 'cadre'].includes(me.role)) return null
  const [staff, types, rooms] = await Promise.all([
    sb.from('staff').select('id, display_name, job_code').eq('active', true).order('display_name'),
    sb.from('task_types').select('code, label, default_start_min, duration_min').order('label'),
    sb.from('rooms').select('id, number, floor_id').order('number'),
  ])
  fail('personnel', staff.error); fail('types de tâches', types.error); fail('chambres', rooms.error)
  return {
    staff: (staff.data ?? []).map((s) => ({ id: s.id, name: s.display_name, job: s.job_code })),
    types: (types.data ?? []).map((t) => ({ code: t.code, label: t.label, start: t.default_start_min, duration: t.duration_min })),
    rooms: (rooms.data ?? []).map((r) => ({ id: r.id, no: r.number, floor: r.floor_id })),
  }
}
export { SUBS }

export type VisitsData = { slots: Slot[]; requests: VReq[] | null; canManage: boolean; unsent: number; mailConfigured: boolean }

const mailConfigured = () => !!process.env.RESEND_API_KEY && !!process.env.MAIL_FROM

/** Créneaux de visite des deux prochaines semaines, avec places restantes, et file de demandes (accueil et responsables). */
export async function loadVisits(): Promise<VisitsData> {
  if (DEMO) return { slots: demoSlots(), requests: DEMO_REQS, canManage: true, unsent: 2, mailConfigured: false }
  const sb = await createClient()
  const today = parisToday()
  const end = new Date(new Date(today + 'T12:00:00Z').getTime() + 13 * 86400000).toISOString().slice(0, 10)
  const role = await loadMyRole()
  const canManage = !!role && ['admin', 'direction', 'cadre', 'accueil'].includes(role)
  const [slots, avail] = await Promise.all([
    sb.from('visit_slots').select('id, day, start_min, capacity').gte('day', today).lte('day', end).order('day').order('start_min'),
    sb.rpc('public_visit_slots'),
  ])
  fail('créneaux', slots.error); fail('disponibilités', avail.error)
  const rem = new Map((avail.data ?? []).map((a) => [a.slot_id, a.remaining]))
  const list: Slot[] = (slots.data ?? []).filter((s) => rem.has(s.id)).map((s) => ({ id: s.id, iso: s.day, start: s.start_min, capacity: s.capacity, remaining: rem.get(s.id) ?? 0 }))
  if (!canManage) return { slots: list, requests: null, canManage, unsent: 0, mailConfigured: mailConfigured() }
  const [reqs, outbox] = await Promise.all([
    sb.from('visit_requests').select('id, visitor_name, visitor_email, resident_label, persons, status, created_at, slot_id, visit_slots(day, start_min)').order('created_at', { ascending: false }).limit(100),
    sb.from('outbox').select('id', { count: 'exact', head: true }).is('sent_at', null),
  ])
  fail('demandes', reqs.error)
  const ago = (iso: string) => {
    const h = Math.round((Date.now() - new Date(iso).getTime()) / 3600000)
    return h < 1 ? 'reçue à l’instant' : h < 24 ? `reçue il y a ${h} h` : `reçue il y a ${Math.round(h / 24)} j`
  }
  return {
    slots: list, canManage, unsent: outbox.count ?? 0, mailConfigured: mailConfigured(),
    requests: (reqs.data ?? []).map((r): VReq => ({ id: r.id, visitor: r.visitor_name, email: r.visitor_email, who: r.resident_label, slotId: r.slot_id, iso: r.visit_slots?.day ?? '', start: r.visit_slots?.start_min ?? 0, n: r.persons, st: r.status === 'confirmed' ? 'ok' : r.status === 'refused' ? 'no' : 'pending', at: ago(r.created_at) })),
  }
}

/** Créneaux ouverts au public (sans compte). */
export async function loadPublicSlots(): Promise<Slot[]> {
  if (DEMO) return demoSlots()
  const sb = await createClient()
  const { data, error } = await sb.rpc('public_visit_slots')
  fail('créneaux', error)
  return (data ?? []).map((a) => ({ id: a.slot_id, iso: a.day, start: a.start_min, capacity: 12, remaining: a.remaining }))
}
