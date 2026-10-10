import './page.css'
import { PageHead } from '@/components/PageHead'
import { loadFloors } from '@/lib/server/data'
import { PlanView } from './PlanView'

export default async function PlanPage() {
  const floors = await loadFloors()
  return (
    <div className="pg-1">
      <PageHead eyebrow="Vue d’ensemble" title="Plan des chambres" sub="Où en est chaque chambre aujourd’hui : le point de couleur résume l’avancement des tâches." />
      <PlanView floors={floors} />
    </div>
  )
}
