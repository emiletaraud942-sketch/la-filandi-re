import './page.css'
import { PageHead } from '@/components/PageHead'
import { loadMyRole, loadRoles, loadStaff, parisToday } from '@/lib/server/data'
import { EquipesView } from './EquipesView'

export default async function EquipesPage({ searchParams }: { searchParams: Promise<{ jour?: string }> }) {
  const { jour } = await searchParams
  const today = parisToday()
  const day = jour && /^\d{4}-\d{2}-\d{2}$/.test(jour) ? jour : today
  const [staff, roles, role] = await Promise.all([loadStaff(day), loadRoles(), loadMyRole()])
  const base = new Date(today + 'T12:00:00Z')
  const days = Array.from({ length: 8 }, (_, i) => {
    const d = new Date(base.getTime() + (i - 1) * 86400000)
    return { iso: d.toISOString().slice(0, 10), label: d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', timeZone: 'UTC' }) }
  })
  return (
    <div className="pg-4">
      <PageHead eyebrow="Équipes" title="Disponibilités par poste" sub="Combien de personnes sont présentes, par métier et par équipe, face au minimum souhaité." />
      <EquipesView staff={staff} roles={roles} day={day} today={today} days={days} canEdit={!!role && ['admin', 'direction', 'cadre'].includes(role)} />
    </div>
  )
}
