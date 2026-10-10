import './page.css'
import { PageHead } from '@/components/PageHead'
import { loadMyClock, loadMyDay } from '@/lib/server/data'
import { SoignantView } from './SoignantView'

export default async function SoignantPage() {
  const [me, clock] = await Promise.all([loadMyDay(), loadMyClock()])
  return (
    <div className="pg-3">
      <PageHead eyebrow="Espace soignant" title="Mon planning" />
      {me ? <SoignantView me={me} tasks={me.tasks} clock={clock} /> : (
        <p className="muted">Votre compte n’est pas encore lié à un membre du personnel. Demandez à la direction de faire le lien.</p>
      )}
    </div>
  )
}
