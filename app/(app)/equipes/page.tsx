import './page.css'
import { PageHead } from '@/components/PageHead'
import { loadRoles, loadStaff } from '@/lib/server/data'
import { EquipesView } from './EquipesView'

export default async function EquipesPage() {
  const [staff, roles] = await Promise.all([loadStaff(), loadRoles()])
  return (
    <div className="pg-4">
      <PageHead eyebrow="Équipes" title="Disponibilités par poste" sub="Combien de personnes sont présentes, par métier et par équipe, face au minimum souhaité." />
      <EquipesView staff={staff} roles={roles} />
    </div>
  )
}
