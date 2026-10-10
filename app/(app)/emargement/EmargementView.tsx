'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState, useTransition } from 'react'
import { useToast } from '@/components/Toast'
import type { SessionSheet, SessionsData } from '@/lib/server/data'
import type { Staff } from '@/lib/data'
import { ROLE_LBL } from '@/lib/data'
import { closeSession, createSession, deleteSession, markAttendance, type Mark } from './actions'

const TYPE = { form: 'Formation', reun: 'Réunion', act: 'Activité résidents' }
const KINDS = { form: 'formation', reun: 'reunion', act: 'activite' } as const
const SH = { m: 'Matin', s: 'Soir', n: 'Nuit' } as const
type Cell = { st: Mark; at: string | null }
type Props = SessionsData & { days: { iso: string; label: string }[]; staff: Staff[] }

function Scribble({ name }: { name: string }) {
  let a = name.split('').reduce((s, c) => s + c.charCodeAt(0), 0)
  const r = () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296 }
  let d = 'M2 16', x = 2
  for (let i = 0; i < 7; i++) { x += 8 + r() * 6; d += ` Q${(x - 4).toFixed(0)} ${(r() * 22 + 2).toFixed(0)} ${x.toFixed(0)} ${(r() * 14 + 6).toFixed(0)}` }
  return <svg className="sg" viewBox="0 0 110 28" aria-hidden="true"><path d={d} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
}

export function EmargementView({ sessions, now, day, today, canManage, people, days, staff }: Props) {
  const router = useRouter()
  const toast = useToast()
  const [tab, setTab] = useState<'feuilles' | 'pointage'>('feuilles')
  const [id, setId] = useState<string | null>(sessions[0]?.id ?? null)
  const [creating, setCreating] = useState(false)
  const [marks, setMarks] = useState<Record<string, Cell>>({})
  const [closed, setClosed] = useState<Record<string, boolean>>({})
  const [, start] = useTransition()
  useEffect(() => {
    setMarks(Object.fromEntries(sessions.flatMap((s) => s.who.map((p) => [p.id, { st: p.st, at: p.at }]))))
    setClosed(Object.fromEntries(sessions.map((s) => [s.id, s.closed])))
  }, [sessions])
  const s = sessions.find((x) => x.id === id) ?? sessions[0]

  const act = (fn: () => Promise<{ ok: boolean; error?: string }>, okText: string, undo?: () => void, after?: () => void) =>
    start(async () => {
      const res = await fn()
      if (res.ok) { if (okText) toast.ok(okText); after?.(); router.refresh() } else { undo?.(); toast.err(res.error ?? 'Action refusée.') }
    })
  const mark = (attId: string, st: Mark) => {
    const before = marks[attId]
    setMarks((m) => ({ ...m, [attId]: { st, at: st === 'present' ? now : null } }))
    act(() => markAttendance(attId, st), st === 'present' ? 'Signature enregistrée' : st === 'absent' ? 'Absence notée' : st === 'excused' ? 'Excusé' : 'Annulé', () => setMarks((m) => ({ ...m, [attId]: before })))
  }
  const close = (x: SessionSheet) => {
    const missing = x.who.filter((p) => !marks[p.id]?.st).length
    if (!confirm(missing ? `${missing} personne(s) n’ont pas signé : elles seront notées absentes. Clôturer la feuille ?` : 'Clôturer la feuille ? Elle ne pourra plus être modifiée.')) return
    setClosed((c) => ({ ...c, [x.id]: true }))
    act(() => closeSession(x.id), 'Feuille clôturée', () => setClosed((c) => ({ ...c, [x.id]: false })))
  }
  const remove = (x: SessionSheet) => {
    if (!confirm(`Supprimer la séance « ${x.n} » et sa liste ?`)) return
    act(() => deleteSession(x.id), 'Séance supprimée', undefined, () => setId(null))
  }

  return (
    <div>
      <div className="chips tabs" role="tablist" aria-label="Vue">
        <button role="tab" className="chip" aria-pressed={tab === 'feuilles'} onClick={() => setTab('feuilles')}>Feuilles de présence</button>
        <button role="tab" className="chip" aria-pressed={tab === 'pointage'} onClick={() => setTab('pointage')}>Pointage du personnel</button>
      </div>
      {tab === 'pointage' && <Pointage staff={staff} />}
      {tab === 'feuilles' && (
        <>
          <div className="chips" role="group" aria-label="Jour">
            {days.map((d) => <Link key={d.iso} href={d.iso === today ? '/emargement' : `/emargement?jour=${d.iso}`} className="chip" aria-pressed={d.iso === day} scroll={false}>{d.iso === today ? 'Aujourd’hui' : d.label}</Link>)}
          </div>
          {sessions.length > 0 && (
            <div className="chips" role="group" aria-label="Séance" style={{ marginTop: 8 }}>
              {sessions.map((x) => <button key={x.id} className="chip" aria-pressed={s?.id === x.id && !creating} onClick={() => { setId(x.id); setCreating(false) }}>{TYPE[x.type]} · {x.n}</button>)}
            </div>
          )}
          {canManage && !creating && <p style={{ margin: '10px 0 0' }}><button className="btn" onClick={() => setCreating(true)}>+ Nouvelle séance</button></p>}
          {creating && people && (
            <NewSession day={day} people={people} onCancel={() => setCreating(false)}
              onCreate={(input) => act(() => createSession(input), 'Séance créée', undefined, () => setCreating(false))} />
          )}
          {!creating && !s && <p className="muted empty">Aucune séance ce jour-là.{canManage ? ' Utilisez « Nouvelle séance » pour en créer une.' : ''}</p>}
          {!creating && s && (
            <div className="feuille">
              <div className="fh">
                <span className="k5">Feuille d’émargement · {TYPE[s.type]}</span>
                <h2 className="disp">{s.n}</h2>
                <p>{s.when}<br />{[s.place, s.lead].filter(Boolean).join(' · ')}</p>
              </div>
              <table className="em">
                <thead><tr><th>N°</th><th>{s.type === 'act' ? 'Résident' : 'Nom'}</th><th>{s.type === 'act' ? 'Présence' : 'Signature'}</th></tr></thead>
                <tbody>
                  {s.who.map((p, i) => {
                    const c = marks[p.id] ?? { st: p.st, at: p.at }
                    const isClosed = closed[s.id] ?? s.closed
                    return (
                      <tr key={p.id}>
                        <td className="no">{i + 1}</td>
                        <td><b>{p.n}</b><small>{p.sub}</small></td>
                        <td className="sgc">
                          {c.st === 'present' ? <><Scribble name={p.n} /><time>{c.at}</time>{canManage && !isClosed && <button className="lnk" onClick={() => mark(p.id, null)}>annuler</button>}</>
                            : c.st === 'absent' || c.st === 'excused' ? <><span className="abs">{c.st === 'absent' ? 'Absent' : 'Excusé'}</span>{canManage && !isClosed && <button className="lnk" onClick={() => mark(p.id, null)}>annuler</button>}</>
                            : isClosed ? <span className="abs">Absent</span>
                            : canManage ? <span className="acts"><button className="btn" onClick={() => mark(p.id, 'present')}>{s.type === 'act' ? 'Présent' : 'Signer'}</button><button className="btn ghost" onClick={() => mark(p.id, 'absent')}>Absent</button><button className="btn ghost" onClick={() => mark(p.id, 'excused')}>Excusé</button></span>
                            : p.mine ? <button className="btn" onClick={() => mark(p.id, 'present')}>Signer</button>
                            : <span className="muted">En attente</span>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              <div className="ff">
                <span><b>{s.who.filter((p) => (marks[p.id]?.st ?? p.st) === 'present').length}</b> sur {s.who.length} {s.type === 'act' ? 'présents' : 'signatures'}</span>
                {(closed[s.id] ?? s.closed) ? <span className="ord">✓ Feuille clôturée{s.closedAt ? ` à ${s.closedAt}` : ''}</span>
                  : canManage ? <span className="acts"><button className="btn ghost" onClick={() => remove(s)}>Supprimer</button><button className="btn" onClick={() => close(s)}>Clôturer la feuille</button></span> : null}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function Pointage({ staff }: { staff: Staff[] }) {
  const groups = (['m', 's', 'n'] as const).map((k) => ({ k, list: staff.filter((p) => p.shift === k) })).filter((g) => g.list.length)
  if (!groups.length) return <p className="muted empty">Aucun planning n’est saisi pour aujourd’hui.</p>
  return (
    <div className="ptg">
      {groups.map((g) => {
        const here = g.list.filter((p) => p.clock).length
        return (
          <section key={g.k} className="ptc">
            <header><h3 className="disp">Équipe {SH[g.k].toLowerCase()}</h3><span>{here} pointé{here > 1 ? 's' : ''} sur {g.list.length}</span></header>
            {g.list.map((p) => (
              <div key={p.id ?? p.name} className="ptr">
                <span><i className={`dot st-${p.clock ? 'ok' : 'late'}`} /><b>{p.name}</b><small>{ROLE_LBL[p.role] ?? p.role}</small></span>
                <span className={p.clock ? '' : 'abs'}>{p.clock ? `Arrivé à ${p.clock}` : 'Pas encore pointé'}</span>
              </div>
            ))}
          </section>
        )
      })}
      <p className="muted" style={{ fontSize: 12.5, margin: '6px 2px 0' }}>Chacun pointe depuis son espace soignant. Les heures viennent de la base.</p>
    </div>
  )
}

type Input = Parameters<typeof createSession>[0]
function NewSession({ day, people, onCreate, onCancel }: { day: string; people: NonNullable<SessionsData['people']>; onCreate: (i: Input) => void; onCancel: () => void }) {
  const [type, setType] = useState<'form' | 'reun' | 'act'>('reun')
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(day)
  const [from, setFrom] = useState('14:00')
  const [to, setTo] = useState('15:00')
  const [place, setPlace] = useState('')
  const [lead, setLead] = useState('')
  const [sel, setSel] = useState<Set<string>>(new Set())
  const items = useMemo(() => type === 'act'
    ? people.residents.map((r) => ({ id: r.id, label: `${r.name} · ch. ${r.room}`, group: r.floor === 0 ? 'RDC' : `${r.floor}e étage` }))
    : people.staff.map((p) => ({ id: p.id, label: p.name, group: ROLE_LBL[p.job] ?? p.job })), [type, people])
  const groups = [...new Set(items.map((i) => i.group))]
  const toggle = (ids: string[], on: boolean) => setSel((s) => { const n = new Set(s); ids.forEach((i) => (on ? n.add(i) : n.delete(i))); return n })
  const mins = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }
  const submit = () => onCreate({
    kind: KINDS[type], title, day: date, start: mins(from), end: mins(to), place, lead,
    staffIds: type === 'act' ? [] : [...sel], residentIds: type === 'act' ? [...sel] : [],
  })
  return (
    <form className="feuille newf" onSubmit={(e) => { e.preventDefault(); submit() }}>
      <h2 className="disp">Nouvelle séance</h2>
      <div className="chips" role="group" aria-label="Type">
        {(Object.keys(TYPE) as (keyof typeof TYPE)[]).map((k) => <button type="button" key={k} className="chip" aria-pressed={type === k} onClick={() => { setType(k); setSel(new Set()) }}>{TYPE[k]}</button>)}
      </div>
      <div className="g2">
        <label className="fl">Titre<input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="ex. Gestes et postures" required /></label>
        <label className="fl">Date<input type="date" value={date} onChange={(e) => setDate(e.target.value)} required /></label>
        <label className="fl">Début<input type="time" value={from} onChange={(e) => setFrom(e.target.value)} required /></label>
        <label className="fl">Fin<input type="time" value={to} onChange={(e) => setTo(e.target.value)} required /></label>
        <label className="fl">Lieu<input value={place} onChange={(e) => setPlace(e.target.value)} placeholder="Salle de réunion" /></label>
        <label className="fl">Animée par<input value={lead} onChange={(e) => setLead(e.target.value)} placeholder="Cadre de santé" /></label>
      </div>
      <p className="fl-k">Participants ({sel.size})</p>
      <div className="chips">
        <button type="button" className="chip" onClick={() => toggle(items.map((i) => i.id), true)}>Tout le monde</button>
        <button type="button" className="chip" onClick={() => setSel(new Set())}>Personne</button>
        {groups.map((g) => {
          const ids = items.filter((i) => i.group === g).map((i) => i.id)
          return <button type="button" key={g} className="chip" aria-pressed={ids.every((i) => sel.has(i))} onClick={() => toggle(ids, !ids.every((i) => sel.has(i)))}>{g}</button>
        })}
      </div>
      <div className="pick">
        {items.map((i) => (
          <label key={i.id} className="ck"><input type="checkbox" checked={sel.has(i.id)} onChange={(e) => toggle([i.id], e.target.checked)} /> {i.label} <small>{i.group}</small></label>
        ))}
      </div>
      <div className="ff"><button type="button" className="btn ghost" onClick={onCancel}>Annuler</button><button className="btn" type="submit" disabled={!sel.size || title.trim().length < 2}>Créer la séance</button></div>
    </form>
  )
}
