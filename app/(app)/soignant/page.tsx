import './page.css'
import { PageHead } from '@/components/PageHead'
import { floorData } from '@/lib/data'
import { SoignantView } from './SoignantView'

// Démo : la soignante connectée est « Camille R. », 2e étage. En production : profil + étage de l'utilisateur.
const ME = { name: 'Camille R.', first: 'Camille', floor: 2 }

export default function SoignantPage() {
  const tasks = floorData(ME.floor).rooms.flatMap((r) => r.tasks.map((t) => ({ ...t, id: r.no + t.k, who: r.who })))
  return (
    <div className="pg-3">
      <PageHead eyebrow="Espace soignant" title="Mon planning" />
      <SoignantView me={ME} tasks={tasks.filter((t) => t.by === ME.name)} />
    </div>
  )
}
