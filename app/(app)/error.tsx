'use client'

export default function PageError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="card" style={{ marginTop: '6vh' }} role="alert">
      <h1>Une erreur est survenue</h1>
      <p>La page n’a pas pu charger ses données. Vérifiez votre connexion, puis réessayez.</p>
      <p className="note">{error.message}</p>
      <button className="btn" onClick={reset}>Réessayer</button>
    </div>
  )
}
