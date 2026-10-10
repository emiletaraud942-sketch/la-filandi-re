import './page.css'
import { PageHead } from '@/components/PageHead'
import { ROLE_NAMES, loadMe } from '@/lib/server/data'
import { PasswordForm } from './PasswordForm'

export default async function ComptePage({ searchParams }: { searchParams: Promise<{ nouveau?: string }> }) {
  const { nouveau } = await searchParams
  const me = await loadMe()
  if (!me) return null
  return (
    <div className="pg-11">
      <PageHead eyebrow="Compte" title="Mon compte" sub="Vos informations et votre mot de passe." />
      {nouveau && <p className="banner">Choisissez maintenant votre nouveau mot de passe.</p>}
      <section className="bx">
        <dl>
          <dt>Nom</dt><dd>{me.name}</dd>
          <dt>Adresse e-mail</dt><dd>{me.email}</dd>
          <dt>Rôle</dt><dd>{ROLE_NAMES[me.role] ?? me.role}</dd>
          <dt>Fiche du personnel</dt><dd>{me.staff ?? 'Non reliée : demandez à l’administrateur de relier votre compte à votre fiche (nécessaire pour pointer).'}</dd>
        </dl>
      </section>
      <section className="bx">
        <h3 className="disp">Changer mon mot de passe</h3>
        <PasswordForm />
      </section>
    </div>
  )
}
