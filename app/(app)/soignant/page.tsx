import './page.css'
import { PageHead } from '@/components/PageHead'
import { loadMyDay } from '@/lib/server/data'
import { SoignantView } from './SoignantView'

export default async function SoignantPage() {
  const me = await loadMyDay()
  return (
    <div className="pg-3">
      <PageHead eyebrow="Espace soignant" title="Mon planning" />
      {me ? <SoignantView me={me} tasks={me.tasks} /> : (
        <p className="muted">Votre compte n’est pas encore lié à un membre du personnel. Demandez à la direction de faire le lien.</p>
      )}
    </div>
  )
}
