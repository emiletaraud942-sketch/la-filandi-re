'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'
import { useToast } from '@/components/Toast'
import type { MyClock } from '@/lib/server/data'
import { NOW, hm, type Task } from '@/lib/data'
import { setTaskStatus } from '../taches/actions'
import { clockIn, clockOut } from './actions'

type MyTask = Task & { id: string; who: string | null }
const SHIFT: [number, number] = [6 * 60 + 45, 14 * 60 + 15]
const PAUSE: [number, number] = [10 * 60 + 30, 10 * 60 + 50]

export function SoignantView({ me, tasks, clock }: { me: { name: string; first: string; floor: number }; tasks: MyTask[]; clock: MyClock }) {
  const router = useRouter()
  const toast = useToast()
  const [all, setAll] = useState(tasks)
  useEffect(() => setAll(tasks), [tasks])
  const [present, setPresent] = useState(clock.open)
  const [since, setSince] = useState(clock.since)
  useEffect(() => { setPresent(clock.open); setSince(clock.since) }, [clock])
  const [, start] = useTransition()
  const punch = () => {
    const was = present
    setPresent(!was)
    if (!was) setSince(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' }))
    start(async () => {
      const res = was ? await clockOut() : await clockIn()
      if (res.ok) { toast.ok(was ? 'Départ pointé' : 'Arrivée pointée'); router.refresh() } else { setPresent(was); toast.err(res.error) }
    })
  }
  const mine = all.filter((t) => t.start >= SHIFT[0] && t.start < SHIFT[1]).sort((a, b) => a.start - b.start)
  const done = mine.filter((t) => t.st === 'done')
  const open = mine.filter((t) => t.st !== 'done')
  const pct = mine.length ? Math.round((done.length / mine.length) * 100) : 0
  const [error, setError] = useState<string | null>(null)
  const toggle = (id: string) => {
    const t = all.find((x) => x.id === id)
    if (!t) return
    const before = t.st
    const st = before === 'done' ? (t.end <= NOW ? 'late' : 'todo') : 'done'
    const apply = (v: Task['st']) => setAll((l) => l.map((x) => (x.id !== id ? x : { ...x, st: v })))
    setError(null)
    apply(st)
    setTaskStatus(id, st === 'done' ? 'done' : 'todo').then((res) => {
      if (!res.ok) { apply(before); setError(res.error); toast.err(res.error) } else router.refresh()
    })
  }

  const card = (t: MyTask) => (
    <div key={t.id} className={`t3a st-${t.st}`}>
      <button className="chk act" onClick={() => toggle(t.id)} aria-label={t.st === 'done' ? 'Annuler la validation' : 'Valider la tâche'} />
      <div className="t3a-b"><b>{t.label}</b><span>Chambre {t.room}{t.who ? ` · ${t.who}` : ''}</span></div>
      <time>{hm(t.start)}</time>
    </div>
  )

  return (
    <div>
      <h2 className="p3-hello disp">Bonjour {me.first}</h2>
      <p className="p3-meta">Aide-soignante · {me.floor === 0 ? 'RDC' : `${me.floor}e étage`} · poste du matin {hm(SHIFT[0])}–{hm(SHIFT[1])}</p>
      <div className="p3-cards">
        <div className="p3-card">
          <span className="k">Votre pause</span>
          <span className="v3 disp">{hm(PAUSE[0])}–{hm(PAUSE[1])}</span>
          <span className="s">20 minutes d’affilée, dans {PAUSE[0] - NOW} min</span>
        </div>
        <div className="p3-card">
          <span className="k">Pointage</span>
          <span className="v3 disp">{present ? `Présent depuis ${since ?? ''}` : since ? `Parti (arrivé ${since})` : 'Pas encore pointé'}</span>
          <button className="btn sm" onClick={punch}>{present ? 'Je termine mon service' : 'Je pointe mon arrivée'}</button>
        </div>
        <div className="p3-card">
          <span className="k">Tâches faites</span>
          <span className="v3 disp">{done.length} sur {mine.length}</span>
          <div className="p3-prog"><i style={{ width: `${pct}%` }} /></div>
        </div>
      </div>
      {error && <p role="alert" className="err">{error}</p>}
      <h3 className="p3-h disp">À faire</h3>
      {open.length ? open.map(card) : <p className="muted">Tout est fait, bravo.</p>}
      <h3 className="p3-h disp">Déjà faites</h3>
      {done.map(card)}
    </div>
  )
}
