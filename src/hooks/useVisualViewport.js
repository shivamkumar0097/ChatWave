import { useEffect } from 'react'

export function useVisualViewport() {
  useEffect(() => {
    const root = document.documentElement
    const viewport = window.visualViewport
    const mobile = window.matchMedia('(max-width: 767px)')

    const sync = () => {
      if (!viewport || !mobile.matches) {
        root.style.removeProperty('--cw-vv-height')
        root.style.removeProperty('--cw-keyboard')
        return
      }

      const keyboard = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop)

      if (keyboard > 0) root.style.setProperty('--cw-vv-height', `${viewport.height}px`)
      else root.style.removeProperty('--cw-vv-height')

      root.style.setProperty('--cw-keyboard', `${keyboard}px`)
    }

    sync()
    window.addEventListener('resize', sync)
    mobile.addEventListener('change', sync)
    viewport?.addEventListener('resize', sync)
    viewport?.addEventListener('scroll', sync)

    return () => {
      window.removeEventListener('resize', sync)
      mobile.removeEventListener('change', sync)
      viewport?.removeEventListener('resize', sync)
      viewport?.removeEventListener('scroll', sync)
      root.style.removeProperty('--cw-vv-height')
      root.style.removeProperty('--cw-keyboard')
    }
  }, [])
}
