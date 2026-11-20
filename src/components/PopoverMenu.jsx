import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

export default function PopoverMenu({ open, onClose, anchorRef, children, width = 240 }) {
  const panelRef = useRef(null)
  const [pos, setPos] = useState({ top: 0, left: 0, ready: false })

  useLayoutEffect(() => {
    if (!open || !anchorRef.current) return undefined

    const place = () => {
      const anchor = anchorRef.current.getBoundingClientRect()
      const panel = panelRef.current
      const height = panel?.offsetHeight || 180
      const gap = 8
      const spaceAbove = anchor.top
      const spaceBelow = window.innerHeight - anchor.bottom
      const openDown = spaceBelow >= height + gap || spaceBelow > spaceAbove
      const top = openDown
        ? Math.min(anchor.bottom + gap, window.innerHeight - height - 8)
        : Math.max(8, anchor.top - height - gap)

      setPos({
        top: Math.max(8, top),
        left: Math.min(Math.max(8, anchor.right - width), window.innerWidth - width - 8),
        ready: true,
      })
    }

    place()
    window.addEventListener('resize', place)
    return () => window.removeEventListener('resize', place)
  }, [open, anchorRef, width])

  useEffect(() => {
    if (!open) return undefined

    const onPointerDown = (event) => {
      if (panelRef.current?.contains(event.target) || anchorRef.current?.contains(event.target)) {
        return
      }
      onClose()
    }
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, onClose, anchorRef])

  if (!open) return null

  return createPortal(
    <div
      ref={panelRef}
      role="menu"
      className={`animate-pop-in fixed z-[70] origin-bottom-right overflow-y-auto rounded-2xl border border-white/[0.1] bg-[#151827] p-1.5 shadow-[0_24px_60px_-16px_rgba(0,0,0,0.95)] ${
        pos.ready ? '' : 'invisible'
      }`}
      style={{ top: pos.top, left: pos.left, width, maxHeight: 'calc(100vh - 16px)' }}
    >
      {children}
    </div>,
    document.body
  )
}
