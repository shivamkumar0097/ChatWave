import { useEffect } from 'react'
import { playNotification } from '@/lib/sound'

const isMuted = (value) => {
  if (!value || value === '0') return false
  if (value === '1' || value === 'forever') return true
  const until = Number(value)
  return Number.isFinite(until) && until > Date.now()
}

export function useNotificationSound(enabled) {
  useEffect(() => {
    if (!enabled) return undefined

    const handler = (event) => {
      const conversationId = event.detail?.conversationId
      if (
        conversationId &&
        isMuted(window.localStorage.getItem(`cw-muted:${conversationId}`))
      ) {
        return
      }
      playNotification()
    }
    window.addEventListener('chatwave:incoming', handler)
    return () => window.removeEventListener('chatwave:incoming', handler)
  }, [enabled])
}
