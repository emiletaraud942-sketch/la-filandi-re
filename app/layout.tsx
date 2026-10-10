import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'La Filandière',
  description: 'Pilotage de l’établissement : chambres, tâches, équipes, logistique.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Karla:wght@400;500;600;700&family=Newsreader:opsz,wght@6..72,500;6..72,600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
