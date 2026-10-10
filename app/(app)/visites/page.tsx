import './page.css'
import { PageHead } from '@/components/PageHead'
import { loadVisits } from '@/lib/server/data'
import { VisitesView } from './VisitesView'

export default async function VisitesPage() {
  const data = await loadVisits()
  return (
    <div className="pg-6">
      <PageHead eyebrow="Familles" title="Réservation de visite" sub="Les familles demandent un créneau sans compte, l’accueil confirme ou refuse, un e-mail part à chaque décision." />
      <VisitesView {...data} />
    </div>
  )
}
