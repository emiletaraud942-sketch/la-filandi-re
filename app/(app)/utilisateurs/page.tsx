import './page.css'
import { PageHead } from '@/components/PageHead'
import { loadUsers } from '@/lib/server/data'
import { UsersView } from './UsersView'

export default async function UsersPage() {
  const data = await loadUsers()
  return (
    <div className="pg-12">
      <PageHead eyebrow="Administration" title="Utilisateurs" sub="Activez les nouveaux comptes, choisissez leur rôle et reliez-les à leur fiche du personnel." />
      {data ? <UsersView {...data} /> : <p className="muted">Cette page est réservée à l’administrateur.</p>}
    </div>
  )
}
