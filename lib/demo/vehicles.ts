// Véhicules fictifs. À remplacer par les tables vehicles et vehicle_bookings (Supabase).
export type P = 'm' | 'a' | 'j'
export type Vehicle = { id: string; n: string; model: string; plate: string; km: number; svc: number; ct: string; ass: string; garage: boolean }
export type Booking = { id: string; v: string; d: number; p: P; motif: string; who: string }
export type WeekDay = { n: string; d: number; iso: string }

export const WEEK: WeekDay[] = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((n, i) => ({ n, d: 12 + i, iso: `2026-10-${12 + i}` }))
export const TODAY_IDX = 2
export const VEHICLES: Vehicle[] = [
  { id: 'v0', n: 'Minibus 9 places', model: 'Renault Master', plate: 'AA-101-AA', km: 48210, svc: 50000, ct: 'mars 2027', ass: 'janv. 2027', garage: false },
  { id: 'v1', n: 'Utilitaire technique', model: 'Peugeot Partner', plate: 'BB-202-BB', km: 91340, svc: 90000, ct: 'juin 2026', ass: 'janv. 2027', garage: false },
  { id: 'v2', n: 'Véhicule de service', model: 'Dacia Duster', plate: 'CC-303-CC', km: 22760, svc: 30000, ct: 'sept. 2027', ass: 'janv. 2027', garage: false },
  { id: 'v3', n: 'Navette cuisine', model: 'Citroën Berlingo', plate: 'DD-404-DD', km: 63480, svc: 70000, ct: 'févr. 2027', ass: 'janv. 2027', garage: true },
]
export const BOOKINGS: Booking[] = [
  { id: 'b0', v: 'v0', d: 2, p: 'm', motif: 'sortie', who: 'Léa V.' }, { id: 'b1', v: 'v0', d: 3, p: 'a', motif: 'sortie', who: 'Léa V.' }, { id: 'b2', v: 'v0', d: 4, p: 'j', motif: 'navette', who: 'Hugo T.' },
  { id: 'b3', v: 'v1', d: 3, p: 'm', motif: 'tech', who: 'Marc L.' }, { id: 'b4', v: 'v1', d: 4, p: 'm', motif: 'tech', who: 'Marc L.' },
  { id: 'b5', v: 'v2', d: 2, p: 'a', motif: 'navette', who: 'Sophie G.' }, { id: 'b6', v: 'v2', d: 3, p: 'j', motif: 'form', who: 'Camille R.' },
  { id: 'b7', v: 'v3', d: 2, p: 'm', motif: 'courses', who: 'Nadia K.' },
]
