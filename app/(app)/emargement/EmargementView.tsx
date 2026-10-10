'use client'

import { useState } from 'react'

type Sess = { id: string; type: 'form' | 'reun' | 'act'; n: string; when: string; place: string; lead: string; who: { n: string; sub: string }[]; signed: number }
const clock = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
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
  // signatures : nom -> heure. Les premières signatures de la démo sont préremplies.
  const [sig, setSig] = useState<Record<string, Record<string, string>>>(() =>
    Object.fromEntries(sessions.map((s) => [s.id, Object.fromEntries(s.who.slice(0, s.signed).map((p, i) => [p.n, clock(9 * 60 + 52 + i * 2)]))])))
  const [closed, setClosed] = useState<Record<string, boolean>>({})
  const s = sessions.find((x) => x.id === id) ?? sessions[0]
  const sg = sig[s.id], isClosed = closed[s.id]
  const n = s.who.filter((p) => sg[p.n]).length
  return (
    <div>
      <div className="chips" role="group" aria-label="Séance">
        {sessions.map((x) => <button key={x.id} className="chip" aria-pressed={id === x.id} onClick={() => setId(x.id)}>{TYPE[x.type]} · {x.n}</button>)}
      </div>
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
                  {sg[p.n] ? <><Scribble name={p.n} /><time>{sg[p.n]}</time></>
                    : isClosed ? <span className="abs">Absent</span>
                    : <button className="btn" onClick={() => setSig((m) => ({ ...m, [s.id]: { ...m[s.id], [p.n]: now } }))}>{s.type === 'act' ? 'Émarger' : 'Signer'}</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="ff">
          <span><b>{n}</b> sur {s.who.length} {s.type === 'act' ? 'présents' : 'signatures'}</span>
          {isClosed ? <span className="ord">✓ Feuille clôturée à {now}</span> : <button className="btn" onClick={() => setClosed((c) => ({ ...c, [s.id]: true }))}>Clôturer la feuille</button>}
        </div>
      </div>
    </div>
  )
}
