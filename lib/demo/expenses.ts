import { rng } from './data'

export type Cat = 'pet' | 'tps' | 'cout'
export type Entry = { id: string; d: number; cat: Cat; sub: string; f: number; eur: number; hrs: number }
export const SUBS = {
  pet: ['Achats de dépannage en magasin', 'Fournitures d’animation avancées', 'Petit matériel acheté sur place'],
  tps: ['Heures supplémentaires non déclarées', 'Transmissions qui débordent', 'Recherche de matériel', 'Déplacements non comptés'],
  cout: ['Énergie hors plan', 'Véhicules : carburant et lavage', 'Pannes : dépannage urgent', 'Pertes de stock : casse, péremption'],
} as const
export const RATE = 24 // € par heure chargée, valeur d'exemple

// Jeu fictif : en production, lignes de la table expenses.
export function demoEntries(): Entry[] {
  const r = rng(1010)
  const out: Entry[] = []
  for (let i = 0; i < 46; i++) {
    const x = r()
    const cat: Cat = x < 0.34 ? 'pet' : x < 0.66 ? 'tps' : 'cout'
    const sub = SUBS[cat][Math.floor(r() * SUBS[cat].length)]
    const hrs = cat === 'tps' ? Math.round((0.5 + r() * 3.5) * 2) / 2 : 0
    const eur = cat === 'pet' ? 8 + Math.round(r() * 50) : cat === 'tps' ? hrs * RATE : 25 + Math.round(r() * 190)
    out.push({ id: 'e' + i, d: 1 + Math.floor(r() * 14), cat, sub, f: Math.floor(r() * 5), eur, hrs })
  }
  return out.sort((a, b) => a.d - b.d)
}
