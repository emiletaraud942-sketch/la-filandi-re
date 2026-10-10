import './page.css'
import { PageHead } from '@/components/PageHead'
import { StockView } from './StockView'

export default function StockPage() {
  return (
    <div className="pg-7">
      <PageHead eyebrow="Logistique" title="Stock" sub="Quantité, seuil d’alerte et jours restants pour chaque article. Les ruptures remontent en premier." />
      <StockView />
    </div>
  )
}
