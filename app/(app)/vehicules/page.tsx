import './page.css'
import { PageHead } from '@/components/PageHead'
import { VehiculesView } from './VehiculesView'

export default function VehiculesPage() {
  return (
    <div className="pg-8">
      <PageHead eyebrow="Logistique" title="Véhicules" sub="État du jour, prochain entretien et réservation. Saisie manuelle : pas de géolocalisation." />
      <VehiculesView />
    </div>
  )
}
