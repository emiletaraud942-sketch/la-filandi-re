'use client'

import { useState } from 'react'

const LOC: Record<string, string> = { res: 'Réserve centrale', lin: 'Lingerie', off: 'Office cuisine', tec: 'Atelier technique', m1: 'Local ménage 1er', m2: 'Local ménage 2e', m3: 'Local ménage 3e' }
const CATS = [{ k: 'hyg', n: 'Hygiène' }, { k: 'lin', n: 'Linge' }, { k: 'ent', n: 'Entretien' }, { k: 'res', n: 'Restauration' }, { k: 'tec', n: 'Technique' }]
type Art = { id: string; n: string; c: string; l: string; q: number; min: number; max: number; w: number; u: string; ord: boolean }
// nom, catégorie, local, quantité, seuil, maximum, consommation par semaine, unité
const SEED: Art[] = ([
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

type S = 'late' | 'wip' | 'ok'
const st = (a: Art): S => (a.q === 0 ? 'late' : a.q <= a.min ? 'wip' : 'ok')
const STL: Record<S, string> = { late: 'Rupture', wip: 'À commander', ok: 'Suffisant' }
const rank: Record<S, number> = { late: 0, wip: 1, ok: 2 }
const weeks = (a: Art) => (a.w ? a.q / a.w : 99)
function left(a: Art) {
  const d = Math.round(weeks(a) * 7)
  return a.q === 0 ? 'épuisé' : d >= 60 ? 'plus de 2 mois' : `${d} j. restants`
}

export function StockView() {
  const [arts, setArts] = useState(SEED)
  const [cat, setCat] = useState('all')
  const list = arts.filter((a) => cat === 'all' || a.c === cat).sort((a, b) => rank[st(a)] - rank[st(b)] || weeks(a) - weeks(b))
  const c = (k: S) => arts.filter((a) => st(a) === k).length
  return (
    <div>
      <div className="sum7">
        <div><b className="disp" style={{ color: 'var(--late)' }}>{c('late')}</b><span>en rupture</span></div>
        <div><b className="disp" style={{ color: 'var(--wip)' }}>{c('wip')}</b><span>à commander</span></div>
        <div><b className="disp" style={{ color: 'var(--ok)' }}>{c('ok')}</b><span>suffisants</span></div>
        <div><b className="disp">{arts.length}</b><span>articles suivis</span></div>
      </div>
      <div className="chips" role="group" aria-label="Catégorie" style={{ marginBottom: 12 }}>
        <button className="chip" aria-pressed={cat === 'all'} onClick={() => setCat('all')}>Tout</button>
        {CATS.map((x) => <button key={x.k} className="chip" aria-pressed={cat === x.k} onClick={() => setCat(x.k)}>{x.n}</button>)}
      </div>
      <div className="g7">
        {list.map((a) => {
          const s = st(a)
          const pct = Math.min(100, (a.q / a.max) * 100), mp = (a.min / a.max) * 100
          return (
            <article key={a.id} className={`fa st-${s}`}>
              <header><h3>{a.n}</h3><span className={`pill st-${s}`}><i className="dot" />{STL[s]}</span></header>
              <p className="fa-q"><b className="disp">{a.q}</b> <span>{a.u}</span></p>
              <div className="bar"><i style={{ width: `${pct}%` }} /><u style={{ left: `${mp}%` }} title="Seuil d’alerte" /></div>
              <p className="fa-m">Seuil {a.min} · {left(a)}</p>
              <p className="fa-m">{LOC[a.l]}</p>
              {s !== 'ok' && (a.ord
                ? <p className="ord">✓ Commande envoyée</p>
                : <button className="btn sm" onClick={() => setArts((l) => l.map((x) => (x.id === a.id ? { ...x, ord: true } : x)))}>Commander</button>)}
            </article>
          )
        })}
      </div>
    </div>
  )
}
