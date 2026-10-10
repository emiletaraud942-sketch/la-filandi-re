import './page.css'
import { PageHead } from '@/components/PageHead'
import { SUBS, loadExpenses } from '@/lib/server/data'
import { FraisView } from './FraisView'

export default async function FraisPage() {
  const data = await loadExpenses()
  return (
    <div className="pg-10">
      <PageHead eyebrow="Pilotage" title="Frais invisibles" sub="Petites dépenses non suivies, temps non compté et coûts d’usage cachés, comparés à un repère mensuel." />
      {data ? <FraisView {...data} subs={SUBS} /> : <p className="muted">Les frais invisibles sont réservés à l’administration, à la direction et aux cadres.</p>}
    </div>
  )
}
