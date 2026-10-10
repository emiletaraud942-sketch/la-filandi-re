import './page.css'
import { PageHead } from '@/components/PageHead'
import { floorData, staffAll, ROLE_LBL, hm, NOW } from '@/lib/data'
import { EmargementView } from './EmargementView'

export default function EmargementPage() {
  const staff = staffAll()
  const pick = (roles: string[], n: number, skip = 0) =>
    staff.filter((p) => roles.includes(p.role)).slice(skip, skip + n).map((p) => ({ n: p.name, sub: ROLE_LBL[p.role] ?? p.role }))
  const residents = floorData(2).rooms.filter((r) => r.state === 'occ').slice(0, 12).map((r) => ({ n: r.who as string, sub: `Chambre ${r.no}` }))
  const sessions = [
    { id: 'f1', type: 'form' as const, n: 'Gestes et postures', when: 'mer. 14 octobre · 10:00–12:00', place: 'Salle de formation', lead: 'Intervenant extérieur', who: pick(['AS', 'AES', 'ASHQ'], 8, 2), signed: 5 },
    { id: 'r1', type: 'reun' as const, n: 'Réunion d’équipe', when: 'mer. 14 octobre · 14:00–14:45', place: 'Salle de réunion', lead: 'Cadre de santé', who: pick(['IDE', 'AS', 'AES'], 9, 0), signed: 0 },
    { id: 'a1', type: 'act' as const, n: 'Loto', when: 'mer. 14 octobre · 10:30–11:30', place: 'Salon d’animation', lead: 'Animation', who: residents, signed: 0 },
  ]
  return (
    <div className="pg-9">
      <PageHead eyebrow="Présence" title="Émargement" sub="Feuilles de présence pour les formations, les réunions et les activités des résidents. Chaque signature enregistre l’heure." />
      <EmargementView sessions={sessions} now={hm(NOW)} />
    </div>
  )
}
