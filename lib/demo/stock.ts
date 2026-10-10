// Stock fictif. À remplacer par la table stock_items (Supabase).
export const LOCATIONS: Record<string, string> = { res: 'Réserve centrale', lin: 'Lingerie', off: 'Office cuisine', tec: 'Atelier technique', m1: 'Local ménage 1er', m2: 'Local ménage 2e', m3: 'Local ménage 3e' }

export type Art = { id: string; n: string; c: string; l: string; q: number; min: number; max: number; w: number; u: string; ord: boolean }
// nom, catégorie, local, quantité, seuil, maximum, consommation par semaine, unité
export const STOCK: Art[] = ([
  ['Protections adultes (taille M)', 'hyg', 'res', 180, 200, 800, 350, 'pièces'],
  ['Gants vinyle, boîte de 100', 'hyg', 'res', 14, 10, 40, 8, 'boîtes'],
  ['Savon liquide 5 L', 'hyg', 'res', 6, 4, 12, 2, 'bidons'],
  ['Lingettes de toilette', 'hyg', 'res', 45, 60, 150, 40, 'paquets'],
  ['Gel hydroalcoolique 1 L', 'hyg', 'res', 9, 6, 20, 3, 'flacons'],
  ['Alèses jetables', 'hyg', 'lin', 120, 100, 400, 90, 'pièces'],
  ['Draps plats', 'lin', 'lin', 85, 60, 150, 20, 'pièces'],
  ['Serviettes de toilette', 'lin', 'lin', 140, 100, 260, 30, 'pièces'],
  ['Taies d’oreiller', 'lin', 'lin', 0, 40, 120, 15, 'pièces'],
  ['Gants de toilette', 'lin', 'lin', 70, 80, 200, 25, 'pièces'],
  ['Produit sol 5 L', 'ent', 'm1', 3, 2, 8, 1, 'bidons'],
  ['Désinfectant surfaces', 'ent', 'm2', 2, 2, 8, 2, 'flacons'],
  ['Sacs poubelle 50 L', 'ent', 'm2', 14, 8, 30, 5, 'rouleaux'],
  ['Lavettes microfibre', 'ent', 'm3', 30, 20, 60, 6, 'pièces'],
  ['Sacs poubelle 50 L', 'ent', 'm3', 3, 8, 30, 5, 'rouleaux'],
  ['Papier essuie-mains', 'ent', 'm1', 18, 10, 40, 6, 'paquets'],
  ['Gobelets', 'res', 'off', 400, 300, 1200, 220, 'pièces'],
  ['Serviettes en papier', 'res', 'off', 1200, 800, 3000, 500, 'pièces'],
  ['Sets de table', 'res', 'off', 150, 200, 800, 210, 'pièces'],
  ['Café moulu 1 kg', 'res', 'off', 5, 3, 12, 2, 'paquets'],
  ['Ampoules LED E27', 'tec', 'tec', 22, 10, 40, 3, 'pièces'],
  ['Piles AA (boutons d’appel)', 'tec', 'tec', 40, 20, 80, 8, 'pièces'],
  ['Silicone sanitaire', 'tec', 'tec', 1, 2, 8, 1, 'tubes'],
  ['Joints de robinet', 'tec', 'tec', 25, 10, 40, 2, 'pièces'],
] as [string, string, string, number, number, number, number, string][]).map((a, i) => ({ id: 'a' + i, n: a[0], c: a[1], l: a[2], q: a[3], min: a[4], max: a[5], w: a[6], u: a[7], ord: false }))
