'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

/** Garde l'écran à jour : rafraîchit quand la base change (Supabase Realtime), et toutes les 15 s en repli. */
export function AutoRefresh() {
  const router = useRouter()
  useEffect(() => {
    let last = 0, timer: ReturnType<typeof setTimeout> | null = null
    const refresh = () => {
      if (document.visibilityState !== 'visible') return
      const wait = 2000 - (Date.now() - last)
      if (wait > 0) { if (!timer) timer = setTimeout(() => { timer = null; refresh() }, wait); return }
      last = Date.now()
      router.refresh()
    }
    let channel: ReturnType<ReturnType<typeof createClient>['channel']> | null = null
    const sb = createClient()
    try {
      channel = sb.channel('app-changes').on('postgres_changes', { event: '*', schema: 'public' }, refresh).subscribe()
    } catch { /* le repli toutes les 15 s suffit */ }
    const every = setInterval(refresh, 15000)
    const onVisible = () => { if (document.visibilityState === 'visible') refresh() }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(every)
      if (timer) clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisible)
      if (channel) sb.removeChannel(channel)
    }
  }, [router])
  return null
}
