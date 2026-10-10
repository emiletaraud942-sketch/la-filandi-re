import './page.css'
import { PageHead } from '@/components/PageHead'
import { loadVehicles } from '@/lib/server/data'
import { VehiculesView } from './VehiculesView'

export default async function VehiculesPage() {
  const data = await loadVehicles()
  return (
    <div className="pg-8">
      <PageHead eyebrow="Logistique" title="Véhicules" sub="État du jour, réservation, carnet de bord et entretien. Saisie manuelle : pas de géolocalisation." />
      <VehiculesView {...data} />
    </div>
  )
}
