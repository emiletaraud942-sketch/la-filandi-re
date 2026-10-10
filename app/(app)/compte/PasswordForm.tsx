'use client'

import { useState, useTransition } from 'react'
import { useToast } from '@/components/Toast'
import { changePassword } from './actions'

export function PasswordForm() {
  const toast = useToast()
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [pending, start] = useTransition()
  const submit = () =>
    start(async () => {
      const res = await changePassword(pw, pw2)
      if (res.ok) { toast.ok('Mot de passe modifié'); setPw(''); setPw2('') } else toast.err(res.error)
    })
  return (
    <form onSubmit={(e) => { e.preventDefault(); submit() }}>
      <label className="fl">Nouveau mot de passe (10 caractères minimum)<input type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} minLength={10} required /></label>
      <label className="fl">Confirmer<input type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} minLength={10} required /></label>
      <button className="btn" type="submit" disabled={pending || pw.length < 10}>{pending ? 'Enregistrement…' : 'Enregistrer'}</button>
    </form>
  )
}
