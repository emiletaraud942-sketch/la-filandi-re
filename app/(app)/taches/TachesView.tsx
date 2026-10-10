'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'
import { useToast } from '@/components/Toast'
import { ROLE_LBL, ST_TASK, hm, type Room, type Task, type TaskStatus } from '@/lib/data'
import type { TaskAdmin } from '@/lib/server/data'
import { assignTask, createTask, deleteTask, generateTodayTasks, setTaskStatus } from './actions'

type FloorRooms = { id: number; short: string; rooms: Room[] }
const NEXT: Record<TaskStatus, TaskStatus> = { todo: 'wip', wip: 'done', done: 'todo', late: 'done' }
const FILT: [string, string][] = [['all', 'Tout'], ['late', 'En retard'], ['wip', 'En cours'], ['todo', 'À venir'], ['done', 'Fait']]
const ORDER: Record<TaskStatus, number> = { late: 3, wip: 2, todo: 1, done: 0 }
const toMin = (v: string) => { const [h, m] = v.split(':').map(Number); return h * 60 + (m || 0) }
const toTime = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`

export function TachesView({ floors, admin }: { floors: FloorRooms[]; admin: TaskAdmin | null }) {
  const router = useRouter()
  const toast = useToast()
  const [data, setData] = useState(floors)
  useEffect(() => setData(floors), [floors])
  const [f, setF] = useState(floors.find((x) => x.id === 2)?.id ?? floors[0]?.id ?? 0)
  const [status, setStatus] = useState('all')
  const [manage, setManage] = useState(false)
  const [form, setForm] = useState<{ roomId: string; typeCode: string; label: string; start: string; end: string; staff: string } | null>(null)
  const [, start] = useTransition()

  const keep = (t: Task) => status === 'all' || t.st === status
  const mapRoom = (room: string, fn: (r: Room) => Room) =>
    setData((d) => d.map((fl) => ({ ...fl, rooms: fl.rooms.map((r) => (r.no === room ? fn(r) : r)) })))
  const patch = (room: string, k: string, fn: (t: Task) => Task) => mapRoom(room, (r) => ({ ...r, tasks: r.tasks.map((t) => (t.k === k ? fn(t) : t)) }))

  const cycle = (room: string, t: Task) => {
    const next = NEXT[t.st]
    patch(room, t.k, (x) => ({ ...x, st: next }))
    start(async () => {
      const res = await setTaskStatus(t.k, next === 'late' ? 'todo' : next)
      if (res.ok) router.refresh(); else { patch(room, t.k, (x) => ({ ...x, st: t.st })); toast.err(res.error) }
    })
  }
  const reassign = (room: string, t: Task, staffId: string) => {
    const who = admin?.staff.find((s) => s.id === staffId)
    const before = { by: t.by, byId: t.byId }
    patch(room, t.k, (x) => ({ ...x, by: who?.name ?? 'Non attribuée', byId: staffId || undefined }))
    start(async () => {
      const res = await assignTask(t.k, staffId || null)
      if (res.ok) { toast.ok('Tâche réattribuée'); router.refresh() } else { patch(room, t.k, (x) => ({ ...x, ...before })); toast.err(res.error) }
    })
  }
  const remove = (room: string, t: Task) => {
    if (!confirm(`Supprimer la tâche « ${t.label} » de la chambre ${room} ?`)) return
    const snapshot = data
    mapRoom(room, (r) => ({ ...r, tasks: r.tasks.filter((x) => x.k !== t.k) }))
    start(async () => {
      const res = await deleteTask(t.k)
      if (res.ok) { toast.ok('Tâche supprimée'); router.refresh() } else { setData(snapshot); toast.err(res.error) }
    })
  }
  const add = () => {
    if (!form || !admin) return
    const room = admin.rooms.find((r) => r.id === form.roomId)
    if (!room) return toast.err('Choisissez une chambre.')
    const input = { roomId: form.roomId, typeCode: form.typeCode || null, label: form.label || admin.types.find((t) => t.code === form.typeCode)?.label || '', start: toMin(form.start), end: toMin(form.end), assignedTo: form.staff || null }
    start(async () => {
      const res = await createTask(input)
      if (res.ok) { toast.ok(`Tâche ajoutée en chambre ${room.no}`); setForm(null); router.refresh() } else toast.err(res.error)
    })
  }
  const generate = () => start(async () => {
    const res = await generateTodayTasks()
    if (res.ok) { toast.ok(res.created ? `${res.created} tâches générées pour aujourd’hui` : 'Les tâches du jour existent déjà'); router.refresh() } else toast.err(res.error)
  })

  const cur = data.find((x) => x.id === f)
  const list = (cur?.rooms ?? []).filter((r) => r.tasks.some(keep))
  const n = list.reduce((a, r) => a + r.tasks.filter(keep).length, 0)

  return (
    <div>
      <div className="p2-bar">
        <div className="chips" role="group" aria-label="Étage">
          {data.map((x) => <button key={x.id} className="chip" aria-pressed={f === x.id} onClick={() => setF(x.id)}>{x.short}</button>)}
        </div>
        <div className="chips" role="group" aria-label="Statut">
          {FILT.map(([k, l]) => <button key={k} className="chip" aria-pressed={status === k} onClick={() => setStatus(k)}>{l}</button>)}
        </div>
      </div>
      {admin && (
        <div className="adm2">
          <button className="chip" aria-pressed={manage} onClick={() => setManage(!manage)}>Gérer les tâches</button>
          {manage && (
            <>
              <button className="chip" onClick={() => setForm(form ? null : { roomId: admin.rooms.find((r) => r.floor === f)?.id ?? '', typeCode: '', label: '', start: '09:00', end: '09:30', staff: '' })}>+ Ajouter une tâche</button>
              <button className="chip" onClick={generate}>Générer les tâches du jour</button>
            </>
          )}
        </div>
      )}
      {admin && manage && form && (
        <form className="new2" onSubmit={(e) => { e.preventDefault(); add() }}>
          <label>Chambre<select value={form.roomId} onChange={(e) => setForm({ ...form, roomId: e.target.value })}>{admin.rooms.map((r) => <option key={r.id} value={r.id}>{r.no}</option>)}</select></label>
          <label>Type<select value={form.typeCode} onChange={(e) => {
            const t = admin.types.find((x) => x.code === e.target.value)
            setForm({ ...form, typeCode: e.target.value, label: t ? t.label : form.label, start: t ? toTime(t.start) : form.start, end: t ? toTime(t.start + t.duration) : form.end })
          }}><option value="">Autre</option>{admin.types.map((t) => <option key={t.code} value={t.code}>{t.label}</option>)}</select></label>
          <label className="w">Libellé<input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Ex. Changer l’ampoule" /></label>
          <label>De<input type="time" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} /></label>
          <label>À<input type="time" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} /></label>
          <label>Attribuée à<select value={form.staff} onChange={(e) => setForm({ ...form, staff: e.target.value })}><option value="">Personne</option>{admin.staff.map((s) => <option key={s.id} value={s.id}>{s.name} · {ROLE_LBL[s.job] ?? s.job}</option>)}</select></label>
          <div className="act2"><button className="btn" type="submit">Ajouter</button><button className="btn ghost" type="button" onClick={() => setForm(null)}>Annuler</button></div>
        </form>
      )}
      <div className="p2-sub"><span className="p2-count">{n} tâches dans {list.length} chambres · touchez un statut pour le faire avancer</span></div>
      {list.length ? (
        <div className="p2-grid">
          {list.map((r) => {
            const items = r.tasks.filter(keep).sort((a, b) => ORDER[b.st] - ORDER[a.st] || a.start - b.start)
            const shown = manage ? items.sort((a, b) => a.start - b.start) : items.slice(0, 3).sort((a, b) => a.start - b.start)
            const more = items.length - shown.length
            return (
              <section key={r.no} className="p2-room">
                <h4 className="disp">Chambre {r.no}<span>{r.who ?? 'Chambre libre'}</span></h4>
                {shown.map((t) => (
                  <div key={t.k} className="p2-t">
                    <time>{hm(t.start)}</time><span>{t.label}</span>
                    <button className={`pill act st-${t.st}`} onClick={() => cycle(r.no, t)} aria-label="Changer le statut"><i className="dot" />{ST_TASK[t.st]}</button>
                    <small>{t.by}{ROLE_LBL[t.role] ? ` · ${ROLE_LBL[t.role]}` : ''} · {hm(t.start)}–{hm(t.end)}</small>
                    {admin && manage && (
                      <div className="ctl2">
                        <select value={t.byId ?? admin.staff.find((s) => s.name === t.by)?.id ?? ''} onChange={(e) => reassign(r.no, t, e.target.value)} aria-label="Attribuer à">
                          <option value="">Personne</option>
                          {admin.staff.map((s) => <option key={s.id} value={s.id}>{s.name} · {ROLE_LBL[s.job] ?? s.job}</option>)}
                        </select>
                        <button className="x2" onClick={() => remove(r.no, t)} aria-label="Supprimer la tâche">Supprimer</button>
                      </div>
                    )}
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
