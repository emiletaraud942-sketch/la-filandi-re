import './page.css'
import { PageHead } from '@/components/PageHead'
import { FLOORS, floorData } from '@/lib/data'
import { PlanView } from './PlanView'

export default function PlanPage() {
  return (
    <div className="pg-1">
      <PageHead eyebrow="Vue d’ensemble" title="Plan des chambres" sub="Où en est chaque chambre aujourd’hui : le point de couleur résume l’avancement des tâches." />
      <PlanView floors={FLOORS.map((f) => floorData(f.id))} />
    </div>
  )
}
