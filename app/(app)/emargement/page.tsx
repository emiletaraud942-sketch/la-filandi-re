import './page.css'
import { PageHead } from '@/components/PageHead'
import { loadSessions, loadStaff } from '@/lib/server/data'
import { EmargementView } from './EmargementView'

export default async function EmargementPage({ searchParams }: { searchParams: Promise<{ jour?: string }> }) {
  const { jour } = await searchParams
  const data = await loadSessions(jour && /^\d{4}-\d{2}-\d{2}$/.test(jour) ? jour : undefined)
  const staff = await loadStaff(data.today)
  const base = new Date(data.today + 'T12:00:00Z')
  const days = Array.from({ length: 9 }, (_, i) => {
    const d = new Date(base.getTime() + (i - 2) * 86400000)
    return { iso: d.toISOString().slice(0, 10), label: d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', timeZone: 'UTC' }) }
  })
  return (
    <div className="pg-9">
      <PageHead eyebrow="Présence" title="Émargement" sub="Feuilles de présence pour les formations, les réunions et les activités des résidents, et pointage du personnel. Chaque signature enregistre l’heure." />
      <EmargementView {...data} days={days} staff={staff} />
    </div>
  )
}
