import './page.css'
import { PageHead } from '@/components/PageHead'
import { loadResidents } from '@/lib/server/data'
import { ResidentsView } from './ResidentsView'

export default async function ResidentsPage() {
  const { floors, today } = await loadResidents()
  return (
    <div className="pg-5">
      <PageHead eyebrow="Résidents" title="Emploi du temps du résident" sub="Par étage et numéro de chambre : repas, animations, visites. Aucune donnée médicale." />
      {floors.length ? <ResidentsView floors={floors} today={today} /> : <p className="muted">Aucun étage n’est encore configuré.</p>}
    </div>
  )
}
