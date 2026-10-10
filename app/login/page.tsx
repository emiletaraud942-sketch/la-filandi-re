import Link from 'next/link'
import { signIn } from './actions'

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ erreur?: string }> }) {
  const { erreur } = await searchParams
  return (
    <main className="card">
      <p className="eyebrow">La Filandière</p>
      <h1>Connexion</h1>
      <form action={signIn}>
        <label htmlFor="email">Adresse e-mail</label>
        <input id="email" name="email" type="email" autoComplete="email" required />
        <label htmlFor="password">Mot de passe</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required />
        {erreur && <p className="err">{erreur === 'lien' ? 'Ce lien n’est plus valide. Demandez-en un nouveau.' : 'Identifiants incorrects.'}</p>}
        <button className="btn" type="submit">Se connecter</button>
      </form>
      <p className="note"><Link href="/login/oubli">Mot de passe oublié ?</Link></p>
      <p className="note" style={{ marginTop: 8 }}>Les comptes sont créés par la direction. Aucune donnée de santé n’est enregistrée.</p>
    </main>
  )
}
