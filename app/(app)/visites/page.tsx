import './page.css'
import { PageHead } from '@/components/PageHead'
import { VisitesView } from './VisitesView'

export default function VisitesPage() {
  return (
    <div className="pg-6">
      <PageHead eyebrow="Familles" title="Réservation de visite" sub="Formulaire pour la famille, puis confirmation par e-mail une fois la demande validée par l’accueil." />
      <VisitesView />
    </div>
  )
}
