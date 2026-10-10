'use client'

import { useState, useTransition } from 'react'
import type { Art } from '@/lib/demo/stock'
import { orderItem } from './actions'

const CATS = [{ k: 'hyg', n: 'Hygiène' }, { k: 'lin', n: 'Linge' }, { k: 'ent', n: 'Entretien' }, { k: 'res', n: 'Restauration' }, { k: 'tec', n: 'Technique' }]

type S = 'late' | 'wip' | 'ok'
const st = (a: Art): S => (a.q === 0 ? 'late' : a.q <= a.min ? 'wip' : 'ok')
const STL: Record<S, string> = { late: 'Rupture', wip: 'À commander', ok: 'Suffisant' }
const rank: Record<S, number> = { late: 0, wip: 1, ok: 2 }
const weeks = (a: Art) => (a.w ? a.q / a.w : 99)
function left(a: Art) {
  const d = Math.round(weeks(a) * 7)
  return a.q === 0 ? 'épuisé' : d >= 60 ? 'plus de 2 mois' : `${d} j. restants`
}

export function StockView({ items, locations }: { items: Art[]; locations: Record<string, string> }) {
  const [arts, setArts] = useState(items)
  const [error, setError] = useState<string | null>(null)
  const [, start] = useTransition()
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
      {error && <p role="alert" className="err">{error}</p>}
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
              <p className="fa-m">{locations[a.l] ?? a.l}</p>
              {s !== 'ok' && (a.ord
                ? <p className="ord">✓ Commande envoyée</p>
                : <button className="btn sm" onClick={() => {
                  setError(null)
                  setArts((l) => l.map((x) => (x.id === a.id ? { ...x, ord: true } : x)))
                  start(async () => {
                    const res = await orderItem(a.id)
                    if (!res.ok) { setArts((l) => l.map((x) => (x.id === a.id ? { ...x, ord: false } : x))); setError(res.error) }
                  })
                }}>Commander</button>)}
            </article>
          )
        })}
      </div>
    </div>
  )
}
