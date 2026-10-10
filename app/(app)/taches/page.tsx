import './page.css'
import { PageHead } from '@/components/PageHead'
import { FLOORS, floorData } from '@/lib/data'
import { TachesView } from './TachesView'

export default function TachesPage() {
  return (
    <div className="pg-2">
      <PageHead eyebrow="Planification" title="Tâches par chambre" sub="Ce qu’il y a à faire dans chaque chambre aujourd’hui, du plus urgent au plus tardif." />
      <TachesView floors={FLOORS.map((f) => floorData(f.id).rooms)} />
    </div>
  )
}
