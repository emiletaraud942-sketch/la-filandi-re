'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { useToast } from '@/components/Toast'
import type { Art } from '@/lib/demo/stock'
import { loadMovements, moveStock, orderItem, saveItem, setStockQty, type ItemInput, type Movement } from './actions'

const CATS = [{ k: 'hyg', n: 'Hygiène' }, { k: 'lin', n: 'Linge' }, { k: 'ent', n: 'Entretien' }, { k: 'res', n: 'Restauration' }, { k: 'tec', n: 'Technique' }]
type S = 'late' | 'wip' | 'ok'
const st = (a: Art): S => (a.q === 0 ? 'late' : a.q <= a.min ? 'wip' : 'ok')
const STL: Record<S, string> = { late: 'Rupture', wip: 'À commander', ok: 'Suffisant' }
const rank: Record<S, number> = { late: 0, wip: 1, ok: 2 }
const weeks = (a: Art) => (a.w ? a.q / a.w : 99)
const stepOf = (a: Art) => (a.max >= 1000 ? 50 : a.max >= 300 ? 10 : 1)
function left(a: Art) {
  const d = Math.round(weeks(a) * 7)
  return a.q === 0 ? 'épuisé' : d >= 60 ? 'plus de 2 mois' : `${d} j. restants`
}
const empty: ItemInput = { name: '', category: 'hyg', location: '', unit: 'pièces', qty: 0, min: 0, max: 10, weekly: 0 }

export function StockView({ items, locations }: { items: Art[]; locations: Record<string, string> }) {
  const router = useRouter()
  const toast = useToast()
  const [arts, setArts] = useState(items)
  const [cat, setCat] = useState('all')
  const [edit, setEdit] = useState<ItemInput | null>(null)
  const [hist, setHist] = useState<{ id: string; rows: Movement[] } | null>(null)
  const [exact, setExact] = useState<{ id: string; v: string } | null>(null)
  const [recv, setRecv] = useState<Record<string, string>>({})
  const [, start] = useTransition()

  const patch = (id: string, f: (a: Art) => Art) => setArts((l) => l.map((x) => (x.id === id ? f(x) : x)))
  const sync = () => router.refresh()

  const move = (a: Art, delta: number, reason: string, okText: string) => {
    if (a.q + delta < 0) return toast.err('Quantité insuffisante : le stock ne peut pas descendre sous zéro.')
    patch(a.id, (x) => ({ ...x, q: x.q + delta, ord: delta > 0 ? false : x.ord }))
    start(async () => {
      const res = await moveStock(a.id, delta, reason)
      if (res.ok) { toast.ok(okText); sync() } else { patch(a.id, (x) => ({ ...x, q: x.q - delta })); toast.err(res.error) }
    })
  }
  const setQty = (a: Art, target: number) => {
    if (!Number.isInteger(target) || target < 0) return toast.err('Quantité invalide.')
    const before = a.q
    patch(a.id, (x) => ({ ...x, q: target }))
    start(async () => {
      const res = await setStockQty(a.id, target)
      if (res.ok) { toast.ok(`${a.n} : ${target} ${a.u}`); sync() } else { patch(a.id, (x) => ({ ...x, q: before })); toast.err(res.error) }
    })
  }
  const order = (a: Art) => {
    patch(a.id, (x) => ({ ...x, ord: true }))
    start(async () => {
      const res = await orderItem(a.id)
      if (res.ok) { toast.ok(`${a.n} : commande enregistrée`); sync() } else { patch(a.id, (x) => ({ ...x, ord: false })); toast.err(res.error) }
    })
  }
  const showHistory = (a: Art) => {
    if (hist?.id === a.id) return setHist(null)
    start(async () => setHist({ id: a.id, rows: await loadMovements(a.id) }))
  }
  const submit = () => {
    if (!edit) return
    const input = edit
    start(async () => {
      const res = await saveItem(input)
      if (res.ok) { toast.ok(input.id ? 'Article modifié' : 'Article ajouté'); setEdit(null); sync() } else toast.err(res.error)
    })
  }
  const openEdit = (a?: Art) =>
    setEdit(a ? { id: a.id, name: a.n, category: a.c, location: a.l, unit: a.u, qty: a.q, min: a.min, max: a.max, weekly: a.w } : { ...empty, location: Object.keys(locations)[0] ?? '' })

  const list = arts.filter((a) => cat === 'all' || a.c === cat).sort((a, b) => rank[st(a)] - rank[st(b)] || weeks(a) - weeks(b))
  const c = (k: S) => arts.filter((a) => st(a) === k).length
  const num = (v: string) => (v === '' ? 0 : Number(v))

  return (
    <div>
      <div className="sum7">
        <div><b className="disp" style={{ color: 'var(--late)' }}>{c('late')}</b><span>en rupture</span></div>
        <div><b className="disp" style={{ color: 'var(--wip)' }}>{c('wip')}</b><span>à commander</span></div>
        <div><b className="disp" style={{ color: 'var(--ok)' }}>{c('ok')}</b><span>suffisants</span></div>
        <div><b className="disp">{arts.length}</b><span>articles suivis</span></div>
      </div>
      <div className="bar7">
        <div className="chips" role="group" aria-label="Catégorie">
          <button className="chip" aria-pressed={cat === 'all'} onClick={() => setCat('all')}>Tout</button>
          {CATS.map((x) => <button key={x.k} className="chip" aria-pressed={cat === x.k} onClick={() => setCat(x.k)}>{x.n}</button>)}
        </div>
        <button className="btn" onClick={() => openEdit()}>+ Nouvel article</button>
      </div>

      {edit && (
        <form className="edit7" onSubmit={(e) => { e.preventDefault(); submit() }}>
          <h3 className="disp">{edit.id ? 'Modifier l’article' : 'Nouvel article'}</h3>
          <label className="f7 wide">Nom<input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} required /></label>
          <label className="f7">Catégorie<select value={edit.category} onChange={(e) => setEdit({ ...edit, category: e.target.value })}>{CATS.map((x) => <option key={x.k} value={x.k}>{x.n}</option>)}</select></label>
          <label className="f7">Local<select value={edit.location} onChange={(e) => setEdit({ ...edit, location: e.target.value })}>{Object.entries(locations).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
          <label className="f7">Unité<input value={edit.unit} onChange={(e) => setEdit({ ...edit, unit: e.target.value })} /></label>
          {!edit.id && <label className="f7">Quantité actuelle<input type="number" min={0} value={edit.qty} onChange={(e) => setEdit({ ...edit, qty: num(e.target.value) })} /></label>}
          <label className="f7">Seuil d’alerte<input type="number" min={0} value={edit.min} onChange={(e) => setEdit({ ...edit, min: num(e.target.value) })} /></label>
          <label className="f7">Maximum<input type="number" min={1} value={edit.max} onChange={(e) => setEdit({ ...edit, max: num(e.target.value) })} /></label>
          <label className="f7">Consommation par semaine<input type="number" min={0} value={edit.weekly} onChange={(e) => setEdit({ ...edit, weekly: num(e.target.value) })} /></label>
          <div className="row7"><button className="btn" type="submit">Enregistrer</button><button className="btn ghost" type="button" onClick={() => setEdit(null)}>Annuler</button></div>
        </form>
      )}

      <div className="g7">
        {list.map((a) => {
          const s = st(a), step = stepOf(a)
          const pct = Math.min(100, (a.q / a.max) * 100), mp = (a.min / a.max) * 100
          return (
            <article key={a.id} className={`fa st-${s}`}>
              <header><h3>{a.n}</h3><span className={`pill st-${s}`}><i className="dot" />{STL[s]}</span></header>
              <div className="qty7">
                <button className="pm7" onClick={() => move(a, -step, 'Consommation', `${a.n} : −${step}`)} aria-label={`Retirer ${step}`}>−{step > 1 ? step : ''}</button>
                {exact?.id === a.id ? (
                  <form onSubmit={(e) => { e.preventDefault(); setQty(a, Number(exact.v)); setExact(null) }}>
                    <input className="in7" type="number" min={0} autoFocus value={exact.v} onChange={(e) => setExact({ id: a.id, v: e.target.value })} onBlur={() => setExact(null)} aria-label="Quantité comptée" />
                  </form>
                ) : (
                  <button className="val7 disp" onClick={() => setExact({ id: a.id, v: String(a.q) })} title="Toucher pour saisir la quantité comptée">{a.q}</button>
                )}
                <button className="pm7" onClick={() => move(a, step, 'Livraison', `${a.n} : +${step}`)} aria-label={`Ajouter ${step}`}>+{step > 1 ? step : ''}</button>
                <span className="u7">{a.u}</span>
              </div>
              <div className="bar"><i style={{ width: `${pct}%` }} /><u style={{ left: `${mp}%` }} title="Seuil d’alerte" /></div>
              <p className="fa-m">Seuil {a.min} · {left(a)}</p>
              <p className="fa-m">{locations[a.l] ?? a.l}</p>
              <div className="row7">
                {s !== 'ok' && !a.ord && <button className="btn sm" onClick={() => order(a)}>Commander</button>}
                {a.ord && (
                  <>
                    <span className="ord">✓ Commande envoyée</span>
                    <input className="in7 sm" type="number" min={1} placeholder="Reçu" value={recv[a.id] ?? ''} onChange={(e) => setRecv({ ...recv, [a.id]: e.target.value })} aria-label="Quantité reçue" />
                    <button className="btn sm" disabled={!Number(recv[a.id])} onClick={() => { const q = Number(recv[a.id]); setRecv({ ...recv, [a.id]: '' }); move(a, q, 'Livraison reçue', `${a.n} : +${q} reçus`) }}>Reçu</button>
                  </>
                )}
                <button className="btn sm ghost" onClick={() => openEdit(a)}>Modifier</button>
                <button className="btn sm ghost" onClick={() => showHistory(a)}>{hist?.id === a.id ? 'Masquer' : 'Historique'}</button>
              </div>
              {hist?.id === a.id && (
                <ul className="hist7">
                  {hist.rows.length ? hist.rows.map((m) => (
                    <li key={m.id}><time>{new Date(m.at).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' })}</time><b className={m.delta > 0 ? 'up' : 'dn'}>{m.delta > 0 ? '+' : ''}{m.delta}</b><span>{m.reason ?? ''}{m.who ? ` · ${m.who}` : ''}</span></li>
                  )) : <li className="muted">Aucun mouvement enregistré.</li>}
                </ul>
              )}
            </article>
          )
        })}
      </div>
    </div>
  )
}
