'use client'

import { useState } from 'react'
import { ST_TASK, LBL, hm, counts, roomLabel, type Dot, type Room, type Floor } from '@/lib/data'

type FloorData = { floor: Floor; rooms: Room[] }

function Legend({ c }: { c: ReturnType<typeof counts> }) {
  return (
    <div className="legend">
      {(['ok', 'wip', 'late'] as const).map((k) => (
        <span key={k} className={`st-${k}`}><i className="dot" />{c[k]} {LBL[k].toLowerCase()}</span>
      ))}
      <span className="st-none"><i className="dot" />{c.none} rien en cours</span>
    </div>
  )
}

function Detail({ room }: { room?: Room }) {
  if (!room) return <p className="muted p1-hint">Touchez une chambre pour voir ses tâches de la journée.</p>
  return (
    <section className="p1-detail">
      <header>
        <h3 className="disp">Chambre {room.no}</h3>
        <span className={`pill st-${room.dot}`}><i className="dot" />{roomLabel(room)}</span>
      </header>
      <p className="muted">{room.who ?? 'Chambre libre'}</p>
      <ul className="p1-tasks">
        {room.tasks.length ? room.tasks.map((t) => (
          <li key={t.k}>
            <time>{hm(t.start)}</time><span>{t.label}</span><em>{t.by}</em>
            <span className={`pill st-${t.st}`}><i className="dot" />{ST_TASK[t.st]}</span>
          </li>
        )) : <li className="muted">Aucune tâche prévue aujourd’hui.</li>}
      </ul>
    </section>
  )
}

function Corridor({ title, rooms, sel, onSel }: { title: string; rooms: Room[]; sel: string | null; onSel: (no: string) => void }) {
  return (
    <>
      <h3 className="p1-h disp">{title} <span className="faint">· {rooms.length} chambres</span></h3>
      <div className="rgrid">
        {rooms.map((r) => (
          <button
            key={r.no}
            className={`rc act st-${r.dot as Dot}${r.state === 'free' ? ' free' : ''}${sel === r.no ? ' sel' : ''}`}
            onClick={() => onSel(r.no)}
            aria-label={`Chambre ${r.no}, ${roomLabel(r)}`}
          >
            <span className="rc-top"><span className="disp rc-no">{r.no}</span><i className="dot" /></span>
            <span className="rc-who">{r.who ?? 'Libre'}</span>
            <span className="rc-st">{roomLabel(r)}</span>
          </button>
        ))}
      </div>
    </>
  )
}

export function PlanView({ floors }: { floors: FloorData[] }) {
  const [f, setF] = useState(2)
  const [sel, setSel] = useState<string | null>(() => floors.find((x) => x.floor.id === 2)?.rooms.find((r) => r.dot === 'late')?.no ?? null)
  const d = floors.find((x) => x.floor.id === f) ?? floors[0]
  if (!d) return <p className="muted">Aucun étage n’est encore configuré.</p>
  const c = counts(d)
  const room = d.rooms.find((r) => r.no === sel)
  return (
    <div>
      <div className="p1-sum">
        <div className="chips" role="group" aria-label="Étage">
          {floors.map((x) => (
            <button key={x.floor.id} className="chip" aria-pressed={f === x.floor.id} onClick={() => { setF(x.floor.id); setSel(null) }}>{x.floor.short}</button>
          ))}
        </div>
        <Legend c={c} />
      </div>
      <p className="p1-floor"><b className="disp">{d.floor.name}</b>{d.floor.note ? ` · ${d.floor.note}` : ''} · {d.rooms.length} chambres</p>
      <Detail room={room} />
      <Corridor title="Couloir nord" rooms={d.rooms.filter((r) => r.side === 'N')} sel={sel} onSel={(no) => setSel(sel === no ? null : no)} />
      <Corridor title="Couloir sud" rooms={d.rooms.filter((r) => r.side === 'S')} sel={sel} onSel={(no) => setSel(sel === no ? null : no)} />
    </div>
  )
}
