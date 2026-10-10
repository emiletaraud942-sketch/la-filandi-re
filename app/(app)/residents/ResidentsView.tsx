'use client'

import { useState } from 'react'
import { NOW, hm, type DayEvent, type Floor } from '@/lib/data'

type RoomDays = { no: string; floor: number; who: string | null; state: 'free' | 'out' | 'occ'; days: DayEvent[][] }
type FloorDays = { floor: Floor; rooms: RoomDays[] }

const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const DAYS_L = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']
const KIND: Record<DayEvent['k'], string> = { meal: 'Repas', ani: 'Animation', vis: 'Visite', coif: 'Coiffeuse', out: 'Sortie' }

export function ResidentsView({ floors, today }: { floors: FloorDays[]; today: number }) {
  const floorOf = (id: number) => floors.find((x) => x.floor.id === id) ?? floors[0]
  const firstOcc = (id: number) => (floorOf(id).rooms.find((r) => r.state === 'occ') ?? floorOf(id).rooms[0])?.no ?? ''
  const [f, setF] = useState(2)
  const [no, setNo] = useState(firstOcc(2))
  const [d, setD] = useState(today)
  const rooms = floorOf(f).rooms
  const room = rooms.find((r) => r.no === no) ?? rooms[0]
  if (!room) return <p className="muted">Aucune chambre sur cet étage.</p>
  const ev = room.days[d]
  const c = (k: DayEvent['k']) => ev.filter((e) => e.k === k).length

  let nowDone = d !== today
  const items: React.ReactNode[] = []
  ev.forEach((e) => {
    if (!nowDone && e.t >= NOW) { items.push(<li key="now" className="nowline"><span>Maintenant · {hm(NOW)}</span></li>); nowDone = true }
    const past = d === today && e.t < NOW
    items.push(
      <li key={e.t + e.label} className={`ev k-${e.k}${past ? ' past' : ''}`}>
        <time>{hm(e.t)}</time>
        <span className="ev-b"><b>{e.label}</b><span>{e.place}</span></span>
        <span className="pill kp">{KIND[e.k]}</span>
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
            <button key={x.floor.id} className="chip" aria-pressed={f === x.floor.id} onClick={() => { setF(x.floor.id); setNo(firstOcc(x.floor.id)) }}>{x.floor.short}</button>
          ))}
        </div>
        <p className="k5">Chambre</p>
        <div className="rps">
          {rooms.map((r) => (
            <button key={r.no} className={`rp${r.state === 'free' ? ' free' : ''}`} aria-pressed={r.no === room.no} onClick={() => setNo(r.no)} title={r.state === 'free' ? 'Chambre libre' : undefined}>{r.no}</button>
          ))}
        </div>
      </aside>
      <section className="fiche">
        <header>
          <span className="big disp">{room.no}</span>
          <div>
            <h2 className="disp">{room.who ?? 'Chambre libre'}</h2>
            <p className="muted">{floorOf(room.floor).floor.name}{floorOf(room.floor).floor.note ? ` · ${floorOf(room.floor).floor.note}` : ''}</p>
          </div>
        </header>
        {room.state !== 'free' && <p className="sum5">{c('meal')} repas · {c('ani')} animation{c('ani') > 1 ? 's' : ''} · {c('vis')} visite{c('vis') > 1 ? 's' : ''}</p>}
        <p className="k5">Jour</p>
        <div className="chips" role="group" aria-label="Jour">
          {DAYS.map((n, i) => <button key={n} className="chip" aria-pressed={d === i} onClick={() => setD(i)}>{n}{i === today ? ' · auj.' : ''}</button>)}
        </div>
        <h3 className="disp h5">Journée du {DAYS_L[d]}</h3>
        {ev.length ? <ol className="evs">{items}</ol> : <p className="muted">Aucun résident dans cette chambre : rien à planifier.</p>}
      </section>
    </div>
  )
}
