import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'

export function useTyping(conversationId, user) {
  const [typers, setTypers] = useState({})
  const channelRef = useRef(null)

  useEffect(() => {
    if (!conversationId || !user) return undefined

    setTypers({})

    const channel = supabase
      .channel(`typing:${conversationId}`, { config: { broadcast: { self: false } } })
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (!payload?.userId || payload.userId === user.id) return
        setTypers((prev) => ({
          ...prev,
          [payload.userId]: { name: payload.name || 'Someone', at: Date.now() },
        }))
      })
      .subscribe()

    channelRef.current = channel

    const timer = setInterval(() => {
      setTypers((prev) => {
        const next = {}
        let changed = false
        for (const [id, value] of Object.entries(prev)) {
          if (Date.now() - value.at < 3000) next[id] = value
          else changed = true
        }
        return changed ? next : prev
      })
    }, 1000)

    return () => {
      clearInterval(timer)
      channelRef.current = null
      supabase.removeChannel(channel)
    }
  }, [conversationId, user])

  const notifyTyping = useCallback(() => {
    if (!channelRef.current || !user) return
    channelRef.current.send({
      type: 'broadcast',
      event: 'typing',
      payload: {
        userId: user.id,
        name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Someone',
      },
    })
  }, [user])

  return {
    typingNames: Object.values(typers).map((typer) => typer.name),
    notifyTyping,
  }
}
