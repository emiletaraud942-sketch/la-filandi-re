// Jeu de données fictif (résidents et soignants pseudonymisés). À remplacer par Supabase.
export type Dot = 'ok' | 'wip' | 'late' | 'none'
export type TaskStatus = 'done' | 'wip' | 'todo' | 'late'
export type Task = { k: string; label: string; role: string; start: number; end: number; st: TaskStatus; by: string; room: string }
export type Room = { no: string; n: number; floor: number; side: 'N' | 'S'; state: 'free' | 'out' | 'occ'; who: string | null; tasks: Task[]; dot: Dot }
export type Floor = { id: number; name: string; short: string; note?: string }
export type Staff = { name: string; role: string; shift: 'm' | 's' | 'n' | 'off' | 'leave' | 'abs'; floor: number; pause: number }
export type DayEvent = { t: number; label: string; place: string; k: 'meal' | 'ani' | 'vis' | 'coif' | 'out' }

export function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const NOW = 10 * 60 + 20
export const hm = (m: number) => String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0')

export const FLOORS: Floor[] = [
  { id: 0, name: 'Rez-de-chaussée', short: 'RDC', note: 'Unité protégée' },
  { id: 1, name: '1er étage', short: '1er' },
  { id: 2, name: '2e étage', short: '2e' },
  { id: 3, name: '3e étage', short: '3e' },
]
export const N_ROOMS = 31
export const LBL: Record<Dot, string> = { ok: 'À jour', wip: 'En cours', late: 'En retard', none: 'Rien en cours' }
export const ST_TASK: Record<TaskStatus, string> = { done: 'Fait', wip: 'En cours', todo: 'À venir', late: 'En retard' }
const CIV = ['Mme', 'Mme', 'M.', 'Mme', 'Mme', 'M.', 'Mme']
const LET = 'ABCDEFGHJLMNPRSTV'.split('')
export const POOL: Record<string, string[]> = {
  AS: ['Camille R.', 'Yanis B.', 'Inès M.', 'Lucas P.', 'Salomé T.', 'Théo G.'],
  ASHQ: ['Nadia K.', 'Pierre D.', 'Amélie F.'],
  AES: ['Léa V.', 'Hugo T.'],
  TECH: ['Marc L.'],
  ACC: ['Sophie G.'],
}
export const ROLE_LBL: Record<string, string> = { AS: 'Aide-soignant', ASHQ: 'Agent de service', AES: 'AES / AMP', TECH: 'Technique', ACC: 'Accueil', IDE: 'Infirmier', ANI: 'Animation' }
const CAT = [
  { k: 'pdj', label: 'Petit-déjeuner', role: 'AS', start: 7 * 60 + 30, dur: 40 },
  { k: 'lit', label: 'Réfection du lit', role: 'AS', start: 9 * 60, dur: 15 },
  { k: 'men', label: 'Ménage de la chambre', role: 'ASHQ', start: 9 * 60 + 30, dur: 30 },
  { k: 'lin', label: 'Linge de toilette', role: 'ASHQ', start: 10 * 60, dur: 15 },
  { k: 'tec', label: 'Contrôle du bouton d’appel', role: 'TECH', start: 11 * 60, dur: 10 },
  { k: 'dej', label: 'Plateau déjeuner', role: 'AS', start: 12 * 60, dur: 45 },
  { k: 'vis', label: 'Visite de la famille', role: 'ACC', start: 14 * 60 + 30, dur: 60 },
  { k: 'ani', label: 'Accompagnement à l’animation', role: 'AES', start: 15 * 60, dur: 60 },
  { k: 'gou', label: 'Goûter', role: 'AS', start: 16 * 60, dur: 30 },
  { k: 'din', label: 'Plateau dîner', role: 'AS', start: 18 * 60 + 30, dur: 45 },
]

const _fc: Record<number, { floor: Floor; rooms: Room[] }> = {}
export function floorData(f: number) {
  if (_fc[f]) return _fc[f]
  const r = rng(1000 + f * 77)
  const rooms: Room[] = []
  for (let n = 1; n <= N_ROOMS; n++) {
    const no = String(f * 100 + n).padStart(3, '0')
    const x = r()
    const state: Room['state'] = x < 0.07 ? 'free' : x < 0.12 ? 'out' : 'occ'
    const who = state === 'free' ? null : CIV[Math.floor(r() * CIV.length)] + ' ' + LET[Math.floor(r() * LET.length)] + '. ' + LET[Math.floor(r() * LET.length)] + '.'
    const tasks: Task[] = []
    if (state === 'free') {
      if (r() < 0.55) tasks.push({ k: 'prep', label: 'Préparer la chambre pour une arrivée', role: 'ASHQ', start: 11 * 60, end: 11 * 60 + 40, st: 'todo', by: POOL.ASHQ[Math.floor(r() * 3)], room: no })
    } else {
      CAT.forEach((c) => {
        const p = r()
        let keep: boolean
        if (['pdj', 'dej', 'gou', 'din'].includes(c.k)) keep = state === 'occ'
        else if (c.k === 'men' || c.k === 'lin') keep = p < 0.7
        else keep = p < 0.25
        if (c.k === 'vis' || c.k === 'ani') keep = keep && state === 'occ'
        if (!keep) return
        const start = c.start + Math.floor(r() * 3) * 5
        const end = start + c.dur
        let st: TaskStatus
        if (end <= NOW) st = r() < 0.035 ? 'late' : 'done'
        else if (start <= NOW) st = 'wip'
        else st = 'todo'
        tasks.push({ k: c.k, label: c.label, role: c.role, start, end, st, by: POOL[c.role][Math.floor(r() * POOL[c.role].length)], room: no })
      })
    }
    tasks.sort((a, b) => a.start - b.start)
    const dot = dotOf(tasks)
    rooms.push({ no, n, floor: f, side: n <= 16 ? 'N' : 'S', state, who, tasks, dot })
  }
  return (_fc[f] = { floor: FLOORS[f], rooms })
}
// Pastille d'une chambre : rouge (retard) > orange (en cours) > vert (à jour) > gris.
export function dotOf(tasks: { st: TaskStatus }[]): Dot {
  if (tasks.some((t) => t.st === 'late')) return 'late'
  if (tasks.some((t) => t.st === 'wip')) return 'wip'
  if (tasks.some((t) => t.st === 'done')) return 'ok'
  return 'none'
}
export function counts(d: { rooms: Room[] }) {
  const c = { ok: 0, wip: 0, late: 0, none: 0, free: 0, occ: 0 }
  d.rooms.forEach((r) => { c[r.dot]++; if (r.state === 'free') c.free++; else c.occ++ })
  return c
}
export function roomLabel(r: Room) { return r.state === 'free' ? 'Chambre libre' : r.state === 'out' ? 'En sortie' : LBL[r.dot] }

const FIRST = ['Camille', 'Yanis', 'Inès', 'Lucas', 'Salomé', 'Théo', 'Nadia', 'Pierre', 'Amélie', 'Léa', 'Hugo', 'Marc', 'Sophie', 'Jade', 'Noé', 'Clara', 'Malik', 'Lola', 'Eliott', 'Maya', 'Samir', 'Zoé', 'Basile', 'Anaïs', 'Ethan', 'Margaux', 'Rayan', 'Élodie', 'Tom', 'Louise', 'Karim', 'Océane', 'Adrien', 'Manon', 'Bilal', 'Chloé', 'Axel', 'Lina', 'Victor', 'Emma', 'Gaël', 'Ruben', 'Sarah', 'Nolan']
export const ROLES = [
  { k: 'IDE', label: 'Infirmiers', n: 6, min: { m: 2, s: 2, n: 1 } },
  { k: 'AS', label: 'Aides-soignants', n: 16, min: { m: 5, s: 4, n: 2 } },
  { k: 'AES', label: 'AES / AMP', n: 5, min: { m: 2, s: 1, n: 1 } },
  { k: 'ASHQ', label: 'Agents de service', n: 8, min: { m: 3, s: 2, n: 0 } },
  { k: 'ANI', label: 'Animation', n: 2, min: { m: 1, s: 0, n: 0 } },
  { k: 'TECH', label: 'Services techniques', n: 2, min: { m: 1, s: 0, n: 0 } },
  { k: 'ACC', label: 'Accueil et administratif', n: 3, min: { m: 2, s: 1, n: 0 } },
]
export const SHIFTS = { m: { label: 'Matin', a: 6 * 60 + 45, b: 14 * 60 + 15 }, s: { label: 'Soir', a: 13 * 60 + 30, b: 21 * 60 }, n: { label: 'Nuit', a: 21 * 60, b: 31 * 60 } }
let _staff: Staff[] | null = null
export function staffAll(): Staff[] {
  if (_staff) return _staff
  const r = rng(4242)
  let i = 0
  const out: Staff[] = []
  ROLES.forEach((role) => {
    for (let j = 0; j < role.n; j++) {
      const x = r()
      let shift: Staff['shift'] = x < 0.34 ? 'm' : x < 0.58 ? 's' : x < 0.74 ? 'n' : x < 0.88 ? 'off' : x < 0.95 ? 'leave' : 'abs'
      if (['ANI', 'TECH', 'ACC'].includes(role.k)) shift = x < 0.8 ? 'm' : x < 0.9 ? 's' : 'leave'
      out.push({ name: FIRST[i % FIRST.length] + ' ' + LET[Math.floor(r() * LET.length)] + '.', role: role.k, shift, floor: Math.floor(r() * 4), pause: 10 * 60 + 15 + (j % 4) * 15 })
      i++
    }
  })
  return (_staff = out)
}
const ANI = ['Jeux de société', 'Chorale', 'Atelier cuisine', 'Lecture du journal', 'Loto', 'Atelier peinture']
export function residentDay(room: Room, day = 0): DayEvent[] {
  const r = rng(Number(room.no) * 31 + 7 + day * 101)
  const ev: DayEvent[] = [
    { t: 8 * 60, label: 'Petit-déjeuner', place: 'Chambre', k: 'meal' },
    { t: 12 * 60, label: 'Déjeuner', place: 'Salle à manger', k: 'meal' },
    { t: 16 * 60, label: 'Goûter', place: 'Salon', k: 'meal' },
    { t: 18 * 60 + 30, label: 'Dîner', place: 'Salle à manger', k: 'meal' },
  ]
  if (room.state === 'out') return [{ t: 9 * 60, label: 'Sortie avec la famille', place: 'Hors de l’établissement', k: 'out' }]
  if (r() < 0.65) ev.push({ t: 10 * 60 + 30, label: ANI[Math.floor(r() * ANI.length)], place: 'Salon d’animation', k: 'ani' })
  if (r() < 0.55) ev.push({ t: 15 * 60, label: ANI[Math.floor(r() * ANI.length)], place: 'Salon d’animation', k: 'ani' })
  if (r() < 0.4) ev.push({ t: 14 * 60 + 30, label: 'Visite de la famille', place: 'Chambre', k: 'vis' })
  if (r() < 0.2) ev.push({ t: 11 * 60, label: 'Coiffeuse', place: 'Salon de coiffure', k: 'coif' })
  return ev.sort((a, b) => a.t - b.t)
}
