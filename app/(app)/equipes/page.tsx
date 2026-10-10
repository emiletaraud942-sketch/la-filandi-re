import './page.css'
import { PageHead } from '@/components/PageHead'
import { ROLES, staffAll } from '@/lib/data'
import { EquipesView } from './EquipesView'

export default function EquipesPage() {
  return (
    <div className="pg-4">
      <PageHead eyebrow="Équipes" title="Disponibilités par poste" sub="Combien de personnes sont présentes, par métier et par équipe, face au minimum souhaité." />
      <EquipesView staff={staffAll()} roles={ROLES} />
    </div>
  )
}
