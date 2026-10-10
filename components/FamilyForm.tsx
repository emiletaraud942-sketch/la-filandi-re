'use client'

import { useMemo, useState, useTransition } from 'react'
import { useToast } from '@/components/Toast'
import type { Slot } from '@/lib/demo/visits'
import { submitVisit } from '@/app/(app)/visites/actions'

export const hmin = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
export const frDate = (iso: string) => new Date(iso + 'T12:00:00Z').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })
export const frShort = (iso: string) => new Date(iso + 'T12:00:00Z').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', timeZone: 'UTC' }).replace('.', '')

/** Formulaire de demande de visite, utilisé par la page publique des familles et par l'onglet « Famille ». */
export function FamilyForm({ slots, onSent }: { slots: Slot[]; onSent?: () => void }) {
  const toast = useToast()
  const [pending, start] = useTransition()
  const days = useMemo(() => [...new Set(slots.map((s) => s.iso))], [slots])
  const [day, setDay] = useState<string | null>(null)
  const [slotId, setSlotId] = useState<string | null>(null)
  const [n, setN] = useState(1)
  const [name, setName] = useState('')
  const [resident, setResident] = useState('')
  const [email, setEmail] = useState('')
  const [charter, setCharter] = useState(false)
  const [website, setWebsite] = useState('')
  const [sent, setSent] = useState<{ when: string; n: number; email: string } | null>(null)
  const [err, setErr] = useState('')

  const cur = day ?? days[0] ?? null
  const ofDay = slots.filter((s) => s.iso === cur)
  const picked = slots.find((s) => s.id === slotId) ?? null
  const ready = charter && /^\S+@\S+\.\S+$/.test(email) && name.trim().length >= 2 && resident.trim().length >= 2 && picked && picked.remaining >= n

  const changeN = (v: number) => {
    const nn = Math.max(1, Math.min(2, n + v))
    setN(nn)
    if (picked && picked.remaining < nn) setSlotId(null)
  }
  const send = () => {
    if (!picked) return
    setErr('')
    start(async () => {
      const res = await submitVisit({ slotId: picked.id, name, email, resident, persons: n, charter, website })
      if (res.ok) {
        setSent({ when: `${frDate(picked.iso)} à ${hmin(picked.start)}`, n, email })
        onSent?.()
      } else { setErr(res.error); toast.err(res.error) }
    })
  }

  if (sent) {
    return (
      <div className="fam">
        <div className="okmark">✓</div>
        <h2 className="disp">Demande envoyée</h2>
        <p>Votre demande de visite pour le <b>{sent.when}</b> ({sent.n} personne{sent.n > 1 ? 's' : ''}) a bien été reçue.</p>
        <p className="muted">Vous recevrez un e-mail à <b>{sent.email}</b> dès que l’accueil l’aura confirmée, en général sous 24 heures.</p>
        <button className="btn" onClick={() => { setSent(null); setSlotId(null); setCharter(false) }}>Faire une autre demande</button>
      </div>
    )
  }
  if (!days.length) {
    return (
      <div className="fam">
        <h2 className="disp">Rendre visite à un proche</h2>
        <p className="muted">Aucun créneau n’est ouvert pour le moment. Merci de contacter l’accueil de l’établissement.</p>
      </div>
    )
  }
  return (
    <form className="fam" onSubmit={(e) => { e.preventDefault(); if (ready) send() }}>
      <h2 className="disp">Rendre visite à un proche</h2>
      <p className="muted">Remplissez ce formulaire. L’accueil vous répond par e-mail pour confirmer l’horaire.</p>
      <label className="fl">Nom du résident<input value={resident} onChange={(e) => setResident(e.target.value)} autoComplete="off" maxLength={80} required /></label>
      <label className="fl">Votre nom<input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={80} placeholder="ex. Mme Dupont (fille)" required /></label>
      <p className="fl-k">Jour</p>
      <div className="chips">
        {days.map((d) => <button type="button" key={d} className="chip" aria-pressed={cur === d} onClick={() => { setDay(d); setSlotId(null) }}>{frShort(d)}</button>)}
      </div>
      <p className="fl-k">Heure</p>
      <div className="slots">
        {ofDay.map((s) => {
          const off = s.remaining < n
          return (
            <button type="button" key={s.id} className={`slot${off ? ' off' : ''}`} aria-pressed={slotId === s.id} disabled={off} onClick={() => setSlotId(s.id)}>
              <b>{hmin(s.start)}</b><span>{s.remaining === 0 ? 'complet' : `${s.remaining} place${s.remaining > 1 ? 's' : ''}`}</span>
            </button>
          )
        })}
      </div>
      <p className="fl-k">Nombre de personnes</p>
      <div className="step">
        <button type="button" onClick={() => changeN(-1)} aria-label="Retirer une personne">−</button><b>{n}</b><button type="button" onClick={() => changeN(1)} aria-label="Ajouter une personne">+</button>
        <span className="muted">2 visiteurs maximum à la fois</span>
      </div>
      <label className="fl">Votre e-mail<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" maxLength={120} required /></label>
      <input className="hp" tabIndex={-1} autoComplete="off" aria-hidden="true" name="website" value={website} onChange={(e) => setWebsite(e.target.value)} />
      <label className="ck"><input type="checkbox" checked={charter} onChange={(e) => setCharter(e.target.checked)} /> J’ai lu la charte de visite et je m’engage à la respecter.</label>
      {err && <p className="ferr" role="alert">{err}</p>}
      <button className="btn" type="submit" disabled={!ready || pending}>{pending ? 'Envoi…' : 'Demander la visite'}</button>
    </form>
  )
}
