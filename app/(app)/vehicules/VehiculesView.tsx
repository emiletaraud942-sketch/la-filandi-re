'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'
import { useToast } from '@/components/Toast'
import type { Booking, Log, P, Vehicle, WeekDay } from '@/lib/demo/vehicles'
import { addLog, cancelBooking, createBooking, saveVehicle, setGarage, type VehicleInput } from './actions'

const DNL = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']
const PER: Record<P, { n: string; t: string }> = { m: { n: 'Matin', t: '08:00–12:00' }, a: { n: 'Après-midi', t: '13:30–17:30' }, j: { n: 'Journée', t: '08:00–17:30' } }
const MOT: Record<string, string> = { sortie: 'Sortie résidents', courses: 'Courses cuisine', navette: 'Navette CHU', tech: 'Intervention technique', form: 'Formation' }
const overlap = (a: P, b: P) => a === 'j' || b === 'j' || a === b
const LK = { trip: 'Trajet', fuel: 'Carburant', maint: 'Entretien' } as const
const fr = (iso: string) => new Date(iso + 'T12:00:00Z').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', timeZone: 'UTC' })
const blank: VehicleInput = { name: '', model: '', plate: '', odometer: 0, nextServiceKm: 10000, ct: '', insurance: '' }

type Props = { vehicles: Vehicle[]; bookings: Booking[]; logs: Log[]; week: WeekDay[]; today: number; me: string; canManage: boolean }

export function VehiculesView({ vehicles, bookings, logs, week, today: TODAY, me, canManage }: Props) {
  const router = useRouter()
  const toast = useToast()
  const [V, setV0] = useState(vehicles)
  const [bk, setBk] = useState(bookings)
  const [lg, setLg] = useState(logs)
  useEffect(() => { setV0(vehicles); setBk(bookings); setLg(logs) }, [vehicles, bookings, logs])
  const [v, setV] = useState(0)
  const [d, setD] = useState(Math.min(TODAY + 1, 6))
  const [p, setP] = useState<P>('m')
  const [motif, setMotif] = useState('sortie')
  const [type, setType] = useState<'trip' | 'fuel' | 'maint'>('trip')
  const [km, setKm] = useState(30)
  const [eur, setEur] = useState(60)
  const [note, setNote] = useState('')
  const [edit, setEdit] = useState<VehicleInput | null>(null)
  const [, start] = useTransition()
  const cur = V[v]

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, okText: string, undo?: () => void, onOk?: () => void) =>
    start(async () => {
      const res = await fn()
      if (res.ok) { toast.ok(okText); onOk?.(); router.refresh() } else { undo?.(); toast.err(res.error ?? 'Action refusée.') }
    })
  const taken = (vid: string, di: number, pi: P) => bk.find((b) => b.v === vid && b.d === di && overlap(b.p, pi))
  const status = (i: number) => {
    const x = V[i]
    if (x.garage) return { c: 'late', l: 'Au garage' }
    if (x.km > x.svc) return { c: 'late', l: 'Entretien dépassé' }
    const b = bk.find((y) => y.v === x.id && y.d === TODAY && (y.p === 'm' || y.p === 'j'))
    if (b) return { c: 'wip', l: `En sortie jusqu’à ${b.p === 'j' ? '17:30' : '12:00'}` }
    return { c: 'ok', l: 'Disponible' }
  }

  const book = () => {
    if (!cur) return
    const mine: Booking = { id: 'tmp' + bk.length, v: cur.id, d, p, motif, who: me, mine: true }
    setBk((l) => [...l, mine])
    run(() => createBooking(cur.id, week[d].iso, p, motif), `${cur.n} réservé : ${DNL[d]} ${week[d].d}, ${PER[p].n.toLowerCase()}`, () => setBk((l) => l.filter((x) => x.id !== mine.id)))
  }
  const cancel = (b: Booking) => {
    if (!confirm('Annuler cette réservation ?')) return
    const snap = bk
    setBk((l) => l.filter((x) => x.id !== b.id))
    run(() => cancelBooking(b.id), 'Réservation annulée', () => setBk(snap))
  }
  const log = () => {
    if (!cur) return
    const label = type === 'maint' ? note : ''
    const entry: Log = { id: 'tmp' + lg.length, v: cur.id, day: new Date().toISOString().slice(0, 10), kind: type, label: label || (type === 'trip' ? 'Trajet' : type === 'fuel' ? 'Plein de carburant' : 'Entretien'), km: type === 'trip' ? km : 0, eur: type === 'fuel' ? eur : 0, who: me }
    setLg((l) => [entry, ...l])
    if (type === 'trip') setV0((l) => l.map((x) => (x.id === cur.id ? { ...x, km: x.km + km } : x)))
    run(() => addLog(cur.id, type, label, km, eur), type === 'trip' ? `${km} km ajoutés au compteur` : 'Enregistré dans le carnet',
      () => { setLg((l) => l.filter((x) => x.id !== entry.id)); if (type === 'trip') setV0((l) => l.map((x) => (x.id === cur.id ? { ...x, km: x.km - km } : x))) },
      () => setNote(''))
  }
  const garage = (x: Vehicle) => {
    setV0((l) => l.map((y) => (y.id === x.id ? { ...y, garage: !x.garage } : y)))
    run(() => setGarage(x.id, !x.garage), x.garage ? `${x.n} remis en service` : `${x.n} au garage`, () => setV0((l) => l.map((y) => (y.id === x.id ? { ...y, garage: x.garage } : y))))
  }
  const submitVehicle = () => { if (edit) { const input = edit; run(() => saveVehicle(input), input.id ? 'Véhicule modifié' : 'Véhicule ajouté', undefined, () => setEdit(null)) } }

  const myLogs = lg.filter((l) => l.v === cur?.id).slice(0, 8)
  const weekBk = bk.filter((b) => b.d >= TODAY).sort((a, b) => a.d - b.d)
  const ok = !!cur && !taken(cur.id, d, p) && !cur.garage
  const num = (s: string) => (s === '' ? 0 : Number(s))

  return (
    <div>
      <div className="g8">
        {V.map((x, i) => {
          const s = status(i), left = x.svc - x.km, pct = Math.max(2, Math.min(100, (1 - left / 10000) * 100))
          return (
            <article key={x.id} className={`vc st-${s.c}${v === i ? ' sel' : ''}`}>
              <header><div><h3>{x.n}</h3><p>{x.model} · {x.plate}</p></div><span className={`pill st-${s.c}`}><i className="dot" />{s.l}</span></header>
              <p className="vk"><b className="disp">{x.km.toLocaleString('fr-FR')}</b> km</p>
              <div className={`bar${left < 0 ? ' bad' : ''}`}><i style={{ width: `${pct}%` }} /></div>
              <p className="vm">{left < 0 ? `Entretien dépassé de ${(-left).toLocaleString('fr-FR')} km` : `Entretien dans ${left.toLocaleString('fr-FR')} km`}</p>
              <p className="vm">Contrôle technique : {x.ct} · Assurance : {x.ass}</p>
              <div className="row8">
                <button className="btn" disabled={x.garage} onClick={() => setV(i)}>{v === i ? 'Sélectionné' : 'Choisir ce véhicule'}</button>
                {canManage && <button className="btn ghost" onClick={() => garage(x)}>{x.garage ? 'Remettre en service' : 'Mettre au garage'}</button>}
                {canManage && <button className="btn ghost" onClick={() => setEdit({ id: x.id, name: x.n, model: x.model, plate: x.plate, odometer: x.km, nextServiceKm: x.svc, ct: x.ctIso ?? '', insurance: x.assIso ?? '' })}>Modifier</button>}
              </div>
            </article>
          )
        })}
      </div>
      {canManage && <p style={{ margin: '12px 0' }}><button className="chip" onClick={() => setEdit(edit ? null : { ...blank })}>+ Ajouter un véhicule</button></p>}
      {edit && (
        <form className="edit8" onSubmit={(e) => { e.preventDefault(); submitVehicle() }}>
          <h3 className="disp">{edit.id ? 'Modifier le véhicule' : 'Nouveau véhicule'}</h3>
          <label>Nom<input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} required /></label>
          <label>Modèle<input value={edit.model} onChange={(e) => setEdit({ ...edit, model: e.target.value })} /></label>
          <label>Plaque<input value={edit.plate} onChange={(e) => setEdit({ ...edit, plate: e.target.value })} required /></label>
          <label>Kilomètres au compteur<input type="number" min={0} value={edit.odometer} onChange={(e) => setEdit({ ...edit, odometer: num(e.target.value) })} /></label>
          <label>Prochain entretien à (km)<input type="number" min={1} value={edit.nextServiceKm} onChange={(e) => setEdit({ ...edit, nextServiceKm: num(e.target.value) })} /></label>
          <label>Contrôle technique<input type="date" value={edit.ct} onChange={(e) => setEdit({ ...edit, ct: e.target.value })} /></label>
          <label>Assurance jusqu’au<input type="date" value={edit.insurance} onChange={(e) => setEdit({ ...edit, insurance: e.target.value })} /></label>
          <div className="row8"><button className="btn" type="submit">Enregistrer</button><button className="btn ghost" type="button" onClick={() => setEdit(null)}>Annuler</button></div>
        </form>
      )}

      {cur && (
        <div className="two8">
          <div className="rf">
            <p className="k5">Réserver · {cur.n}</p>
            <p className="fl-k">Jour</p>
            <div className="chips">{week.map((w, i) => <button key={w.n} className="chip" aria-pressed={d === i} disabled={i < TODAY} onClick={() => setD(i)}>{w.n} {w.d}</button>)}</div>
            <p className="fl-k">Créneau</p>
            <div className="chips">
              {(Object.keys(PER) as P[]).map((k) => {
                const t = taken(cur.id, d, k)
                return <button key={k} className="chip" aria-pressed={p === k} disabled={!!t} onClick={() => setP(k)}>{PER[k].n} · {PER[k].t}{t ? ' (pris)' : ''}</button>
              })}
            </div>
            <p className="fl-k">Motif</p>
            <div className="chips">{Object.keys(MOT).map((k) => <button key={k} className="chip" aria-pressed={motif === k} onClick={() => setMotif(k)}>{MOT[k]}</button>)}</div>
            <button className="btn" style={{ marginTop: 12 }} disabled={!ok} onClick={book}>Confirmer la réservation</button>
          </div>

          <div className="rf">
            <p className="k5">Carnet de bord · {cur.n}</p>
            <div className="chips">{(Object.keys(LK) as (keyof typeof LK)[]).map((k) => <button key={k} className="chip" aria-pressed={type === k} onClick={() => setType(k)}>{LK[k]}</button>)}</div>
            {type === 'trip' && <div className="stp8"><button onClick={() => setKm((x) => Math.max(5, x - 5))} aria-label="Moins de kilomètres">−</button><b className="disp">{km} km</b><button onClick={() => setKm((x) => x + 5)} aria-label="Plus de kilomètres">+</button></div>}
            {type === 'fuel' && <div className="stp8"><button onClick={() => setEur((x) => Math.max(5, x - 5))} aria-label="Moins d’euros">−</button><b className="disp">{eur} €</b><button onClick={() => setEur((x) => x + 5)} aria-label="Plus d’euros">+</button></div>}
            {type === 'maint' && <div className="chips" style={{ marginTop: 10 }}>{['Pneu à contrôler', 'Voyant allumé', 'Lavage', 'Rayure', 'Vidange faite'].map((n) => <button key={n} className="chip" aria-pressed={note === n} onClick={() => setNote(n)}>{n}</button>)}<input className="note8" value={note} onChange={(e) => setNote(e.target.value)} placeholder="ou écrivez une note" /></div>}
            <button className="btn" style={{ marginTop: 12 }} onClick={log} disabled={type === 'maint' && !note.trim()}>Enregistrer</button>
            <ul className="lg8">
              {myLogs.length ? myLogs.map((l) => <li key={l.id}><time>{fr(l.day)}</time><i className={`tg ${l.kind}`} /><span>{l.label} · {l.who}</span><b>{l.km ? `${l.km} km` : l.eur ? `${l.eur} €` : ''}</b></li>) : <li className="muted">Aucune ligne dans le carnet.</li>}
            </ul>
          </div>
        </div>
      )}

      <section className="rf">
        <p className="k5">Réservations à venir</p>
        {weekBk.length ? (
          <ul className="bk8">
            {weekBk.map((b) => (
              <li key={b.id}><b>{V.find((x) => x.id === b.v)?.n ?? '—'}</b><span>{DNL[b.d]} {week[b.d].d} · {PER[b.p].n.toLowerCase()} · {MOT[b.motif] ?? b.motif} · {b.who}</span>
                {(b.mine || canManage) && <button className="x8" onClick={() => cancel(b)}>Annuler</button>}</li>
            ))}
          </ul>
        ) : <p className="muted">Aucune réservation cette semaine.</p>}
      </section>
    </div>
  )
}
