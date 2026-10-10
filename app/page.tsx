import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { signOut } from './login/actions'

type Room = { id: string; number: string; wing: string; resident_name: string | null; state: 'free' | 'occupied' | 'away' }

export default async function PlanPage({ searchParams }: { searchParams: Promise<{ etage?: string }> }) {
  const { etage } = await searchParams
  const floorId = Math.min(3, Math.max(0, Number(etage ?? 2) || 0))
  const supabase = await createClient()

  const [{ data: floors }, { data: rooms }, { data: me }] = await Promise.all([
    supabase.from('floors').select('id, name, short, note').order('id'),
    supabase.from('rooms_overview').select('id, number, wing, resident_name, state').eq('floor_id', floorId).order('number').returns<Room[]>(),
    supabase.from('profiles').select('full_name, role').maybeSingle(),
  ])

  const list = rooms ?? []
  const floor = floors?.find((f) => f.id === floorId)
  const occupied = list.filter((r) => r.state !== 'free').length

  return (
    <div className="shell">
      <header className="top">
        <div>
          <p className="eyebrow">La Filandière · Plan des chambres</p>
          <h1>{floor?.name ?? 'Étage'}{floor?.note ? ` · ${floor.note}` : ''}</h1>
        </div>
        <div className="who">
          <span>{me?.full_name} · {me?.role}</span>
          <form action={signOut}><button className="btn ghost" type="submit">Se déconnecter</button></form>
        </div>
      </header>

      <nav className="chips" aria-label="Étage">
        {floors?.map((f) => (
          <Link key={f.id} className="chip" href={`/?etage=${f.id}`} aria-current={f.id === floorId}>{f.short}</Link>
        ))}
      </nav>

      <div className="stats">
        <div className="stat"><b>{list.length}</b><span>chambres</span></div>
        <div className="stat"><b>{occupied}</b><span>occupées</span></div>
        <div className="stat"><b>{list.length - occupied}</b><span>libres</span></div>
      </div>

      <div className="grid">
        {list.map((r) => (
          <div key={r.id} className={`room ${r.state === 'free' ? 'free' : ''}`}>
            <b>{r.number}</b>
            <p>
              {r.state === 'free' ? 'Chambre libre' : r.resident_name}
              {r.state === 'away' && <> · <span className="away">en sortie</span></>}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
