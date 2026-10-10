import { FLOORS } from '@/lib/data'

export function FloorChips({ value, onChange }: { value: number; onChange: (f: number) => void }) {
  return (
    <div className="chips" role="group" aria-label="Étage">
      {FLOORS.map((f) => (
        <button key={f.id} className="chip" aria-pressed={value === f.id} onClick={() => onChange(f.id)}>{f.short}</button>
      ))}
    </div>
  )
}
