// Visites fictives. À remplacer par visit_slots et visit_requests (Supabase).
export type Slot = { id: string; iso: string; start: number; remaining: number; capacity: number }
export type VReq = { id: string; visitor: string; email: string; who: string; slotId: string; iso: string; start: number; n: number; st: 'pending' | 'ok' | 'no'; at: string }

const CAP = 12
const BASE = [3, 5, 12, 7, 2, 10, 4, 12, 6, 1, 8, 5, 9, 3, 12, 6, 4, 2, 7, 10, 5, 3, 11, 6, 8, 2, 9, 4, 12, 7, 5, 3, 6, 8, 1, 10, 4, 9, 2, 12, 7, 5]
const STARTS = [600, 660, 840, 900, 960, 1020]

export function demoSlots(): Slot[] {
  return Array.from({ length: 7 }, (_, d) => STARTS.map((start, s) => ({ id: `2026-10-${12 + d}|${start}`, iso: `2026-10-${12 + d}`, start, capacity: CAP, remaining: Math.max(0, CAP - BASE[(d * 6 + s) % BASE.length]) }))).flat()
}
export const DEMO_REQS: VReq[] = [
  { id: 'r0', visitor: 'Mme D. (fille)', email: 'd@exemple.fr', who: 'Mme N. A. · ch. 203', slotId: '2026-10-15|600', iso: '2026-10-15', start: 600, n: 2, st: 'pending', at: 'reçue aujourd’hui' },
  { id: 'r1', visitor: 'M. L. (fils)', email: 'l@exemple.fr', who: 'M. N. N. · ch. 208', slotId: '2026-10-16|660', iso: '2026-10-16', start: 660, n: 1, st: 'pending', at: 'reçue aujourd’hui' },
  { id: 'r2', visitor: 'Mme R. (petite-fille)', email: 'r@exemple.fr', who: 'Mme V. A. · ch. 213', slotId: '2026-10-17|840', iso: '2026-10-17', start: 840, n: 1, st: 'pending', at: 'reçue aujourd’hui' },
  { id: 'r3', visitor: 'Mme S. (amie)', email: 's@exemple.fr', who: 'M. C. D. · ch. 224', slotId: '2026-10-15|960', iso: '2026-10-15', start: 960, n: 1, st: 'ok', at: 'reçue hier' },
  { id: 'r4', visitor: 'Mme P. (belle-fille)', email: 'p@exemple.fr', who: 'Mme T. V. · ch. 113', slotId: '2026-10-18|660', iso: '2026-10-18', start: 660, n: 1, st: 'no', at: 'reçue hier' },
]
