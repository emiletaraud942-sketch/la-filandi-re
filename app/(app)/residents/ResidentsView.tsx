'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'
import { useToast } from '@/components/Toast'
import { NOW, hm, type DayEvent, type Floor } from '@/lib/data'
import type { ResidentRoom } from '@/lib/server/data'
import { addEvent, admitResident, deleteEvent, dischargeResident, setAway } from './actions'

type FloorDays = { floor: Floor; rooms: ResidentRoom[] }

const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const DAYS_L = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']
const KIND: Record<DayEvent['k'], string> = { meal: 'Repas', ani: 'Animation', vis: 'Visite', coif: 'Coiffeuse', out: 'Sortie' }
const toMin = (v: string) => { const [h, m] = v.split(':').map(Number); return h * 60 + (m || 0) }

export function ResidentsView({ floors: initial, today, week, canEvents, canResidents }: { floors: FloorDays[]; today: number; week: string[]; canEvents: boolean; canResidents: boolean }) {
  const router = useRouter()
  const toast = useToast()
  const [floors, setFloors] = useState(initial)
  useEffect(() => setFloors(initial), [initial])
  const floorOf = (id: number) => floors.find((x) => x.floor.id === id) ?? floors[0]
  const firstOcc = (id: number) => (floorOf(id).rooms.find((r) => r.state === 'occ') ?? floorOf(id).rooms[0])?.no ?? ''
  const [f, setF] = useState(2)
  const [no, setNo] = useState(firstOcc(2))
  const [d, setD] = useState(today)
  const [form, setForm] = useState<{ kind: DayEvent['k']; label: string; time: string; place: string } | null>(null)
  const [adm, setAdm] = useState({ civ: 'Mme', ini: '' })
  const [, start] = useTransition()
  const rooms = floorOf(f).rooms
  const room = rooms.find((r) => r.no === no) ?? rooms[0]
  if (!room) return <p className="muted">Aucune chambre sur cet étage.</p>
  const ev = room.days[d]
  const c = (k: DayEvent['k']) => ev.filter((e) => e.k === k).length

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, okText: string, onOk?: () => void) =>
    start(async () => {
      const res = await fn()
      if (res.ok) { toast.ok(okText); onOk?.(); router.refresh() } else toast.err(res.error ?? 'Action refusée.')
    })
  const patchRoom = (fn: (r: ResidentRoom) => ResidentRoom) => setFloors((l) => l.map((fl) => ({ ...fl, rooms: fl.rooms.map((r) => (r.no === room.no ? fn(r) : r)) })))

  const toggleAway = () => {
    if (!room.residentId) return
    const away = room.state !== 'out'
    patchRoom((r) => ({ ...r, state: away ? 'out' : 'occ' }))
    run(() => setAway(room.residentId as string, away), away ? `${room.who} est en sortie` : `${room.who} est de retour`)
  }
  const discharge = () => {
    if (!room.residentId || !confirm(`Enregistrer le départ définitif de ${room.who} (chambre ${room.no}) ?`)) return
    run(() => dischargeResident(room.residentId as string), `Chambre ${room.no} libérée`)
  }
  const admit = () => run(() => admitResident(room.roomId as string, adm.civ, adm.ini), `Résident accueilli en chambre ${room.no}`, () => setAdm({ civ: 'Mme', ini: '' }))
  const add = () => {
    if (!form || !room.residentId) return
    const input = { residentId: room.residentId, day: week[d], start: toMin(form.time), label: form.label, place: form.place, kind: form.kind }
    run(() => addEvent(input), 'Ajouté au programme', () => setForm(null))
  }
  const remove = (e: DayEvent) => {
    if (!e.id || !confirm(`Retirer « ${e.label} » de la journée ?`)) return
    patchRoom((r) => ({ ...r, days: r.days.map((list, i) => (i === d ? list.filter((x) => x.id !== e.id) : list)) }))
    run(() => deleteEvent(e.id as string), 'Retiré du programme')
  }

  let nowDone = d !== today
  const items: React.ReactNode[] = []
  ev.forEach((e) => {
    if (!nowDone && e.t >= NOW) { items.push(<li key="now" className="nowline"><span>Maintenant · {hm(NOW)}</span></li>); nowDone = true }
    const past = d === today && e.t < NOW
    items.push(
      <li key={e.id ?? e.t + e.label} className={`ev k-${e.k}${past ? ' past' : ''}`}>
        <time>{hm(e.t)}</time>
        <span className="ev-b"><b>{e.label}</b><span>{e.place}</span></span>
        <span className="pill kp">{KIND[e.k]}</span>
        {canEvents && e.id && e.k !== 'meal' && <button className="del5" onClick={() => remove(e)} aria-label={`Retirer ${e.label}`}>×</button>}
      </li>,
    )
  })
  if (!nowDone) items.push(<li key="now" className="nowline"><span>Maintenant · {hm(NOW)}</span></li>)

  return (
    <div className="a5">
      <aside>
        <p className="k5">Étage</p>
        <div className="chips" role="group" aria-label="Étage">
          {floors.map((x) => (
            <button key={x.floor.id} className="chip" aria-pressed={f === x.floor.id} onClick={() => { setF(x.floor.id); setNo(firstOcc(x.floor.id)); setForm(null) }}>{x.floor.short}</button>
          ))}
        </div>
        <p className="k5">Chambre</p>
        <div className="rps">
          {rooms.map((r) => (
            <button key={r.no} className={`rp${r.state === 'free' ? ' free' : ''}`} aria-pressed={r.no === room.no} onClick={() => { setNo(r.no); setForm(null) }} title={r.state === 'free' ? 'Chambre libre' : undefined}>{r.no}</button>
          ))}
        </div>
      </aside>
      <section className="fiche">
        <header>
          <span className="big disp">{room.no}</span>
          <div>
            <h2 className="disp">{room.who ?? 'Chambre libre'}</h2>
            <p className="muted">{floorOf(room.floor).floor.name}{floorOf(room.floor).floor.note ? ` · ${floorOf(room.floor).floor.note}` : ''}{room.state === 'out' ? ' · en sortie' : ''}</p>
          </div>
        </header>
        {canResidents && room.residentId && (
          <div className="adm5">
            <button className="chip" onClick={toggleAway}>{room.state === 'out' ? 'Marquer de retour' : 'Marquer en sortie'}</button>
            <button className="chip" onClick={discharge}>Départ définitif</button>
          </div>
        )}
        {canResidents && room.state === 'free' && room.roomId && (
          <form className="adm5 in5" onSubmit={(e) => { e.preventDefault(); admit() }}>
            <select value={adm.civ} onChange={(e) => setAdm({ ...adm, civ: e.target.value })} aria-label="Civilité"><option>Mme</option><option>M.</option></select>
            <input value={adm.ini} onChange={(e) => setAdm({ ...adm, ini: e.target.value })} placeholder="Initiales (ex. HM)" maxLength={3} aria-label="Initiales" />
            <button className="btn sm" type="submit" disabled={!adm.ini.trim()}>Accueillir un résident</button>
          </form>
        )}
        {room.state !== 'free' && <p className="sum5">{c('meal')} repas · {c('ani')} animation{c('ani') > 1 ? 's' : ''} · {c('vis')} visite{c('vis') > 1 ? 's' : ''}</p>}
        <p className="k5">Jour</p>
        <div className="chips" role="group" aria-label="Jour">
          {DAYS.map((n, i) => <button key={n} className="chip" aria-pressed={d === i} onClick={() => setD(i)}>{n}{i === today ? ' · auj.' : ''}</button>)}
        </div>
        <h3 className="disp h5">Journée du {DAYS_L[d]}</h3>
        {ev.length ? <ol className="evs">{items}</ol> : <p className="muted">{room.state === 'free' ? 'Aucun résident dans cette chambre : rien à planifier.' : 'Rien de prévu ce jour-là.'}</p>}
        {canEvents && room.residentId && (form ? (
          <form className="new5" onSubmit={(e) => { e.preventDefault(); add() }}>
            <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as DayEvent['k'] })} aria-label="Type"><option value="ani">Animation</option><option value="vis">Visite</option><option value="coif">Coiffeuse</option><option value="out">Sortie</option><option value="meal">Repas</option></select>
            <input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Libellé (ex. Atelier mémoire)" required aria-label="Libellé" />
            <input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} aria-label="Heure" />
            <input value={form.place} onChange={(e) => setForm({ ...form, place: e.target.value })} placeholder="Lieu" aria-label="Lieu" />
            <button className="btn sm" type="submit">Ajouter</button>
            <button className="btn sm ghost" type="button" onClick={() => setForm(null)}>Annuler</button>
          </form>
        ) : <button className="chip add5" onClick={() => setForm({ kind: 'ani', label: '', time: '15:00', place: 'Salon d’animation' })}>+ Ajouter au programme</button>)}
      </section>
    </div>
  )
}
