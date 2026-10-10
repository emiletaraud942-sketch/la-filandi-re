import './page.css'
import { PageHead } from '@/components/PageHead'
import { loadStock } from '@/lib/server/data'
import { StockView } from './StockView'

export default async function StockPage() {
  const { items, locations } = await loadStock()
  return (
    <div className="pg-7">
      <PageHead eyebrow="Logistique" title="Stock" sub="Quantité, seuil d’alerte et jours restants pour chaque article. Les ruptures remontent en premier." />
      <StockView items={items} locations={locations} />
    </div>
  )
}
