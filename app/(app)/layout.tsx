import Link from 'next/link'
import { Nav } from '@/components/Nav'
import { ToastProvider } from '@/components/Toast'
import { DEMO } from '@/lib/mode'
import { createClient } from '@/lib/supabase/server'
import { signOut } from '../login/actions'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  let label = ''
  if (!DEMO) {
    const supabase = await createClient()
    const { data: me } = await supabase.from('profiles').select('full_name, role').maybeSingle()
    label = me ? `${me.full_name} · ${me.role}` : ''
  }
  return (
    <>
      <div className="app-top">
        <div className="app-top-in">
          <Link className="brand" href="/plan">La Filandière</Link>
          <Nav />
          <div className="who">
            {DEMO ? (
              <span className="demo-flag">Démo · données fictives</span>
            ) : (
              <>
                <span>{label}</span>
                <form action={signOut}><button className="btn ghost" type="submit">Se déconnecter</button></form>
              </>
            )}
          </div>
        </div>
      </div>
      <ToastProvider>
        <main className="page">{children}</main>
      </ToastProvider>
    </>
  )
}
