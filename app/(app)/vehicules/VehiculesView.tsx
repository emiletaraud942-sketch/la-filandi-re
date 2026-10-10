'use client'

import { useState } from 'react'

const DN = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const DNL = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']
const TODAY = 2, D0 = 12
type P = 'm' | 'a' | 'j'
const PER: Record<P, { n: string; t: string }> = { m: { n: 'Matin', t: '08:00–12:00' }, a: { n: 'Après-midi', t: '13:30–17:30' }, j: { n: 'Journée', t: '08:00–17:30' } }
const MOT: Record<string, string> = { sortie: 'Sortie résidents', courses: 'Courses cuisine', navette: 'Navette CHU', tech: 'Intervention technique', form: 'Formation' }
const V = [
  { n: 'Minibus 9 places', model: 'Renault Master', plate: 'AA-101-AA', km: 48210, svc: 50000, ct: 'mars 2027', ass: 'janv. 2027', garage: false },
  { n: 'Utilitaire technique', model: 'Peugeot Partner', plate: 'BB-202-BB', km: 91340, svc: 90000, ct: 'juin 2026', ass: 'janv. 2027', garage: false },
  { n: 'Véhicule de service', model: 'Dacia Duster', plate: 'CC-303-CC', km: 22760, svc: 30000, ct: 'sept. 2027', ass: 'janv. 2027', garage: false },
  { n: 'Navette cuisine', model: 'Citroën Berlingo', plate: 'DD-404-DD', km: 63480, svc: 70000, ct: 'févr. 2027', ass: 'janv. 2027', garage: true },
]
type Bk = { v: number; d: number; p: P; motif: string; who: string }
const SEED: Bk[] = [
  { v: 0, d: 2, p: 'm', motif: 'sortie', who: 'Léa V.' }, { v: 0, d: 3, p: 'a', motif: 'sortie', who: 'Léa V.' }, { v: 0, d: 4, p: 'j', motif: 'navette', who: 'Hugo T.' },
  { v: 1, d: 3, p: 'm', motif: 'tech', who: 'Marc L.' }, { v: 1, d: 4, p: 'm', motif: 'tech', who: 'Marc L.' },
  { v: 2, d: 2, p: 'a', motif: 'navette', who: 'Sophie G.' }, { v: 2, d: 3, p: 'j', motif: 'form', who: 'Camille R.' },
  { v: 3, d: 2, p: 'm', motif: 'courses', who: 'Nadia K.' },
]
const overlap = (a: P, b: P) => a === 'j' || b === 'j' || a === b

export function VehiculesView() {
  const [bk, setBk] = useState(SEED)
  const [v, setV] = useState(0)
  const [d, setD] = useState(3)
  const [p, setP] = useState<P>('m')
  const [motif, setMotif] = useState('sortie')
  const [last, setLast] = useState<string | null>(null)
  const taken = (vi: number, di: number, pi: P) => bk.find((b) => b.v === vi && b.d === di && overlap(b.p, pi))

  const status = (i: number) => {
    const x = V[i]
    if (x.garage) return { c: 'late', l: 'Au garage' }
    if (x.km > x.svc) return { c: 'late', l: 'Entretien dépassé' }
    const b = bk.find((y) => y.v === i && y.d === TODAY && (y.p === 'm' || y.p === 'j'))
    if (b) return { c: 'wip', l: `En sortie jusqu’à ${b.p === 'j' ? '17:30' : '12:00'}` }
    return { c: 'ok', l: 'Disponible' }
  }
  const ok = !taken(v, d, p) && !V[v].garage

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
        {last ? (
          <>
            <p className="ord">✓ Réservation enregistrée : {last}</p>
            <button className="btn" onClick={() => setLast(null)}>Nouvelle réservation</button>
          </>
        ) : (
          <>
            <p className="k5">Réserver · {V[v].n}</p>
            <p className="fl-k">Jour</p>
            <div className="chips">{DN.map((n, i) => <button key={n} className="chip" aria-pressed={d === i} disabled={i < TODAY} onClick={() => setD(i)}>{n} {D0 + i}</button>)}</div>
            <p className="fl-k">Créneau</p>
            <div className="chips">
              {(Object.keys(PER) as P[]).map((k) => {
                const t = taken(v, d, k)
                return <button key={k} className="chip" aria-pressed={p === k} disabled={!!t} onClick={() => setP(k)}>{PER[k].n} · {PER[k].t}{t ? ' (pris)' : ''}</button>
              })}
            </div>
            <p className="fl-k">Motif</p>
            <div className="chips">{Object.keys(MOT).map((k) => <button key={k} className="chip" aria-pressed={motif === k} onClick={() => setMotif(k)}>{MOT[k]}</button>)}</div>
            <button
              className="btn"
              disabled={!ok}
              onClick={() => {
                setBk((l) => [...l, { v, d, p, motif, who: 'Camille R.' }])
                setLast(`${V[v].n} · ${DNL[d]} ${D0 + d} · ${PER[p].n.toLowerCase()} (${PER[p].t})`)
              }}
            >Confirmer la réservation</button>
          </>
        )}
      </div>
    </div>
  )
}
