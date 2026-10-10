import Link from 'next/link'
import { Nav } from '@/components/Nav'
import { ToastProvider } from '@/components/Toast'
import { DEMO } from '@/lib/mode'
import { createClient } from '@/lib/supabase/server'
import { ROLE_NAMES } from '@/lib/server/data'
import { signOut } from '../login/actions'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  let label = '', admin = DEMO, inactive = false
  if (!DEMO) {
    const supabase = await createClient()
    const { data: auth } = await supabase.auth.getUser()
    const { data: me } = await supabase.from('profiles').select('full_name, role, active').eq('id', auth.user?.id ?? '').maybeSingle()
    label = me ? `${me.full_name} · ${ROLE_NAMES[me.role] ?? me.role}` : ''
    admin = !!me?.active && me.role === 'admin'
    inactive = !!me && !me.active
  }
  return (
    <>
      <div className="app-top">
        <div className="app-top-in">
          <Link className="brand" href="/plan">La Filandière</Link>
          <Nav admin={admin} />
          <div className="who">
            {DEMO ? (
              <span className="demo-flag">Démo · données fictives</span>
            ) : (
              <>
                <Link href="/compte" className="me">{label}</Link>
                <form action={signOut}><button className="btn ghost" type="submit">Se déconnecter</button></form>
              </>
            )}
          </div>
        </div>
      </div>
      <ToastProvider>
        <main className="page">
          {inactive ? (
            <div className="card" style={{ marginTop: '6vh' }}>
              <h1>Compte en attente</h1>
              <p>Votre compte n’est pas encore activé. Demandez à l’administrateur de l’activer, puis rechargez cette page.</p>
            </div>
          ) : children}
        </main>
      </ToastProvider>
    </>
  )
}
