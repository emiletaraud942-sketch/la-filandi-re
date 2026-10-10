import './page.css'
import { PageHead } from '@/components/PageHead'
import { SUBS, loadExpenses } from '@/lib/server/data'
import { FraisView } from './FraisView'

export default async function FraisPage({ searchParams }: { searchParams: Promise<{ mois?: string }> }) {
  const { mois } = await searchParams
  const data = await loadExpenses(mois && /^\d{4}-\d{2}$/.test(mois) ? mois : undefined)
  return (
    <div className="pg-10">
      <PageHead eyebrow="Pilotage" title="Frais invisibles" sub="Petites dépenses non suivies, temps non compté et coûts d’usage cachés, comparés à un repère mensuel." />
      {data ? <FraisView {...data} subs={SUBS} /> : <p className="muted">Les frais invisibles sont réservés à l’administration, à la direction et aux cadres.</p>}
    </div>
  )
}
