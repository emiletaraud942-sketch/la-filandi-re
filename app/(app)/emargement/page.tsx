import './page.css'
import { PageHead } from '@/components/PageHead'
import { loadSessions } from '@/lib/server/data'
import { EmargementView } from './EmargementView'

export default async function EmargementPage() {
  const { sessions, now } = await loadSessions()
  return (
    <div className="pg-9">
      <PageHead eyebrow="Présence" title="Émargement" sub="Feuilles de présence pour les formations, les réunions et les activités des résidents. Chaque signature enregistre l’heure." />
      {sessions.length ? <EmargementView sessions={sessions} now={now} /> : <p className="muted">Aucune séance n’est prévue aujourd’hui.</p>}
    </div>
  )
}
