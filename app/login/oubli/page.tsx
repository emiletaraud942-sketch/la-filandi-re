import Link from 'next/link'
import { requestReset } from '../actions'

export default async function ForgotPage({ searchParams }: { searchParams: Promise<{ envoye?: string }> }) {
  const { envoye } = await searchParams
  return (
    <main className="card">
      <p className="eyebrow">La Filandière</p>
      <h1>Mot de passe oublié</h1>
      {envoye ? (
        <p>Si cette adresse correspond à un compte, un e-mail vient d’être envoyé avec un lien pour choisir un nouveau mot de passe.</p>
      ) : (
        <form action={requestReset}>
          <label htmlFor="email">Adresse e-mail</label>
          <input id="email" name="email" type="email" autoComplete="email" required />
          <button className="btn" type="submit">Envoyer le lien</button>
        </form>
      )}
      <p className="note"><Link href="/login">Retour à la connexion</Link></p>
    </main>
  )
}
