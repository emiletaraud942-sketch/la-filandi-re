'use client'

import { useState } from 'react'
import { NOW, hm } from '@/lib/data'

const DN = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const DNL = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']
const TODAY = 2, D0 = 12
const SL = [10 * 60, 11 * 60, 14 * 60, 15 * 60, 16 * 60, 17 * 60]
const CAP = 12
const dateOf = (d: number) => `${DNL[d]} ${D0 + d} octobre`
const dateS = (d: number) => `${DN[d]} ${D0 + d}`

// Inscriptions déjà prises par créneau (démo). En production : table des demandes confirmées.
const BASE: number[][] = DN.map((_, d) => SL.map((_, s) => [3, 5, 12, 7, 2, 10, 4, 12, 6, 1, 8, 5, 9, 3, 12, 6, 4, 2, 7, 10, 5, 3, 11, 6, 8, 2, 9, 4, 12, 7, 5, 3, 6, 8, 1, 10, 4, 9, 2, 12, 7, 5][(d * 6 + s) % 42]))

type Req = { id: string; visitor: string; who: string | null; room: string; d: number; s: number; n: number; st: 'pending' | 'ok' | 'no'; at: string }
const SEED: Req[] = [
  { id: 'r0', visitor: 'Mme D. (fille)', who: 'Mme N. A.', room: '203', d: 3, s: 0, n: 2, st: 'pending', at: 'reçue aujourd’hui' },
  { id: 'r1', visitor: 'M. L. (fils)', who: 'M. N. N.', room: '208', d: 4, s: 1, n: 1, st: 'pending', at: 'reçue aujourd’hui' },
  { id: 'r2', visitor: 'Mme R. (petite-fille)', who: 'Mme V. A.', room: '213', d: 5, s: 2, n: 1, st: 'pending', at: 'reçue aujourd’hui' },
  { id: 'r3', visitor: 'M. T. (neveu)', who: 'Mme B. B.', room: '219', d: 6, s: 3, n: 2, st: 'pending', at: 'reçue aujourd’hui' },
  { id: 'r4', visitor: 'Mme S. (amie)', who: 'M. C. D.', room: '224', d: 3, s: 4, n: 1, st: 'ok', at: 'reçue hier' },
  { id: 'r5', visitor: 'M. B. (fils)', who: 'Mme C. F.', room: '101', d: 4, s: 5, n: 2, st: 'ok', at: 'reçue hier' },
  { id: 'r6', visitor: 'Mme G. (fille)', who: 'Mme T. D.', room: '107', d: 5, s: 0, n: 2, st: 'ok', at: 'reçue hier' },
  { id: 'r7', visitor: 'Mme P. (belle-fille)', who: 'Mme T. V.', room: '113', d: 6, s: 1, n: 1, st: 'no', at: 'reçue hier' },
]
const ST = { pending: 'En attente', ok: 'Confirmée', no: 'Refusée' } as const
const STC = { pending: 'wip', ok: 'ok', no: 'late' } as const

export function VisitesView() {
  const [reqs, setReqs] = useState<Req[]>(SEED)
  const [tab, setTab] = useState<'famille' | 'calendrier' | 'accueil'>('famille')
  return (
    <div>
      <div className="chips tabs" role="tablist" aria-label="Vue">
        {([['famille', 'Formulaire famille'], ['calendrier', 'Calendrier des créneaux'], ['accueil', 'File de l’accueil']] as const).map(([k, l]) => (
          <button key={k} role="tab" className="chip" aria-pressed={tab === k} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>
      {tab === 'famille' && <Famille reqs={reqs} setReqs={setReqs} />}
      {tab === 'calendrier' && <Calendrier reqs={reqs} />}
      {tab === 'accueil' && <Accueil reqs={reqs} setReqs={setReqs} />}
    </div>
  )
}

const booked = (reqs: Req[], d: number, s: number) => BASE[d][s] + reqs.filter((r) => r.st === 'ok' && r.d === d && r.s === s).reduce((a, r) => a + r.n, 0)
const left = (reqs: Req[], d: number, s: number) => Math.max(0, CAP - booked(reqs, d, s))
const past = (d: number, s: number) => d < TODAY || (d === TODAY && SL[s] <= NOW)

function Famille({ reqs, setReqs }: { reqs: Req[]; setReqs: (f: (r: Req[]) => Req[]) => void }) {
  const [d, setD] = useState(3)
  const [slot, setSlot] = useState<number | null>(1)
  const [n, setN] = useState(2)
  const [room, setRoom] = useState('Mme H. H.')
  const [email, setEmail] = useState('famille@exemple.fr')
  const [charter, setCharter] = useState(true)
  const [sent, setSent] = useState(false)

  const pickDay = (nd: number, nn = n) => {
    setD(nd)
    if (slot === null || past(nd, slot) || left(reqs, nd, slot) < nn) {
      const i = SL.findIndex((_, i) => !past(nd, i) && left(reqs, nd, i) >= nn)
      setSlot(i < 0 ? null : i)
    }
  }
  const changeN = (v: number) => {
    const nn = Math.max(1, Math.min(2, n + v))
    setN(nn)
    if (slot !== null && left(reqs, d, slot) < nn) setSlot(null)
  }
  const ready = charter && email.includes('@') && slot !== null && !past(d, slot) && left(reqs, d, slot) >= n

  if (sent && slot !== null) {
    return (
      <div className="fam">
        <div className="okmark">✓</div>
        <h2 className="disp">Demande envoyée</h2>
        <p>Votre demande de visite pour le <b>{dateOf(d)} à {hm(SL[slot])}</b> ({n} personne{n > 1 ? 's' : ''}) a bien été reçue.</p>
        <p className="muted">Vous recevrez un e-mail à <b>{email}</b> dès que l’accueil l’aura confirmée, en général sous 24 heures.</p>
        <button className="btn" onClick={() => setSent(false)}>Faire une autre demande</button>
      </div>
    )
  }
  return (
    <div className="fam">
      <h2 className="disp">Rendre visite à un proche</h2>
      <p className="muted">Remplissez ce formulaire. L’accueil vous répond par e-mail pour confirmer l’horaire.</p>
      <label className="fl">Nom du résident<input value={room} onChange={(e) => setRoom(e.target.value)} autoComplete="off" /></label>
      <p className="fl-k">Jour</p>
      <div className="chips">
        {DN.map((x, i) => <button key={x} className="chip" aria-pressed={d === i} disabled={i < TODAY} onClick={() => pickDay(i)}>{dateS(i)}</button>)}
      </div>
      <p className="fl-k">Heure</p>
      <div className="slots">
        {SL.map((t, i) => {
          const l = left(reqs, d, i), off = past(d, i) || l < n
          return (
            <button key={t} className={`slot${off ? ' off' : ''}`} aria-pressed={slot === i} disabled={off} onClick={() => setSlot(i)}>
              <b>{hm(t)}</b><span>{past(d, i) ? 'passé' : l === 0 ? 'complet' : `${l} place${l > 1 ? 's' : ''}`}</span>
            </button>
          )
        })}
      </div>
      <p className="fl-k">Nombre de personnes</p>
      <div className="step">
        <button onClick={() => changeN(-1)} aria-label="Retirer une personne">−</button><b>{n}</b><button onClick={() => changeN(1)} aria-label="Ajouter une personne">+</button>
        <span className="muted">2 visiteurs maximum à la fois</span>
      </div>
      <label className="fl">Votre e-mail<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
      <label className="ck"><input type="checkbox" checked={charter} onChange={(e) => setCharter(e.target.checked)} /> J’ai lu la charte de visite et je m’engage à la respecter.</label>
      <button
        className="btn"
        disabled={!ready}
        onClick={() => {
          if (slot === null) return
          setReqs((r) => [{ id: 'n' + r.length, visitor: 'Mme H. (fille)', who: room, room: '201', d, s: slot, n, st: 'pending', at: 'reçue à l’instant' }, ...r])
          setSent(true)
        }}
      >Demander la visite</button>
    </div>
  )
}

function Calendrier({ reqs }: { reqs: Req[] }) {
  const [sel, setSel] = useState<[number, number]>([3, 1])
  const [bd, bs] = sel
  const vs = reqs.filter((r) => r.d === bd && r.s === bs)
  const l = left(reqs, bd, bs)
  const level = (d: number, s: number) => (past(d, s) ? 'none' : left(reqs, d, s) === 0 ? 'late' : left(reqs, d, s) <= 3 ? 'wip' : 'ok')
  return (
    <div>
      <div className="legend" style={{ marginBottom: 12 }}>
        <span><i className="dot st-ok" />Places libres</span><span><i className="dot st-wip" />Presque complet (3 places ou moins)</span><span><i className="dot st-late" />Complet</span>
      </div>
      <div className="calw">
        <div className="scrollx">
          <table className="calt">
            <thead><tr><th />{DN.map((n, i) => <th key={n} className={i === TODAY ? 'today' : ''}>{dateS(i)}</th>)}</tr></thead>
            <tbody>
              {SL.map((t, s) => (
                <tr key={t}>
                  <th className="hr">{hm(t)}</th>
                  {DN.map((_, d) => {
                    const lv = level(d, s), b = Math.min(booked(reqs, d, s), CAP)
                    return (
                      <td key={d} className={`cal act st-${lv}${bd === d && bs === s ? ' sel' : ''}`} onClick={() => setSel([d, s])}>
                        <div className="gauge"><i style={{ width: `${(b / CAP) * 100}%` }} /></div>
                        <span>{lv === 'none' ? 'passé' : `${b}/${CAP}`}</span>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <aside className="cal-d">
          <p className="k5">Créneau choisi</p>
          <h3 className="disp">{dateOf(bd)} · {hm(SL[bs])}</h3>
          <div className="big-g">
            <div className="gauge"><i style={{ width: `${(Math.min(booked(reqs, bd, bs), CAP) / CAP) * 100}%` }} /></div>
            <p>{booked(reqs, bd, bs)} personne{booked(reqs, bd, bs) > 1 ? 's' : ''} sur {CAP} · <b>{past(bd, bs) ? 'créneau passé' : l ? `${l} place${l > 1 ? 's' : ''} libre${l > 1 ? 's' : ''}` : 'complet'}</b></p>
          </div>
          <p className="k5">Demandes sur ce créneau</p>
          {vs.length ? vs.map((r) => (
            <div key={r.id} className="mini">
              <span className="dot" style={{ ['--c' as string]: `var(--${r.st === 'ok' ? 'ok' : r.st === 'no' ? 'late' : 'wip'})` }} />
              <span><b>{r.visitor}</b><small>Ch. {r.room} · {r.n} pers. · {ST[r.st].toLowerCase()}</small></span>
            </div>
          )) : <p className="muted">Aucune demande en plus des inscriptions déjà prises.</p>}
        </aside>
      </div>
      <p className="muted" style={{ fontSize: 12.5, margin: '10px 2px 0' }}>Jauge fixée par la direction : {CAP} personnes par créneau dans le salon des familles (valeur d’exemple).</p>
    </div>
  )
}

function mail(r: Req) {
  const name = r.visitor.split(' (')[0]
  const link = 'filandiere.example/visite/' + r.id
  const when = `${dateOf(r.d)} à ${hm(SL[r.s])}`
  if (r.st === 'ok') return { subj: `Votre visite du ${dateS(r.d)} est confirmée`, body: `Bonjour ${name},\n\nNous vous confirmons votre visite le ${when} pour ${r.n} personne${r.n > 1 ? 's' : ''}.\n\nMerci de vous présenter à l’accueil quelques minutes avant, avec cet e-mail. Rappel de la charte : lavage des mains, port du masque si demandé.\n\nPour annuler : ${link}\n\nL’équipe d’accueil de La Filandière` }
  if (r.st === 'no') return { subj: 'Votre demande de visite : créneau indisponible', body: `Bonjour ${name},\n\nNous ne pouvons pas accepter la visite du ${when} : le créneau est complet.\n\nD’autres horaires sont possibles le même jour ou le lendemain : ${link}\n\nL’équipe d’accueil de La Filandière` }
  return { subj: 'Nous avons bien reçu votre demande de visite', body: `Bonjour ${name},\n\nVotre demande pour le ${when} est en cours d’examen. Vous recevrez une réponse par e-mail sous 24 heures.\n\nL’équipe d’accueil de La Filandière` }
}

function Accueil({ reqs, setReqs }: { reqs: Req[]; setReqs: (f: (r: Req[]) => Req[]) => void }) {
  const [selId, setSelId] = useState('r0')
  const sel = reqs.find((r) => r.id === selId) ?? reqs[0]
  const m = mail(sel)
  const cnt = (k: Req['st']) => reqs.filter((r) => r.st === k).length
  const set = (id: string, st: Req['st']) => { setReqs((l) => l.map((r) => (r.id === id ? { ...r, st } : r))); setSelId(id) }
  const ordered = reqs.slice().sort((a, b) => (a.st === 'pending' ? 0 : 1) - (b.st === 'pending' ? 0 : 1) || a.d - b.d)
  return (
    <div>
      <div className="c6-bar">
        <div><b className="disp">{cnt('pending')}</b><span>à traiter</span></div>
        <div><b className="disp" style={{ color: 'var(--ok)' }}>{cnt('ok')}</b><span>confirmées</span></div>
        <div><b className="disp" style={{ color: 'var(--late)' }}>{cnt('no')}</b><span>refusées</span></div>
      </div>
      <div className="c6">
        <div className="rqs">
          {ordered.map((r) => (
            <div key={r.id} className={`rq act st-${STC[r.st]}${r.id === sel.id ? ' sel' : ''}`} onClick={() => setSelId(r.id)}>
              <div className="rq-t"><b>{r.visitor}</b><span className={`pill st-${STC[r.st]}`}><i className="dot" />{ST[r.st]}</span></div>
              <div className="rq-m">Pour {r.who} · ch. {r.room}</div>
              <div className="rq-m"><b>{dateOf(r.d)} à {hm(SL[r.s])}</b> · {r.n} pers. · {r.at}{r.st === 'pending' && left(reqs, r.d, r.s) < r.n ? <> · <em className="warn">créneau presque complet</em></> : null}</div>
              <div className="rq-b">
                <button className="ac ok" disabled={r.st === 'ok'} onClick={(e) => { e.stopPropagation(); set(r.id, 'ok') }}>Confirmer</button>
                <button className="ac no" disabled={r.st === 'no'} onClick={(e) => { e.stopPropagation(); set(r.id, 'no') }}>Refuser</button>
              </div>
            </div>
          ))}
        </div>
        <aside className="mailp">
          <p className="k5">E-mail envoyé au visiteur</p>
          <div className="mailc">
            <p className="m-h"><span>À</span> famille.{sel.id}@exemple.fr</p>
            <p className="m-h"><span>De</span> Accueil La Filandière</p>
            <p className="m-s">{m.subj}</p>
            <pre>{m.body}</pre>
          </div>
          <p className="muted" style={{ fontSize: 12.5, marginTop: 8 }}>Le texte change selon la décision : accusé de réception, confirmation ou refus. L’envoi réel sera branché avec Supabase et un fournisseur d’e-mails.</p>
        </aside>
      </div>
    </div>
  )
}
