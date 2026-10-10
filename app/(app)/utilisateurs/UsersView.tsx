'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'
import { useToast } from '@/components/Toast'
import { ROLE_LBL } from '@/lib/data'
import type { UsersData } from '@/lib/server/data'
import { linkStaff, setActive, setName, setRole, type Role } from './actions'

const ROLES: [Role, string][] = [
  ['admin', 'Administrateur'], ['direction', 'Direction'], ['cadre', 'Cadre de santé'], ['soignant', 'Soignant'],
  ['animation', 'Animation'], ['accueil', 'Accueil'], ['technique', 'Services techniques'],
]

export function UsersView({ users, freeStaff }: UsersData) {
  const router = useRouter()
  const toast = useToast()
  const [list, setList] = useState(users)
  useEffect(() => { setList(users) }, [users])
  const [, start] = useTransition()
  const [edit, setEdit] = useState<{ id: string; name: string } | null>(null)

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, okText: string, undo?: () => void, after?: () => void) =>
    start(async () => {
      const res = await fn()
      if (res.ok) { toast.ok(okText); after?.(); router.refresh() } else { undo?.(); toast.err(res.error ?? 'Action refusée.') }
    })
  const patch = (id: string, p: Partial<(typeof users)[number]>) => setList((l) => l.map((u) => (u.id === id ? { ...u, ...p } : u)))
  const pending = list.filter((u) => !u.active)

  return (
    <div>
      {pending.length > 0 && <p className="banner">{pending.length} compte{pending.length > 1 ? 's' : ''} en attente d’activation : choisissez le rôle puis cliquez sur « Activer ».</p>}
      <div className="ul">
        {list.map((u) => (
          <article key={u.id} className={`u${u.active ? '' : ' off'}`}>
            <div className="u-h">
              {edit?.id === u.id ? (
                <span className="u-n">
                  <input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} aria-label="Nom" />
                  <button className="btn" onClick={() => run(() => setName(u.id, edit.name), 'Nom modifié', undefined, () => setEdit(null))}>OK</button>
                  <button className="btn ghost" onClick={() => setEdit(null)}>×</button>
                </span>
              ) : (
                <span className="u-n"><b>{u.name}</b>{u.me && <em> (vous)</em>}<button className="lnk" onClick={() => setEdit({ id: u.id, name: u.name })}>renommer</button></span>
              )}
              <span className={`pill st-${u.active ? 'ok' : 'wip'}`}><i className="dot" />{u.active ? 'Actif' : 'En attente'}</span>
            </div>
            <div className="u-f">
              <label>Rôle
                <select value={u.role} disabled={u.me} onChange={(e) => {
                  const before = u.role
                  patch(u.id, { role: e.target.value })
                  run(() => setRole(u.id, e.target.value as Role), 'Rôle modifié', () => patch(u.id, { role: before }))
                }}>
                  {ROLES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select>
              </label>
              <label>Fiche du personnel
                <select value={u.staffId ?? ''} onChange={(e) => {
                  const v = e.target.value || null
                  run(() => linkStaff(u.id, v), v ? 'Fiche reliée' : 'Fiche déliée')
                }}>
                  <option value="">Aucune</option>
                  {u.staffId && <option value={u.staffId}>{u.staffName}</option>}
                  {freeStaff.map((s) => <option key={s.id} value={s.id}>{s.name} · {ROLE_LBL[s.job] ?? s.job}</option>)}
                </select>
              </label>
              <button className={u.active ? 'btn ghost' : 'btn'} disabled={u.me} onClick={() => {
                const next = !u.active
                if (!next && !confirm(`Désactiver le compte de ${u.name} ? Il n’aura plus aucun droit.`)) return
                patch(u.id, { active: next })
                run(() => setActive(u.id, next), next ? 'Compte activé' : 'Compte désactivé', () => patch(u.id, { active: !next }))
              }}>{u.active ? 'Désactiver' : 'Activer'}</button>
            </div>
          </article>
        ))}
      </div>
      <p className="muted" style={{ fontSize: 12.5 }}>Pour ajouter une personne : Supabase → Authentication → Users → « Add user » (e-mail et mot de passe provisoire), puis activez-la ici. Un nouveau compte reste sans droits tant qu’il n’est pas activé.</p>
    </div>
  )
}
