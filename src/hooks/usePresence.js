import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export function usePresence(user) {
  const [onlineIds, setOnlineIds] = useState(() => new Set())

  useEffect(() => {
    if (!user) return undefined

    const key = `${user.id}:${Math.random().toString(36).slice(2)}`
    const channel = supabase.channel('online-users', {
      config: { presence: { key } },
    })

    channel.on('presence', { event: 'sync' }, () => {
      const ids = new Set(
        Object.values(channel.presenceState())
          .flat()
          .map((entry) => entry.user_id)
          .filter(Boolean)
      )
      setOnlineIds(ids)
    })

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({ user_id: user.id, online_at: new Date().toISOString() })
      }
    })

    const touchLastSeen = () => {
      supabase
        .from('profiles')
        .update({ last_seen: new Date().toISOString() })
        .eq('id', user.id)
        .then(() => {})
    }

    const onHidden = () => {
      if (document.visibilityState === 'hidden') touchLastSeen()
    }

    window.addEventListener('beforeunload', touchLastSeen)
    document.addEventListener('visibilitychange', onHidden)

    return () => {
      window.removeEventListener('beforeunload', touchLastSeen)
      document.removeEventListener('visibilitychange', onHidden)
      supabase.removeChannel(channel)
    }
  }, [user])

  return onlineIds
}
