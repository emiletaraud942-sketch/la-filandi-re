'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'
import { useToast } from '@/components/Toast'
import type { Cat, Entry } from '@/lib/demo/expenses'
import { addExpense, deleteExpense, saveTargets, updateExpense } from './actions'

const CK: Cat[] = ['pet', 'tps', 'cout']
const CATS: Record<Cat, { n: string; s: string }> = {
  pet: { n: 'Petites dépenses non suivies', s: 'Petites dépenses' },
  tps: { n: 'Temps non compté', s: 'Temps non compté' },
  cout: { n: 'Coûts d’usage cachés', s: 'Coûts cachés' },
}
const CC: Record<Cat, string> = { pet: 'c1', tps: 'c2', cout: 'c3' }
const FL = ['RDC', '1er', '2e', '3e', 'Non précisé']
const fmt = (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' €'

export type Period = { label: string; day: number; days: number }
type Props = { entries: Entry[]; subs: Record<Cat, readonly string[]>; rate: number; targets: Record<Cat, number> | null; period: Period; month: string; months: { value: string; label: string }[] }

export function FraisView({ entries, subs, rate, targets, period, month, months }: Props) {
  const router = useRouter()
  const toast = useToast()
  const TODAY_D = period.day, DAYS_IN = period.days
  const [, start] = useTransition()
  const [list, setList] = useState(entries)
  const [cat, setCat] = useState<Cat>('cout')
  const [sub, setSub] = useState(0)
  const [amt, setAmt] = useState(20)
  const [hrs, setHrs] = useState(1)
  const [floor, setFloor] = useState(4)
  const [edit, setEdit] = useState<{ id: string; eur: number; hrs: number } | null>(null)
  const [tg, setTg] = useState<Record<Cat, number> | null>(null)
  const [all, setAll] = useState(false)
  useEffect(() => { setList(entries) }, [entries])

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, okText: string, undo?: () => void, after?: () => void) =>
    start(async () => {
      const res = await fn()
      if (res.ok) { toast.ok(okText); after?.(); router.refresh() } else { undo?.(); toast.err(res.error ?? 'Action refusée.') }
    })

  const tot = (f: (e: Entry) => boolean = () => true) => list.filter(f).reduce((a, e) => a + e.eur, 0)
  const proj = (v: number) => (v / TODAY_D) * DAYS_IN
  const base = targets

  const total = tot()
  const bySub: Record<string, number> = {}
  list.forEach((e) => { const key = e.cat + '|' + e.sub; bySub[key] = (bySub[key] ?? 0) + e.eur })
  const top = Object.entries(bySub).sort((a, b) => b[1] - a[1]).slice(0, 5)
  const hours = list.reduce((a, e) => a + e.hrs, 0)
  const current = months[0]?.value === month
  const shown = (all ? list : list.slice(-8)).slice().reverse()

  const add = () => {
    const eur = cat === 'tps' ? hrs * rate : amt
    const e: Entry = { id: 'tmp' + Date.now(), d: TODAY_D, cat, sub: subs[cat][sub], f: floor, eur, hrs: cat === 'tps' ? hrs : 0 }
    setList((l) => [...l, e])
    run(() => addExpense(e.cat, e.sub, e.eur, e.hrs, floor === 4 ? null : floor), `Ajouté : ${e.sub}, ${fmt(eur)}`, () => setList((l) => l.filter((x) => x.id !== e.id)))
  }
  const remove = (e: Entry) => {
    if (!confirm(`Supprimer « ${e.sub} » (${fmt(e.eur)}) ?`)) return
    const before = list
    setList((l) => l.filter((x) => x.id !== e.id))
    run(() => deleteExpense(e.id), 'Saisie supprimée', () => setList(before))
  }
  const saveEdit = () => {
    if (!edit) return
    const before = list
    setList((l) => l.map((x) => (x.id === edit.id ? { ...x, eur: edit.eur, hrs: edit.hrs } : x)))
    run(() => updateExpense(edit.id, edit.eur, edit.hrs), 'Saisie corrigée', () => setList(before), () => setEdit(null))
  }

  return (
    <div>
      <div className="chips" role="group" aria-label="Mois" style={{ marginBottom: 12 }}>
        {months.map((m) => <Link key={m.value} href={m.value === months[0].value ? '/frais' : `/frais?mois=${m.value}`} className="chip" aria-pressed={m.value === month} scroll={false}>{m.label}</Link>)}
      </div>
      <div className="top10">
        <div className="tot10">
          <span>Frais invisibles · {period.label}, du 1er au {TODAY_D}</span>
          <b className="disp">{fmt(total)}</b>
          <small>{current ? <>Projection fin de mois : <b>{fmt(proj(total))}</b></> : 'Mois terminé'}</small>
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
              <p className="sm">{current ? 'Projection' : 'Total'} {fmt(p)}{b > 0 ? ` · repère ${fmt(b)}` : ' · aucun repère mensuel fixé'}</p>
              {b > 0 && <span className={`pill st-${over ? 'late' : 'ok'}`}><i className="dot" />{over ? 'Au-dessus du repère' : 'Dans le repère'}</span>}
            </article>
          )
        })}
      </div>

      <div className="two10">
        <section className="bx">
          <h3 className="disp">Cinq postes qui pèsent le plus</h3>
          {top.length ? top.map(([key, v]) => {
            const [k, s] = key.split('|')
            return (
              <div key={key} className={`rk ${CC[k as Cat]}`}>
                <span className="rk-n">{s}</span>
                <div className="rk-b"><i style={{ width: `${(v / (top[0]?.[1] || 1)) * 100}%` }} /></div>
                <b>{fmt(v)}</b>
              </div>
            )
          }) : <p className="muted">Aucune saisie ce mois-ci.</p>}
        </section>
        <section className="bx eq">
          <h3 className="disp">Ce que cela représente</h3>
          <p><b className="disp">{hours} h</b> de travail non comptées, soit {fmt(hours * rate)} au taux de {rate} € de l’heure.</p>
          {tg ? (
            <div className="tgf">
              {CK.map((k) => (
                <label key={k} className="fl">{CATS[k].s} (€)<input type="number" min={0} step={10} value={tg[k]} onChange={(e) => setTg({ ...tg, [k]: Number(e.target.value) })} /></label>
              ))}
              <div className="rowb">
                <button className="btn ghost" onClick={() => setTg(null)}>Annuler</button>
                <button className="btn" onClick={() => run(() => saveTargets(month, tg), 'Repères enregistrés', undefined, () => setTg(null))}>Enregistrer</button>
              </div>
            </div>
          ) : (
            <>
              <p className="muted">Taux : valeur d’exemple, à fixer avec la direction.</p>
              <button className="btn ghost" onClick={() => setTg({ pet: base?.pet ?? 0, tps: base?.tps ?? 0, cout: base?.cout ?? 0 })}>Régler les repères du mois</button>
            </>
          )}
        </section>
      </div>

      {current && (
        <section className="bx add10">
          <h3 className="disp">Ajouter une dépense</h3>
          <div className="cbs">
            {CK.map((k) => <button key={k} className={`cb ${CC[k]}`} aria-pressed={cat === k} onClick={() => { setCat(k); setSub(0) }}>{CATS[k].s}</button>)}
          </div>
          <div className="chips" style={{ marginTop: 10 }}>
            {subs[cat].map((s, i) => <button key={s} className="chip" aria-pressed={sub === i} onClick={() => setSub(i)}>{s}</button>)}
          </div>
          <div className="chips" style={{ marginTop: 10 }} role="group" aria-label="Étage">
            {FL.map((l, i) => <button key={l} className="chip" aria-pressed={floor === i} onClick={() => setFloor(i)}>{l}</button>)}
          </div>
          {cat === 'tps' ? (
            <div className="stp">
              <button className="pm" onClick={() => setHrs((h) => Math.max(0.5, h - 0.5))} aria-label="Moins">−</button>
              <b className="disp">{hrs} h <small>= {fmt(hrs * rate)}</small></b>
              <button className="pm" onClick={() => setHrs((h) => h + 0.5)} aria-label="Plus">+</button>
            </div>
          ) : (
            <div className="pre">
              {[5, 10, 20, 50, 100].map((v) => <button key={v} className="chip" aria-pressed={amt === v} onClick={() => setAmt(v)}>{v} €</button>)}
              <input className="oth" type="number" min={0} step={1} aria-label="Autre montant en euros" placeholder="autre" value={[5, 10, 20, 50, 100].includes(amt) ? '' : amt} onChange={(e) => setAmt(Number(e.target.value))} />
            </div>
          )}
          <button className="btn add-btn" disabled={cat !== 'tps' && !(amt > 0)} onClick={add}>Ajouter · {fmt(cat === 'tps' ? hrs * rate : amt)}</button>
        </section>
      )}

      <section className="bx add10">
        <h3 className="disp">Saisies du mois ({list.length})</h3>
        {!list.length && <p className="muted">Aucune saisie.</p>}
        {shown.map((e) => (
          <div key={e.id} className={`ent ${CC[e.cat]}`}>
            <span className="sq" />
            <span className="ent-t"><b>{e.sub}</b><small>{e.d} {period.label} · {FL[e.f] ?? 'Non précisé'}{e.hrs ? ` · ${e.hrs} h` : ''}</small></span>
            {edit?.id === e.id ? (
              <span className="ent-e">
                <input type="number" min={0} aria-label="Montant" value={edit.eur} onChange={(x) => setEdit({ ...edit, eur: Number(x.target.value) })} />
                {e.cat === 'tps' && <input type="number" min={0} step={0.5} aria-label="Heures" value={edit.hrs} onChange={(x) => setEdit({ ...edit, hrs: Number(x.target.value) })} />}
                <button className="btn" onClick={saveEdit}>OK</button>
                <button className="btn ghost" onClick={() => setEdit(null)}>×</button>
              </span>
            ) : (
              <span className="ent-e">
                <b>{fmt(e.eur)}</b>
                <button className="lnk" onClick={() => setEdit({ id: e.id, eur: e.eur, hrs: e.hrs })}>corriger</button>
                <button className="lnk" onClick={() => remove(e)}>supprimer</button>
              </span>
            )}
          </div>
        ))}
        {list.length > 8 && <button className="lnk" onClick={() => setAll((v) => !v)}>{all ? 'Voir moins' : `Voir les ${list.length} saisies`}</button>}
      </section>
    </div>
  )
}
