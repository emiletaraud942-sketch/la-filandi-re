'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export const PAGES = [
  { href: '/plan', label: 'Plan des chambres' },
  { href: '/taches', label: 'Tâches' },
  { href: '/soignant', label: 'Espace soignant' },
  { href: '/equipes', label: 'Équipes' },
  { href: '/residents', label: 'Résidents' },
  { href: '/visites', label: 'Visites' },
  { href: '/stock', label: 'Stock' },
  { href: '/vehicules', label: 'Véhicules' },
  { href: '/emargement', label: 'Émargement' },
  { href: '/frais', label: 'Frais invisibles' },
]

export function Nav() {
  const path = usePathname()
  return (
    <nav className="nav" aria-label="Sections">
      {PAGES.map((p) => (
        <Link key={p.href} href={p.href} aria-current={path === p.href ? 'page' : undefined}>{p.label}</Link>
      ))}
    </nav>
  )
}
