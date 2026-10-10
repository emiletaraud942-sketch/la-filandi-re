'use client'

import { useState } from 'react'
import { FloorChips } from '@/components/FloorChips'
import { ROLE_LBL, ST_TASK, hm, type Room, type Task, type TaskStatus } from '@/lib/data'

const NEXT: Record<TaskStatus, TaskStatus> = { todo: 'wip', wip: 'done', done: 'todo', late: 'done' }
const FILT: [string, string][] = [['all', 'Tout'], ['late', 'En retard'], ['wip', 'En cours'], ['todo', 'À venir'], ['done', 'Fait']]
const ORDER: Record<TaskStatus, number> = { late: 3, wip: 2, todo: 1, done: 0 }

export function TachesView({ floors }: { floors: Room[][] }) {
  const [data, setData] = useState(floors)
  const [f, setF] = useState(2)
  const [status, setStatus] = useState('all')

  const keep = (t: Task) => status === 'all' || t.st === status
  const cycle = (room: string, k: string) =>
    setData((d) => d.map((rooms, i) => i !== f ? rooms : rooms.map((r) => r.no !== room ? r : { ...r, tasks: r.tasks.map((t) => t.k === k ? { ...t, st: NEXT[t.st] } : t) })))

  const list = data[f].filter((r) => r.tasks.some(keep))
  const n = list.reduce((a, r) => a + r.tasks.filter(keep).length, 0)

  return (
    <div>
      <div className="p2-bar">
        <FloorChips value={f} onChange={setF} />
        <div className="chips" role="group" aria-label="Statut">
          {FILT.map(([k, l]) => <button key={k} className="chip" aria-pressed={status === k} onClick={() => setStatus(k)}>{l}</button>)}
        </div>
      </div>
      <div className="p2-sub"><span className="p2-count">{n} tâches dans {list.length} chambres · touchez un statut pour le faire avancer</span></div>
      {list.length ? (
        <div className="p2-grid">
          {list.map((r) => {
            const items = r.tasks.filter(keep).sort((a, b) => ORDER[b.st] - ORDER[a.st] || a.start - b.start)
            const shown = items.slice(0, 3).sort((a, b) => a.start - b.start)
            const more = items.length - shown.length
            return (
              <section key={r.no} className="p2-room">
                <h4 className="disp">Chambre {r.no}<span>{r.who ?? 'Chambre libre'}</span></h4>
                {shown.map((t) => (
                  <div key={t.k} className="p2-t">
                    <time>{hm(t.start)}</time><span>{t.label}</span>
                    <button className={`pill act st-${t.st}`} onClick={() => cycle(r.no, t.k)} aria-label="Changer le statut"><i className="dot" />{ST_TASK[t.st]}</button>
                    <small>{t.by} · {ROLE_LBL[t.role]} · {hm(t.start)}–{hm(t.end)}</small>
                  </div>
                ))}
                {more > 0 && <p className="p2-more">+ {more} autre{more > 1 ? 's' : ''} tâche{more > 1 ? 's' : ''} plus tard</p>}
              </section>
            )
          })}
        </div>
      ) : <p className="p2-empty">Aucune tâche avec ce statut sur cet étage.</p>}
    </div>
  )
}
