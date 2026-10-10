'use client'

import { useState, useTransition } from 'react'
import type { Cat, Entry } from '@/lib/demo/expenses'
import { addExpense } from './actions'

const CK: Cat[] = ['pet', 'tps', 'cout']
const CATS: Record<Cat, { n: string; s: string }> = {
  pet: { n: 'Petites dépenses non suivies', s: 'Petites dépenses' },
  tps: { n: 'Temps non compté', s: 'Temps non compté' },
  cout: { n: 'Coûts d’usage cachés', s: 'Coûts cachés' },
}
const CC: Record<Cat, string> = { pet: 'c1', tps: 'c2', cout: 'c3' }
const fmt = (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' €'

export type Period = { label: string; day: number; days: number }

export function FraisView({ entries, subs, rate, targets, period }: { entries: Entry[]; subs: Record<Cat, readonly string[]>; rate: number; targets: Record<Cat, number> | null; period: Period }) {
  const TODAY_D = period.day, DAYS_IN = period.days
  const [error, setError] = useState<string | null>(null)
  const [, start] = useTransition()
  const [list, setList] = useState(entries)
  const [cat, setCat] = useState<Cat>('cout')
  const [sub, setSub] = useState(0)
  const [amt, setAmt] = useState(20)
  const [hrs, setHrs] = useState(1)

  const tot = (f: (e: Entry) => boolean = () => true) => list.filter(f).reduce((a, e) => a + e.eur, 0)
  const proj = (v: number) => (v / TODAY_D) * DAYS_IN
  const base = targets

  const total = tot()
  const bySub: Record<string, number> = {}
  list.forEach((e) => { const key = e.cat + '|' + e.sub; bySub[key] = (bySub[key] ?? 0) + e.eur })
  const top = Object.entries(bySub).sort((a, b) => b[1] - a[1]).slice(0, 5)
  const hours = list.reduce((a, e) => a + e.hrs, 0)

  return (
    <div>
      <div className="top10">
        <div className="tot10">
          <span>Frais invisibles · {period.label}, du 1er au {TODAY_D}</span>
          <b className="disp">{fmt(total)}</b>
          <small>Projection fin de mois : <b>{fmt(proj(total))}</b></small>
        </div>
      </div>

      <div className="g10">
        {CK.map((k) => {
          const t = tot((e) => e.cat === k), p = proj(t), b = base?.[k] ?? 0, over = b > 0 && p > b * 1.1
          return (
            <article key={k} className={`sc ${CC[k]}`}>
              <h3>{CATS[k].n}</h3>
              <p className="vv"><b className="disp">{fmt(t)}</b><span>{total ? Math.round((t / total) * 100) : 0} % du total</span></p>
              {b > 0 ? <div className="bar"><i style={{ width: `${Math.min(100, (p / (b * 1.4)) * 100)}%` }} /><u style={{ left: `${(1 / 1.4) * 100}%` }} title="Repère mensuel" /></div> : null}
              <p className="sm">Projection {fmt(p)}{b > 0 ? ` · repère ${fmt(b)}` : ' · aucun repère mensuel fixé'}</p>
              {b > 0 && <span className={`pill st-${over ? 'late' : 'ok'}`}><i className="dot" />{over ? 'Au-dessus du repère' : 'Dans le repère'}</span>}
            </article>
          )
        })}
      </div>

      <div className="two10">
        <section className="bx">
          <h3 className="disp">Cinq postes qui pèsent le plus</h3>
          {top.map(([key, v]) => {
            const [k, s] = key.split('|')
            return (
              <div key={key} className={`rk ${CC[k as Cat]}`}>
                <span className="rk-n">{s}</span>
                <div className="rk-b"><i style={{ width: `${(v / (top[0]?.[1] || 1)) * 100}%` }} /></div>
                <b>{fmt(v)}</b>
              </div>
            )
          })}
        </section>
        <section className="bx eq">
          <h3 className="disp">Ce que cela représente</h3>
          <p><b className="disp">{hours} h</b> de travail non comptées, soit {fmt(hours * rate)} au taux de {rate} € de l’heure.</p>
          <p className="muted">Taux et repères mensuels : valeurs d’exemple, à fixer avec la direction.</p>
        </section>
      </div>

      <section className="bx add10">
        <h3 className="disp">Ajouter une dépense</h3>
        <div className="cbs">
          {CK.map((k) => <button key={k} className={`cb ${CC[k]}`} aria-pressed={cat === k} onClick={() => { setCat(k); setSub(0) }}>{CATS[k].s}</button>)}
        </div>
        <div className="chips" style={{ marginTop: 10 }}>
          {subs[cat].map((s, i) => <button key={s} className="chip" aria-pressed={sub === i} onClick={() => setSub(i)}>{s}</button>)}
        </div>
        {cat === 'tps' ? (
          <div className="stp">
            <button className="pm" onClick={() => setHrs((h) => Math.max(0.5, h - 0.5))} aria-label="Moins">−</button>
            <b className="disp">{hrs} h <small>= {fmt(hrs * rate)}</small></b>
            <button className="pm" onClick={() => setHrs((h) => h + 0.5)} aria-label="Plus">+</button>
          </div>
        ) : (
          <div className="pre">{[5, 10, 20, 50, 100].map((v) => <button key={v} className="chip" aria-pressed={amt === v} onClick={() => setAmt(v)}>{v} €</button>)}</div>
        )}
        {error && <p role="alert" className="err">{error}</p>}
        <button
          className="btn add-btn"
          onClick={() => {
            const e: Entry = { id: 'n' + list.length, d: TODAY_D, cat, sub: subs[cat][sub], f: 4, eur: cat === 'tps' ? hrs * rate : amt, hrs: cat === 'tps' ? hrs : 0 }
            setError(null)
            setList((l) => [...l, e])
            start(async () => {
              const res = await addExpense(e.cat, e.sub, e.eur, e.hrs)
              if (!res.ok) { setList((l) => l.filter((x) => x.id !== e.id)); setError(res.error) }
            })
          }}
        >Ajouter · {fmt(cat === 'tps' ? hrs * rate : amt)}</button>
      </section>
    </div>
  )
}
