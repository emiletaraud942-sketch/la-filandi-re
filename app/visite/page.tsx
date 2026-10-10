import '../(app)/visites/page.css'
import { FamilyForm } from '@/components/FamilyForm'
import { ToastProvider } from '@/components/Toast'
import { loadPublicSlots } from '@/lib/server/data'

export const metadata = { title: 'Rendre visite à un proche · La Filandière' }
export const dynamic = 'force-dynamic'

export default async function PublicVisitPage() {
  const slots = await loadPublicSlots()
  return (
    <ToastProvider>
      <main className="pg-6" style={{ maxWidth: 640, margin: '0 auto', padding: '28px 16px 48px' }}>
        <p className="eyebrow">EHPAD La Filandière · Déville-lès-Rouen</p>
        <FamilyForm slots={slots} />
      </main>
    </ToastProvider>
  )
}
