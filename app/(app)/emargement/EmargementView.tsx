'use client'

import { useState, useTransition } from 'react'
import { closeSession, signAttendance } from './actions'

type Sess = { id: string; type: 'form' | 'reun' | 'act'; n: string; when: string; place: string; lead: string; closed: boolean; who: { id: string; n: string; sub: string; at: string | null }[] }
const TYPE = { form: 'Formation', reun: 'Réunion', act: 'Activité résidents' }

function Scribble({ name }: { name: string }) {
  let a = name.split('').reduce((s, c) => s + c.charCodeAt(0), 0)
  const r = () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296 }
  let d = 'M2 16', x = 2
  for (let i = 0; i < 7; i++) { x += 8 + r() * 6; d += ` Q${(x - 4).toFixed(0)} ${(r() * 22 + 2).toFixed(0)} ${x.toFixed(0)} ${(r() * 14 + 6).toFixed(0)}` }
  return <svg className="sg" viewBox="0 0 110 28" aria-hidden="true"><path d={d} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
}

export function EmargementView({ sessions, now }: { sessions: Sess[]; now: string }) {
  const [id, setId] = useState(sessions[0].id)
  // signatures : identifiant de la ligne -> heure.
  const [sig, setSig] = useState<Record<string, Record<string, string>>>(() =>
    Object.fromEntries(sessions.map((x) => [x.id, Object.fromEntries(x.who.filter((p) => p.at).map((p) => [p.id, p.at as string]))])))
  const [closed, setClosed] = useState<Record<string, boolean>>(() => Object.fromEntries(sessions.map((x) => [x.id, x.closed])))
  const [error, setError] = useState<string | null>(null)
  const [, start] = useTransition()
  const s = sessions.find((x) => x.id === id) ?? sessions[0]
  const sg = sig[s.id], isClosed = closed[s.id]
  const n = s.who.filter((p) => sg[p.id]).length
  return (
    <div>
      <div className="chips" role="group" aria-label="Séance">
        {sessions.map((x) => <button key={x.id} className="chip" aria-pressed={id === x.id} onClick={() => setId(x.id)}>{TYPE[x.type]} · {x.n}</button>)}
      </div>
      {error && <p role="alert" className="err">{error}</p>}
      <div className="feuille">
        <div className="fh">
          <span className="k5">Feuille d’émargement · {TYPE[s.type]}</span>
          <h2 className="disp">{s.n}</h2>
          <p>{s.when}<br />{s.place} · {s.lead}</p>
        </div>
        <table className="em">
          <thead><tr><th>N°</th><th>{s.type === 'act' ? 'Résident' : 'Nom'}</th><th>{s.type === 'act' ? 'Présence' : 'Signature'}</th></tr></thead>
          <tbody>
            {s.who.map((p, i) => (
              <tr key={p.n}>
                <td className="no">{i + 1}</td>
                <td><b>{p.n}</b><small>{p.sub}</small></td>
                <td className="sgc">
                  {sg[p.id] ? <><Scribble name={p.n} /><time>{sg[p.id]}</time></>
                    : isClosed ? <span className="abs">Absent</span>
                    : <button className="btn" onClick={() => {
                        setError(null)
                        setSig((m) => ({ ...m, [s.id]: { ...m[s.id], [p.id]: now } }))
                        start(async () => {
                          const res = await signAttendance(p.id)
                          if (!res.ok) { setSig((m) => { const c = { ...m[s.id] }; delete c[p.id]; return { ...m, [s.id]: c } }); setError(res.error) }
                        })
                      }}>{s.type === 'act' ? 'Émarger' : 'Signer'}</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="ff">
          <span><b>{n}</b> sur {s.who.length} {s.type === 'act' ? 'présents' : 'signatures'}</span>
          {isClosed ? <span className="ord">✓ Feuille clôturée à {now}</span> : <button className="btn" onClick={() => {
            setError(null)
            setClosed((c) => ({ ...c, [s.id]: true }))
            start(async () => {
              const res = await closeSession(s.id)
              if (!res.ok) { setClosed((c) => ({ ...c, [s.id]: false })); setError(res.error) }
            })
          }}>Clôturer la feuille</button>}
        </div>
      </div>
    </div>
  )
}
