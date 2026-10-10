import './page.css'
import { PageHead } from '@/components/PageHead'
import { FLOORS, floorData, residentDay } from '@/lib/data'
import { ResidentsView } from './ResidentsView'

const TODAY = 2 // mercredi (démo)

export default function ResidentsPage() {
  // Journées précalculées (7 jours) pour chaque chambre : en production, lues dans la base.
  const floors = FLOORS.map((f) => ({
    floor: f,
    rooms: floorData(f.id).rooms.map((r) => ({
      no: r.no, floor: r.floor, who: r.who, state: r.state,
      days: Array.from({ length: 7 }, (_, d) => (r.state === 'free' ? [] : residentDay(r, d))),
    })),
  }))
  return (
    <div className="pg-5">
      <PageHead eyebrow="Résidents" title="Emploi du temps du résident" sub="Par étage et numéro de chambre : repas, animations, visites. Aucune donnée médicale." />
      <ResidentsView floors={floors} today={TODAY} />
    </div>
  )
}
