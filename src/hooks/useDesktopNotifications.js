import { useEffect } from 'react'

export function useDesktopNotifications() {
  useEffect(() => {
    if (typeof window === 'undefined' || typeof Notification === 'undefined') return undefined

    const handler = (event) => {
      if (!document.hidden) return
      if (window.localStorage.getItem('cw-desktop-notifications') !== '1') return
      if (Notification.permission !== 'granted') return

      const body = event.detail?.body || 'New message'
      const notification = new Notification('ChatWave', {
        body,
        icon: '/logo.jpg',
        badge: '/favicon.jpg',
        tag: event.detail?.conversationId,
      })
      notification.onclick = () => {
        window.focus()
        notification.close()
      }
    }

    window.addEventListener('chatwave:incoming', handler)
    return () => window.removeEventListener('chatwave:incoming', handler)
  }, [])
}
