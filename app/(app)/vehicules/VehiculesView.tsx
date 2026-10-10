'use client'

import { useState, useTransition } from 'react'
import type { Booking, P, Vehicle, WeekDay } from '@/lib/demo/vehicles'
import { createBooking } from './actions'

const DNL = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']
const PER: Record<P, { n: string; t: string }> = { m: { n: 'Matin', t: '08:00–12:00' }, a: { n: 'Après-midi', t: '13:30–17:30' }, j: { n: 'Journée', t: '08:00–17:30' } }
const MOT: Record<string, string> = { sortie: 'Sortie résidents', courses: 'Courses cuisine', navette: 'Navette CHU', tech: 'Intervention technique', form: 'Formation' }
const overlap = (a: P, b: P) => a === 'j' || b === 'j' || a === b

export function VehiculesView({ vehicles: V, bookings, week, today: TODAY, me }: { vehicles: Vehicle[]; bookings: Booking[]; week: WeekDay[]; today: number; me: string }) {
  const [bk, setBk] = useState(bookings)
  const [error, setError] = useState<string | null>(null)
  const [, start] = useTransition()
  const [v, setV] = useState(0)
  const [d, setD] = useState(Math.min(TODAY + 1, 6))
  const [p, setP] = useState<P>('m')
  const [motif, setMotif] = useState('sortie')
  const [last, setLast] = useState<string | null>(null)
  const taken = (vi: string, di: number, pi: P) => bk.find((b) => b.v === vi && b.d === di && overlap(b.p, pi))

  const status = (i: number) => {
    const x = V[i]
    if (x.garage) return { c: 'late', l: 'Au garage' }
    if (x.km > x.svc) return { c: 'late', l: 'Entretien dépassé' }
    const b = bk.find((y) => y.v === V[i].id && y.d === TODAY && (y.p === 'm' || y.p === 'j'))
    if (b) return { c: 'wip', l: `En sortie jusqu’à ${b.p === 'j' ? '17:30' : '12:00'}` }
    return { c: 'ok', l: 'Disponible' }
  }
  const ok = !!V[v] && !taken(V[v].id, d, p) && !V[v].garage

  return (
    <div>
      <div className="g8">
        {V.map((x, i) => {
          const s = status(i), left = x.svc - x.km, pct = Math.max(2, Math.min(100, (1 - left / 10000) * 100))
          return (
            <article key={x.plate} className={`vc st-${s.c}${v === i ? ' sel' : ''}`}>
              <header><div><h3>{x.n}</h3><p>{x.model} · {x.plate}</p></div><span className={`pill st-${s.c}`}><i className="dot" />{s.l}</span></header>
              <p className="vk"><b className="disp">{x.km.toLocaleString('fr-FR')}</b> km</p>
              <div className={`bar${left < 0 ? ' bad' : ''}`}><i style={{ width: `${pct}%` }} /></div>
              <p className="vm">{left < 0 ? `Entretien dépassé de ${(-left).toLocaleString('fr-FR')} km` : `Entretien dans ${left.toLocaleString('fr-FR')} km`}</p>
              <p className="vm">Contrôle technique : {x.ct} · Assurance : {x.ass}</p>
              <button className="btn" disabled={x.garage} onClick={() => { setV(i); setLast(null) }}>Réserver ce véhicule</button>
            </article>
          )
        })}
      </div>

      <div className="rf">
        {error && <p role="alert" className="err">{error}</p>}
        {last ? (
          <>
            <p className="ord">✓ Réservation enregistrée : {last}</p>
            <button className="btn" onClick={() => setLast(null)}>Nouvelle réservation</button>
          </>
        ) : (
          <>
            <p className="k5">Réserver · {V[v].n}</p>
            <p className="fl-k">Jour</p>
            <div className="chips">{week.map((w, i) => <button key={w.n} className="chip" aria-pressed={d === i} disabled={i < TODAY} onClick={() => setD(i)}>{w.n} {w.d}</button>)}</div>
            <p className="fl-k">Créneau</p>
            <div className="chips">
              {(Object.keys(PER) as P[]).map((k) => {
                const t = taken(V[v].id, d, k)
                return <button key={k} className="chip" aria-pressed={p === k} disabled={!!t} onClick={() => setP(k)}>{PER[k].n} · {PER[k].t}{t ? ' (pris)' : ''}</button>
              })}
            </div>
            <p className="fl-k">Motif</p>
            <div className="chips">{Object.keys(MOT).map((k) => <button key={k} className="chip" aria-pressed={motif === k} onClick={() => setMotif(k)}>{MOT[k]}</button>)}</div>
            <button
              className="btn"
              disabled={!ok}
              onClick={() => {
                const veh = V[v], label = `${veh.n} · ${DNL[d]} ${week[d].d} · ${PER[p].n.toLowerCase()} (${PER[p].t})`
                const mine: Booking = { id: 'tmp' + bk.length, v: veh.id, d, p, motif, who: me }
                setError(null)
                setBk((l) => [...l, mine])
                start(async () => {
                  const res = await createBooking(veh.id, week[d].iso, p, motif)
                  if (res.ok) setLast(label)
                  else { setBk((l) => l.filter((x) => x.id !== mine.id)); setError(res.error) }
                })
              }}
            >Confirmer la réservation</button>
          </>
        )}
      </div>
    </div>
  )
}
