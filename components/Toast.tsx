'use client'

import { createContext, useCallback, useContext, useMemo, useState } from 'react'

type Kind = 'ok' | 'err'
type Item = { id: number; kind: Kind; text: string }
const Ctx = createContext<{ ok: (t: string) => void; err: (t: string) => void }>({ ok: () => {}, err: () => {} })

export function useToast() {
  return useContext(Ctx)
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Item[]>([])
  const push = useCallback((kind: Kind, text: string) => {
    const id = Date.now() + Math.random()
    setItems((l) => [...l.slice(-2), { id, kind, text }])
    setTimeout(() => setItems((l) => l.filter((x) => x.id !== id)), kind === 'err' ? 6000 : 3000)
  }, [])
  const api = useMemo(() => ({ ok: (t: string) => push('ok', t), err: (t: string) => push('err', t) }), [push])
  return (
    <Ctx.Provider value={api}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {items.map((i) => <div key={i.id} className={`toast ${i.kind}`}>{i.text}</div>)}
      </div>
    </Ctx.Provider>
  )
}
