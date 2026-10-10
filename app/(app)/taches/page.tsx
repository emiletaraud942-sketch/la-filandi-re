import './page.css'
import { PageHead } from '@/components/PageHead'
import { loadFloors, loadTaskAdmin } from '@/lib/server/data'
import { TachesView } from './TachesView'

export default async function TachesPage() {
  const [floors, admin] = await Promise.all([loadFloors(), loadTaskAdmin()])
  return (
    <div className="pg-2">
      <PageHead eyebrow="Planification" title="Tâches par chambre" sub="Ce qu’il y a à faire dans chaque chambre aujourd’hui, du plus urgent au plus tardif." />
      <TachesView floors={floors.map((x) => ({ id: x.floor.id, short: x.floor.short, rooms: x.rooms }))} admin={admin} />
    </div>
  )
}
