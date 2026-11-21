import { useEffect } from 'react'
import { Loader2, LogOut } from 'lucide-react'

export default function ConfirmDialog({
  open,
  busy = false,
  title,
  description,
  confirmLabel = 'Log out',
  onClose,
  onConfirm,
}) {
  useEffect(() => {
    if (!open) return undefined
    const onKey = (event) => {
      if (event.key === 'Escape' && !busy) onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, busy, onClose])

  if (!open) return null

  return (
    <div
      className="animate-fade-in fixed inset-0 z-[160] flex items-center justify-center bg-black/75 p-5 backdrop-blur-md"
      onClick={() => !busy && onClose()}
      role="presentation"
    >
      <div
        className="glass-strong animate-pop-in w-full max-w-[340px] overflow-hidden rounded-3xl border border-white/[0.09] shadow-[0_30px_90px_-30px_rgba(0,0,0,0.95)]"
        onClick={(event) => event.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="cw-confirm-title"
        aria-describedby="cw-confirm-desc"
      >
        <div className="px-6 pb-6 pt-7 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-red-400/25 bg-red-500/10 text-red-300">
            <LogOut size={24} />
          </div>
          <h2
            id="cw-confirm-title"
            className="mt-4 text-[17px] font-semibold tracking-tight text-wa-text"
          >
            {title}
          </h2>
          <p
            id="cw-confirm-desc"
            className="mx-auto mt-2 max-w-[270px] text-[12.5px] leading-relaxed text-wa-muted"
          >
            {description}
          </p>
        </div>

        <div className="flex gap-2.5 border-t border-white/[0.06] p-3">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="flex-1 rounded-2xl bg-white/[0.06] py-3 text-[13px] font-semibold text-wa-text transition-colors hover:bg-white/[0.11] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-red-500/90 py-3 text-[13px] font-semibold text-white shadow-[0_10px_30px_-10px_rgba(239,68,68,0.8)] transition-colors hover:bg-red-500 disabled:opacity-60"
          >
            {busy && <Loader2 size={15} className="animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
