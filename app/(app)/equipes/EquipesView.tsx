import { SHIFTS, hm, type Staff } from '@/lib/data'

type Role = { k: string; label: string; min: { m: number; s: number; n: number } }
const SH = ['m', 's', 'n'] as const
const SLBL: Record<string, string> = { m: 'Matin', s: 'Soir', n: 'Nuit', off: 'Repos', leave: 'Congé', abs: 'Absent' }

function cover(role: Role, staff: Staff[]) {
  const st = staff.filter((p) => p.role === role.k)
  let miss = 0
  const per = {} as Record<(typeof SH)[number], { n: number; need: number; s: 'ok' | 'late' | 'none' }>
  SH.forEach((k) => {
    const n = st.filter((p) => p.shift === k).length
    const need = role.min[k]
    per[k] = { n, need, s: need === 0 ? (n ? 'ok' : 'none') : n >= need ? 'ok' : 'late' }
    if (need > n) miss += need - n
  })
  return { st, per, miss }
}

export function EquipesView({ staff, roles }: { staff: Staff[]; roles: Role[] }) {
  const cnt = (k: Staff['shift']) => staff.filter((p) => p.shift === k).length
  const short = roles.filter((r) => cover(r, staff).miss > 0).length
  return (
    <div>
      <div className="p4-top">
        <div className="p4-sum">
          <div><b className="disp">{cnt('m')}</b><span>présents le matin</span></div>
          <div><b className="disp">{cnt('s')}</b><span>présents le soir</span></div>
          <div><b className="disp">{cnt('n')}</b><span>présents la nuit</span></div>
          <div><b className="disp" style={{ color: `var(--${short ? 'late' : 'ok'})` }}>{short}</b><span>poste{short > 1 ? 's' : ''} à renforcer</span></div>
        </div>
        <div className="legend">
          <span className="sh-m"><i className="sw" />Matin {hm(SHIFTS.m.a)}–{hm(SHIFTS.m.b)}</span>
          <span className="sh-s"><i className="sw" />Soir {hm(SHIFTS.s.a)}–{hm(SHIFTS.s.b)}</span>
          <span className="sh-n"><i className="sw" />Nuit 21:00–07:00</span>
        </div>
      </div>
      <div className="p4-grid">
        {roles.map((role) => {
          const c = cover(role, staff)
          return (
            <section key={role.k} className="p4-card">
              <header>
                <h3 className="disp">{role.label}</h3>
                <span className={`pill st-${c.miss ? 'late' : 'ok'}`}><i className="dot" />{c.miss ? `Il manque ${c.miss} personne${c.miss > 1 ? 's' : ''}` : 'Effectif complet'}</span>
              </header>
              <div className="p4-cov">
                {SH.map((k) => (
                  <div key={k} className={`cov st-${c.per[k].s}`}>
                    <span className="k">{SLBL[k]}</span><b>{c.per[k].n}</b>{c.per[k].need ? <small> sur {c.per[k].need}</small> : null}
                  </div>
                ))}
              </div>
              <div className="p4-ppl">
                {c.st.map((p) => <span key={p.name} className={`ppl sh-${p.shift}`}>{p.name}<em>{SLBL[p.shift]}</em></span>)}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
