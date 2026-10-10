'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState, useTransition } from 'react'
import { FamilyForm, frDate, frShort, hmin } from '@/components/FamilyForm'
import { useToast } from '@/components/Toast'
import type { Slot, VReq } from '@/lib/demo/visits'
import { decideVisit, openSlots, sendOutbox } from './actions'

const ST = { pending: 'En attente', ok: 'Confirmée', no: 'Refusée' } as const
const STC = { pending: 'wip', ok: 'ok', no: 'late' } as const

type Props = { slots: Slot[]; requests: VReq[] | null; canManage: boolean; unsent: number; mailConfigured: boolean }
type Tab = 'famille' | 'calendrier' | 'accueil'

export function VisitesView({ slots, requests, canManage, unsent, mailConfigured }: Props) {
  const router = useRouter()
  const toast = useToast()
  const [tab, setTab] = useState<Tab>('famille')
  const [reqs, setReqs] = useState(requests ?? [])
  useEffect(() => { setReqs(requests ?? []) }, [requests])
  const [pending, start] = useTransition()

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, okText: string | ((r: never) => string), undo?: () => void) =>
    start(async () => {
      const res = await fn()
      if (res.ok) { toast.ok(typeof okText === 'string' ? okText : okText(res as never)); router.refresh() } else { undo?.(); toast.err(res.error ?? 'Action refusée.') }
    })

  const decide = (r: VReq, st: 'ok' | 'no') => {
    const before = r.st
    setReqs((l) => l.map((x) => (x.id === r.id ? { ...x, st } : x)))
    run(() => decideVisit(r.id, st === 'ok' ? 'confirmed' : 'refused'),
      st === 'ok' ? `Visite confirmée : un e-mail part à ${r.email}` : 'Demande refusée : un e-mail est préparé',
      () => setReqs((l) => l.map((x) => (x.id === r.id ? { ...x, st: before } : x))))
  }
  const tabs: [Tab, string][] = [['famille', 'Formulaire famille'], ['calendrier', 'Calendrier des créneaux'], ...(canManage ? [['accueil', 'File de l’accueil'] as [Tab, string]] : [])]
  const todo = reqs.filter((r) => r.st === 'pending').length
  return (
    <div>
      <div className="chips tabs" role="tablist" aria-label="Vue">
        {tabs.map(([k, l]) => (
          <button key={k} role="tab" className="chip" aria-pressed={tab === k} onClick={() => setTab(k)}>{l}{k === 'accueil' && todo ? ` (${todo})` : ''}</button>
        ))}
        {canManage && <button className="chip" disabled={pending} onClick={() => run(openSlots, (r: { created?: number }) => (r.created ? `${r.created} créneaux ouverts pour 14 jours` : 'Les créneaux sont déjà ouverts'))}>+ Ouvrir les créneaux</button>}
      </div>
      {tab === 'famille' && (
        <>
          <FamilyForm slots={slots} onSent={() => router.refresh()} />
          <p className="muted share">Adresse à donner aux familles : <b>/visite</b> (page sans connexion).</p>
        </>
      )}
      {tab === 'calendrier' && <Calendrier slots={slots} reqs={reqs} canManage={canManage} />}
      {tab === 'accueil' && canManage && (
        <Accueil reqs={reqs} slots={slots} decide={decide} pending={pending} unsent={unsent} mailConfigured={mailConfigured}
          send={() => run(sendOutbox, (r: { sent?: number }) => `${r.sent ?? 0} e-mail${(r.sent ?? 0) > 1 ? 's' : ''} envoyé${(r.sent ?? 0) > 1 ? 's' : ''}`)} />
      )}
    </div>
  )
}

function Calendrier({ slots, reqs, canManage }: { slots: Slot[]; reqs: VReq[]; canManage: boolean }) {
  const days = useMemo(() => [...new Set(slots.map((s) => s.iso))], [slots])
  const starts = useMemo(() => [...new Set(slots.map((s) => s.start))].sort((a, b) => a - b), [slots])
  const [sel, setSel] = useState<string | null>(null)
  const by = new Map(slots.map((s) => [`${s.iso}|${s.start}`, s]))
  const cur = (sel && slots.find((s) => s.id === sel)) || slots[0]
  if (!cur) return <p className="muted empty">Aucun créneau n’est ouvert. {canManage ? 'Utilisez « Ouvrir les créneaux » ci-dessus.' : 'Demandez à l’accueil de les ouvrir.'}</p>
  const level = (s: Slot) => (s.remaining === 0 ? 'late' : s.remaining <= 3 ? 'wip' : 'ok')
  const here = reqs.filter((r) => r.slotId === cur.id)
  const used = cur.capacity - cur.remaining
  return (
    <div>
      <div className="legend" style={{ marginBottom: 12 }}>
        <span><i className="dot st-ok" />Places libres</span><span><i className="dot st-wip" />Presque complet (3 places ou moins)</span><span><i className="dot st-late" />Complet</span>
      </div>
      <div className="calw">
        <div className="scrollx">
          <table className="calt">
            <thead><tr><th />{days.map((d) => <th key={d}>{frShort(d)}</th>)}</tr></thead>
            <tbody>
              {starts.map((t) => (
                <tr key={t}>
                  <th className="hr">{hmin(t)}</th>
                  {days.map((d) => {
                    const s = by.get(`${d}|${t}`)
                    if (!s) return <td key={d} className="cal st-none"><span>—</span></td>
                    return (
                      <td key={d} className={`cal act st-${level(s)}${cur.id === s.id ? ' sel' : ''}`} onClick={() => setSel(s.id)}>
                        <div className="gauge"><i style={{ width: `${(used_(s) / s.capacity) * 100}%` }} /></div>
                        <span>{used_(s)}/{s.capacity}</span>
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
          <h3 className="disp">{frDate(cur.iso)} · {hmin(cur.start)}</h3>
          <div className="big-g">
            <div className="gauge"><i style={{ width: `${(used / cur.capacity) * 100}%` }} /></div>
            <p>{used} personne{used > 1 ? 's' : ''} sur {cur.capacity} · <b>{cur.remaining ? `${cur.remaining} place${cur.remaining > 1 ? 's' : ''} libre${cur.remaining > 1 ? 's' : ''}` : 'complet'}</b></p>
          </div>
          {canManage && (
            <>
              <p className="k5">Demandes sur ce créneau</p>
              {here.length ? here.map((r) => (
                <div key={r.id} className="mini">
                  <span className="dot" style={{ ['--c' as string]: `var(--${r.st === 'ok' ? 'ok' : r.st === 'no' ? 'late' : 'wip'})` }} />
                  <span><b>{r.visitor}</b><small>{r.who} · {r.n} pers. · {ST[r.st].toLowerCase()}</small></span>
                </div>
              )) : <p className="muted">Aucune demande sur ce créneau.</p>}
            </>
          )}
        </aside>
      </div>
      <p className="muted" style={{ fontSize: 12.5, margin: '10px 2px 0' }}>Jauge : {cur.capacity} personnes par créneau dans le salon des familles. Seules les visites confirmées occupent des places.</p>
    </div>
  )
}
const used_ = (s: Slot) => s.capacity - s.remaining

function mail(r: VReq) {
  const name = r.visitor.split(' (')[0]
  const when = r.iso ? `${frDate(r.iso)} à ${hmin(r.start)}` : 'le créneau demandé'
  if (r.st === 'ok') return { subj: `Votre visite du ${frDate(r.iso)} est confirmée`, body: `Bonjour ${name},\n\nNous vous confirmons votre visite le ${when} pour ${r.n} personne${r.n > 1 ? 's' : ''}.\n\nMerci de vous présenter à l’accueil quelques minutes avant, avec cet e-mail. Rappel de la charte : lavage des mains, port du masque si demandé.\n\nL’équipe d’accueil de La Filandière` }
  if (r.st === 'no') return { subj: 'Votre demande de visite : créneau indisponible', body: `Bonjour ${name},\n\nNous ne pouvons pas accepter la visite du ${when}. D’autres horaires sont possibles : n’hésitez pas à refaire une demande sur un autre créneau.\n\nL’équipe d’accueil de La Filandière` }
  return { subj: 'Nous avons bien reçu votre demande de visite', body: `Bonjour ${name},\n\nVotre demande pour le ${when} est en cours d’examen. Vous recevrez une réponse par e-mail sous 24 heures.\n\nL’équipe d’accueil de La Filandière` }
}

function Accueil({ reqs, slots, decide, send, pending, unsent, mailConfigured }: {
  reqs: VReq[]; slots: Slot[]; decide: (r: VReq, st: 'ok' | 'no') => void; send: () => void; pending: boolean; unsent: number; mailConfigured: boolean
}) {
  const [selId, setSelId] = useState<string | null>(null)
  const ordered = useMemo(() => reqs.slice().sort((a, b) => (a.st === 'pending' ? 0 : 1) - (b.st === 'pending' ? 0 : 1) || a.iso.localeCompare(b.iso) || a.start - b.start), [reqs])
  const sel = reqs.find((r) => r.id === selId) ?? ordered[0]
  const cnt = (k: VReq['st']) => reqs.filter((r) => r.st === k).length
  const left = (r: VReq) => slots.find((s) => s.id === r.slotId)?.remaining
  if (!reqs.length) return <p className="muted empty">Aucune demande pour le moment. Les demandes des familles arrivent ici.</p>
  const m = mail(sel)
  return (
    <div>
      <div className="c6-bar">
        <div><b className="disp">{cnt('pending')}</b><span>à traiter</span></div>
        <div><b className="disp" style={{ color: 'var(--ok)' }}>{cnt('ok')}</b><span>confirmées</span></div>
        <div><b className="disp" style={{ color: 'var(--late)' }}>{cnt('no')}</b><span>refusées</span></div>
      </div>
      <div className="c6">
        <div className="rqs">
          {ordered.map((r) => {
            const l = left(r)
            return (
              <div key={r.id} className={`rq act st-${STC[r.st]}${r.id === sel.id ? ' sel' : ''}`} onClick={() => setSelId(r.id)}>
                <div className="rq-t"><b>{r.visitor}</b><span className={`pill st-${STC[r.st]}`}><i className="dot" />{ST[r.st]}</span></div>
                <div className="rq-m">Pour {r.who} · {r.email}</div>
                <div className="rq-m"><b>{frDate(r.iso)} à {hmin(r.start)}</b> · {r.n} pers. · {r.at}{r.st === 'pending' && l !== undefined && l < r.n ? <> · <em className="warn">il ne reste que {l} place{l > 1 ? 's' : ''}</em></> : null}</div>
                <div className="rq-b">
                  <button className="ac ok" disabled={pending || r.st === 'ok'} onClick={(e) => { e.stopPropagation(); decide(r, 'ok') }}>Confirmer</button>
                  <button className="ac no" disabled={pending || r.st === 'no'} onClick={(e) => { e.stopPropagation(); decide(r, 'no') }}>Refuser</button>
                </div>
              </div>
            )
          })}
        </div>
        <aside className="mailp">
          <p className="k5">E-mail pour cette demande</p>
          <div className="mailc">
            <p className="m-h"><span>À</span> {sel.email}</p>
            <p className="m-h"><span>De</span> Accueil La Filandière</p>
            <p className="m-s">{m.subj}</p>
            <pre>{m.body}</pre>
          </div>
          <p className="muted" style={{ fontSize: 12.5, marginTop: 8 }}>Le texte change selon la décision : accusé de réception, confirmation ou refus.</p>
          <div className="outb">
            <span><b>{unsent}</b> e-mail{unsent > 1 ? 's' : ''} en attente d’envoi</span>
            <button className="btn" disabled={pending || !unsent || !mailConfigured} onClick={send}>Envoyer maintenant</button>
          </div>
          {!mailConfigured && <p className="muted" style={{ fontSize: 12.5 }}>Envoi automatique non branché : il faut un fournisseur d’e-mails (variables RESEND_API_KEY et MAIL_FROM). En attendant, les courriers restent en file.</p>}
        </aside>
      </div>
    </div>
  )
}
