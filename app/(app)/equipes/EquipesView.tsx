'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'
import { useToast } from '@/components/Toast'
import { SHIFTS, hm, type Staff } from '@/lib/data'
import { setShift } from './actions'

type Role = { k: string; label: string; min: { m: number; s: number; n: number } }
const SH = ['m', 's', 'n'] as const
const SLBL: Record<string, string> = { m: 'Matin', s: 'Soir', n: 'Nuit', off: 'Repos', leave: 'Congé', abs: 'Absent' }
const KINDS: Staff['shift'][] = ['m', 's', 'n', 'off', 'leave', 'abs']

function cover(role: Role, staff: Staff[]) {
  const st = staff.filter((p) => p.role === role.k)
  let miss = 0
  const per = {} as Record<(typeof SH)[number], { n: number; need: number; s: 'ok' | 'late' | 'none' }>
  SH.forEach((k) => {
    const n = st.filter((p) => p.shift === k).length
    const need = role.min[k]
    per[k] = { n, need, s: need === 0 ? (n ? 'ok' : 'none') : n >= need ? 'ok' : 'late' }
    if (need > n) miss += need - n
  })
  return { st, per, miss }
}

export function EquipesView({ staff: initial, roles, day, today, days, canEdit }: { staff: Staff[]; roles: Role[]; day: string; today: string; days: { iso: string; label: string }[]; canEdit: boolean }) {
  const router = useRouter()
  const toast = useToast()
  const [staff, setStaff] = useState(initial)
  useEffect(() => setStaff(initial), [initial])
  const [edit, setEdit] = useState(false)
  const [, start] = useTransition()

  const change = (p: Staff, kind: Staff['shift']) => {
    const before = p.shift
    setStaff((l) => l.map((x) => (x.name === p.name ? { ...x, shift: kind } : x)))
    start(async () => {
      const res = await setShift(p.id ?? p.name, day, kind as 'm' | 's' | 'n' | 'off' | 'leave' | 'abs', p.pause)
      if (res.ok) { toast.ok(`${p.name} : ${SLBL[kind].toLowerCase()}`); router.refresh() } else { setStaff((l) => l.map((x) => (x.name === p.name ? { ...x, shift: before } : x))); toast.err(res.error) }
    })
  }

  const cnt = (k: Staff['shift']) => staff.filter((p) => p.shift === k).length
  const short = roles.filter((r) => cover(r, staff).miss > 0).length
  const clocked = staff.filter((p) => p.shift === 'm' && p.clock).length
  return (
    <div>
      <nav className="days4" aria-label="Jour">
        {days.map((d) => <Link key={d.iso} className="chip" aria-current={d.iso === day} href={d.iso === today ? '/equipes' : `/equipes?jour=${d.iso}`}>{d.iso === today ? 'Aujourd’hui' : d.label}</Link>)}
        {canEdit && <button className="chip" aria-pressed={edit} onClick={() => setEdit(!edit)}>Modifier le planning</button>}
      </nav>
      <div className="p4-top">
        <div className="p4-sum">
          <div><b className="disp">{cnt('m')}</b><span>présents le matin</span></div>
          <div><b className="disp">{cnt('s')}</b><span>présents le soir</span></div>
          <div><b className="disp">{cnt('n')}</b><span>présents la nuit</span></div>
          <div><b className="disp" style={{ color: `var(--${short ? 'late' : 'ok'})` }}>{short}</b><span>poste{short > 1 ? 's' : ''} à renforcer</span></div>
          {day === today && <div><b className="disp">{clocked}</b><span>pointés ce matin</span></div>}
        </div>
        <div className="legend">
          <span className="sh-m"><i className="sw" />Matin {hm(SHIFTS.m.a)}–{hm(SHIFTS.m.b)}</span>
          <span className="sh-s"><i className="sw" />Soir {hm(SHIFTS.s.a)}–{hm(SHIFTS.s.b)}</span>
          <span className="sh-n"><i className="sw" />Nuit 21:00–07:00</span>
        </div>
      </div>
      <div className="p4-grid">
        {roles.map((role) => {
          const c = cover(role, staff)
          return (
            <section key={role.k} className="p4-card">
              <header>
                <h3 className="disp">{role.label}</h3>
                <span className={`pill st-${c.miss ? 'late' : 'ok'}`}><i className="dot" />{c.miss ? `Il manque ${c.miss} personne${c.miss > 1 ? 's' : ''}` : 'Effectif complet'}</span>
              </header>
              <div className="p4-cov">
                {SH.map((k) => (
                  <div key={k} className={`cov st-${c.per[k].s}`}>
                    <span className="k">{SLBL[k]}</span><b>{c.per[k].n}</b>{c.per[k].need ? <small> sur {c.per[k].need}</small> : null}
                  </div>
                ))}
              </div>
              <div className="p4-ppl">
                {c.st.map((p) => edit ? (
                  <label key={p.name} className={`ppl sh-${p.shift} ed4`}>{p.name}
                    <select value={p.shift} onChange={(e) => change(p, e.target.value as Staff['shift'])} aria-label={`Équipe de ${p.name}`}>
                      {KINDS.map((k) => <option key={k} value={k}>{SLBL[k]}</option>)}
                    </select>
                  </label>
                ) : (
                  <span key={p.name} className={`ppl sh-${p.shift}`}>{p.name}<em>{SLBL[p.shift]}{day === today && p.shift === 'm' ? (p.clock ? ` · pointé ${p.clock}` : ' · pas pointé') : ''}</em></span>
                ))}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
