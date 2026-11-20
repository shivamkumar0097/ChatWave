import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  Check,
  CheckCheck,
  Clock,
  Copy,
  CornerUpLeft,
  FileText,
  Forward,
  Info,
  Pencil,
  Star,
  Trash2,
  X,
} from 'lucide-react'
import EmojiText from '@/components/EmojiText'

const REACTIONS = ['❤️', '😂', '😮', '😢', '🙏', '👍']

const formatBytes = (bytes) => {
  if (!bytes) return ''
  const units = ['B', 'KB', 'MB', 'GB']
  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit += 1
  }
  return `${value.toFixed(value >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`
}

const fullTime = (iso) =>
  iso
    ? new Date(iso).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : ''

export default function MessageBubble({
  message,
  onReply,
  onForward,
  onReact,
  onEdit,
  onDelete,
  onStar,
  starred = false,
  replyTo,
  replyAuthorName,
  senderName = null,
}) {
  const mine = message.from === 'me'
  const [open, setOpen] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [sheetMode, setSheetMode] = useState('actions')
  const [reactsOpen, setReactsOpen] = useState(false)
  const [dragX, setDragX] = useState(0)
  const [swiping, setSwiping] = useState(false)
  const startX = useRef(0)
  const startY = useRef(0)
  const axis = useRef(null)
  const longPress = useRef(null)
  const moved = useRef(false)

  const maxDrag = 56

  const buzz = (duration) => {
    if (typeof window !== 'undefined' && window.localStorage.getItem('cw-haptics') === '0') return
    if (navigator.vibrate) navigator.vibrate(duration)
  }

  const clearPress = () => {
    if (longPress.current) {
      clearTimeout(longPress.current)
      longPress.current = null
    }
  }

  const openSheet = () => {
    setSheetMode('actions')
    setSheetOpen(true)
  }

  useEffect(() => clearPress, [])

  const touchStart = (event) => {
    const touch = event.touches[0]
    startX.current = touch.clientX
    startY.current = touch.clientY
    axis.current = null
    moved.current = false
    setSwiping(true)
    longPress.current = setTimeout(() => {
      openSheet()
      buzz(25)
    }, 450)
  }

  const touchMove = (event) => {
    if (!swiping) return
    const touch = event.touches[0]
    const dx = touch.clientX - startX.current
    const dy = touch.clientY - startY.current

    if (!axis.current && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
      axis.current = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y'
      if (axis.current === 'x') clearPress()
    }
    if (axis.current === 'y') {
      moved.current = true
      return
    }
    if (axis.current === 'x') {
      moved.current = true
      const clamped = mine
        ? Math.min(Math.max(dx, 0), maxDrag)
        : Math.max(Math.min(dx, 0), -maxDrag)
      setDragX(mine ? -clamped : clamped)
    }
  }

  const touchEnd = () => {
    clearPress()
    setSwiping(false)
    if (Math.abs(dragX) > 34 && !message.deleted) {
      onReply?.(message)
      buzz(12)
    }
    setDragX(0)
  }

  const toggleReaction = (emoji) => {
    setReactsOpen(false)
    setSheetOpen(false)
    onReact?.(message, emoji)
  }

  const closeSheet = () => setSheetOpen(false)

  const statusIcon = mine && (
    (message.status === 'read' && <CheckCheck size={14} className="text-accent-2" />) ||
    (message.status === 'delivered' && <CheckCheck size={14} className="text-white/75" />) || (
      <Check size={14} className="text-white/60" />
    )
  )

  const meta = (
    <span
      className={`flex items-center gap-1 text-[10px] ${
        mine ? 'text-white/70' : 'text-wa-muted'
      }`}
    >
      {message.edited && !message.deleted && <span className="opacity-80">edited</span>}
      {(message.expiresAt || message.viewOnce) && !message.deleted && (
        <Clock size={10} className="opacity-80" />
      )}
      {message.time}
      {statusIcon}
      {starred && <Star size={10} className="fill-current opacity-80" />}
    </span>
  )

  const bubble = (
    <div
      className={`group relative w-full rounded-2xl px-3 py-2 text-[15px] leading-[1.5] shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl ${
        mine
          ? 'rounded-br-md bg-gradient-to-br from-[#7c5cff] to-[#5b3df5] text-white shadow-[0_10px_28px_-16px_rgba(124,92,255,0.9)]'
          : 'rounded-bl-md border border-white/[0.06] bg-[#151827] text-wa-text shadow-[0_10px_24px_-20px_rgba(0,0,0,0.9)]'
      }`}
      style={{ transform: `translateX(${dragX}px)`, transitionDuration: swiping ? '0ms' : undefined }}
    >
      {message.forwarded && !message.deleted && (
        <p
          className={`mb-1 flex items-center gap-1 text-[10.5px] italic ${
            mine ? 'text-white/70' : 'text-wa-muted'
          }`}
        >
          <Forward size={11} />
          Forwarded
        </p>
      )}

      {replyTo && !message.deleted && (
        <button
          type="button"
          onClick={openSheet}
          className={`mb-1.5 flex w-full items-stretch gap-2 rounded-lg border-l-[3px] px-2 py-1.5 text-left ${
            mine ? 'border-white/60 bg-black/20' : 'border-wa-green/70 bg-white/[0.05]'
          }`}
        >
          <span className="min-w-0 flex-1">
            <span
              className={`block truncate text-[11px] font-semibold ${
                mine ? 'text-white/90' : 'text-wa-green'
              }`}
            >
              {replyAuthorName || (replyTo.from === 'me' ? 'You' : 'Them')}
            </span>
            <span
              className={`block truncate text-[11.5px] ${mine ? 'text-white/75' : 'text-wa-muted'}`}
            >
              {replyTo.deleted
                ? 'Message deleted'
                : replyTo.imageUrl && !replyTo.text
                  ? 'Photo'
                  : replyTo.fileUrl && !replyTo.text
                    ? replyTo.fileName || 'Attachment'
                    : replyTo.text}
            </span>
          </span>
        </button>
      )}

      {message.deleted ? (
        <p
          className={`flex items-center gap-1.5 pr-12 text-[13px] italic ${
            mine ? 'text-white/80' : 'text-wa-muted'
          }`}
        >
          <Trash2 size={13} className="shrink-0" />
          This message was deleted
        </p>
      ) : (
        <>
          {message.imageUrl && (
            <button
              type="button"
              onClick={() => !moved.current && setOpen(true)}
              className="mb-1 block overflow-hidden rounded-xl"
              aria-label="Open image"
            >
              <img
                src={message.imageUrl}
                alt="Shared"
                loading="lazy"
                className="max-h-72 w-full min-w-40 object-cover transition-transform duration-300 hover:scale-[1.03]"
              />
            </button>
          )}

          {message.fileUrl && message.fileType?.startsWith('audio/') && (
            <div className="mb-1 min-w-56">
              <audio controls src={message.fileUrl} className="w-full" />
              <p className={`mt-1 truncate text-[11px] ${mine ? 'text-white/75' : 'text-wa-muted'}`}>
                {message.fileName}
              </p>
            </div>
          )}

          {message.fileUrl && message.fileType?.startsWith('video/') && (
            <div className="mb-1">
              <video
                controls
                src={message.fileUrl}
                className="max-h-64 w-full rounded-xl bg-black"
              />
              <p className={`mt-1 truncate text-[11px] ${mine ? 'text-white/75' : 'text-wa-muted'}`}>
                {message.fileName}
              </p>
            </div>
          )}

          {message.fileUrl &&
            !message.fileType?.startsWith('audio/') &&
            !message.fileType?.startsWith('video/') && (
              <a
                href={message.fileUrl}
                target="_blank"
                rel="noreferrer"
                download={message.fileName || true}
                className={`mb-1 flex items-center gap-2.5 rounded-xl border px-2.5 py-2 transition-colors ${
                  mine
                    ? 'border-white/25 bg-black/20 hover:bg-black/30'
                    : 'border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.07]'
                }`}
              >
                <span
                  className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${
                    mine ? 'bg-white/15 text-white' : 'bg-wa-green/15 text-wa-green'
                  }`}
                >
                  <FileText size={17} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12.5px] font-medium">
                    {message.fileName || 'Attachment'}
                  </span>
                  <span className={`block text-[10.5px] ${mine ? 'text-white/70' : 'text-wa-muted'}`}>
                    {formatBytes(message.fileSize) || 'Tap to open'}
                  </span>
                </span>
              </a>
            )}

          {message.text && (
            <p className="whitespace-pre-wrap break-words pr-12">
              <EmojiText text={message.text} />
            </p>
          )}
        </>
      )}

      {message.deleted ? (
        <span className={`mt-1 flex justify-end ${mine ? 'text-white/60' : 'text-wa-muted'}`}>
          {meta}
        </span>
      ) : message.text ? (
        <span className="-mt-2.5 flex items-center justify-end gap-1 text-inherit opacity-80">
          {meta}
        </span>
      ) : (
        <span className={`mt-0.5 flex justify-end ${mine ? 'text-white/70' : 'text-wa-muted'}`}>
          {meta}
        </span>
      )}

      <div
        className={`pointer-events-none absolute inset-x-0 -bottom-2.5 flex ${
          mine ? 'justify-end pr-2' : 'justify-start pl-2'
        }`}
      >
        {(message.reactionList || []).length > 0 && (
          <span className="animate-pop-in pointer-events-auto flex items-center gap-1 rounded-full border border-white/10 bg-[#1a1e2e] px-1.5 py-0.5 text-[12px] shadow-md">
            {(message.reactionList || []).map((entry) => (
              <span
                key={entry.emoji}
                className={`flex items-center gap-0.5 ${
                  message.reaction === entry.emoji ? 'font-semibold text-white' : ''
                }`}
              >
                {entry.emoji}
                {entry.count > 1 && <span className="text-[10px] text-wa-muted">{entry.count}</span>}
              </span>
            ))}
          </span>
        )}
      </div>
    </div>
  )

  return (
    <div
      id={`message-${message.id}`}
      className={`bubble-in flex scroll-mt-24 ${mine ? 'justify-end' : 'justify-start'}`}
    >
      <div className={`relative flex w-full items-center gap-1 ${mine ? 'justify-end' : 'justify-start'}`}>
        <div
          className="relative max-w-[80%] touch-pan-y select-none sm:max-w-[66%]"
          onTouchStart={touchStart}
          onTouchMove={touchMove}
          onTouchEnd={touchEnd}
          onContextMenu={(event) => {
            if (event.nativeEvent?.pointerType && event.nativeEvent.pointerType !== 'mouse') {
              event.preventDefault()
            }
          }}
          onMouseDown={(event) => {
            if (event.button !== 0) return
            if (event.target.closest('video, audio, a')) return
            clearPress()
            longPress.current = setTimeout(() => openSheet(), 450)
          }}
          onMouseUp={clearPress}
          onMouseLeave={clearPress}
        >
          {senderName && !message.deleted && (
            <p className="mb-1 pl-1 text-[11px] font-semibold text-wa-green">{senderName}</p>
          )}
          {bubble}

          <div
            className={`absolute top-1/2 hidden -translate-y-1/2 gap-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100 sm:flex ${
              mine ? 'right-full mr-2' : 'left-full ml-2'
            }`}
          >
            <button
              type="button"
              onClick={() => setReactsOpen((state) => !state)}
              className="grid h-7 w-7 place-items-center rounded-full border border-white/10 bg-[#161a28] text-[13px] shadow-md transition-colors hover:bg-white/10"
              aria-label="React"
              title="React"
            >
              😊
            </button>
            {!message.deleted && (
              <button
                type="button"
                onClick={() => onReply?.(message)}
                className="grid h-7 w-7 place-items-center rounded-full border border-white/10 bg-[#161a28] text-wa-muted shadow-md transition-colors hover:bg-white/10 hover:text-wa-text"
                aria-label="Reply"
                title="Reply"
              >
                <CornerUpLeft size={13} />
              </button>
            )}
          </div>
        </div>
      </div>

      {reactsOpen &&
        createPortal(
          <div
            className="animate-fade-in fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
            onClick={() => setReactsOpen(false)}
            role="presentation"
          >
            <div
              className="animate-pop-in flex items-center gap-1.5 rounded-full border border-white/10 bg-[#151827] px-3 py-2.5 shadow-[0_24px_60px_-16px_rgba(0,0,0,0.95)]"
              onClick={(event) => event.stopPropagation()}
            >
              {REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => toggleReaction(emoji)}
                  className="grid h-10 w-10 place-items-center rounded-full text-[22px] transition-transform hover:scale-125 hover:bg-white/10"
                  aria-label={`React ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>,
          document.body
        )}

      {sheetOpen &&
        createPortal(
          <div
            className="animate-fade-in fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
            onClick={closeSheet}
            role="presentation"
          >
            <div
              className="animate-slide-down max-h-[calc(100vh-2rem)] w-full max-w-sm overflow-y-auto rounded-3xl border border-white/[0.1] bg-[#11141f] p-3 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.95)]"
              onClick={(event) => event.stopPropagation()}
            >
              {sheetMode === 'actions' && (
                <>
                  <div className="mb-3 flex items-center justify-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] py-2.5">
                    {REACTIONS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => toggleReaction(emoji)}
                        className="grid h-10 w-10 place-items-center rounded-full text-[22px] transition-transform hover:scale-125 hover:bg-white/10"
                        aria-label={`React ${emoji}`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>

                  {!message.deleted && (
                    <button
                      type="button"
                      onClick={() => {
                        closeSheet()
                        onReply?.(message)
                      }}
                      className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-[14px] font-medium text-wa-text transition-colors hover:bg-white/[0.06]"
                    >
                      <CornerUpLeft size={17} className="text-wa-muted" />
                      Reply
                    </button>
                  )}

                  {!message.deleted && (
                    <button
                      type="button"
                      onClick={() => {
                        closeSheet()
                        onForward?.(message)
                      }}
                      className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-[14px] font-medium text-wa-text transition-colors hover:bg-white/[0.06]"
                    >
                      <Forward size={17} className="text-wa-muted" />
                      Forward
                    </button>
                  )}

                  {message.text && !message.deleted && (
                    <button
                      type="button"
                      onClick={() => {
                        closeSheet()
                        navigator.clipboard?.writeText(message.text)
                      }}
                      className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-[14px] font-medium text-wa-text transition-colors hover:bg-white/[0.06]"
                    >
                      <Copy size={17} className="text-wa-muted" />
                      Copy text
                    </button>
                  )}

                  {mine && message.text && !message.deleted && (
                    <button
                      type="button"
                      onClick={() => {
                        closeSheet()
                        onEdit?.(message)
                      }}
                      className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-[14px] font-medium text-wa-text transition-colors hover:bg-white/[0.06]"
                    >
                      <Pencil size={17} className="text-wa-muted" />
                      Edit message
                    </button>
                  )}

                  {!message.deleted && (
                    <button
                      type="button"
                      onClick={() => {
                        closeSheet()
                        onStar?.(message)
                      }}
                      className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-[14px] font-medium text-wa-text transition-colors hover:bg-white/[0.06]"
                    >
                      <Star
                        size={17}
                        className={starred ? 'fill-current text-amber-300' : 'text-wa-muted'}
                      />
                      {starred ? 'Remove from starred' : 'Star message'}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setSheetMode('info')}
                    className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-[14px] font-medium text-wa-text transition-colors hover:bg-white/[0.06]"
                  >
                    <Info size={17} className="text-wa-muted" />
                    Message info
                  </button>

                  {!message.deleted && (
                    <button
                      type="button"
                      onClick={() => setSheetMode('delete')}
                      className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-[14px] font-medium text-red-300 transition-colors hover:bg-red-500/10"
                    >
                      <Trash2 size={17} className="text-red-300" />
                      Delete message
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={closeSheet}
                    className="mt-1 w-full rounded-2xl border border-white/[0.08] py-2.5 text-[13px] font-semibold text-wa-muted transition-colors hover:bg-white/[0.04]"
                  >
                    Cancel
                  </button>
                </>
              )}

              {sheetMode === 'delete' && (
                <>
                  <div className="px-2 pb-2 pt-1 text-center">
                    <p className="text-[14px] font-semibold text-wa-text">Delete message?</p>
                    <p className="mt-1 text-[11.5px] leading-relaxed text-wa-muted">
                      This cannot be undone.
                    </p>
                  </div>
                  {mine && (
                    <button
                      type="button"
                      onClick={() => {
                        closeSheet()
                        onDelete?.(message, true)
                      }}
                      className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-[14px] font-medium text-red-300 transition-colors hover:bg-red-500/10"
                    >
                      <Trash2 size={17} />
                      Delete for everyone
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      closeSheet()
                      onDelete?.(message, false)
                    }}
                    className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-[14px] font-medium text-wa-text transition-colors hover:bg-white/[0.06]"
                  >
                    <Trash2 size={17} className="text-wa-muted" />
                    Delete for me
                  </button>
                  <button
                    type="button"
                    onClick={() => setSheetMode('actions')}
                    className="mt-1 w-full rounded-2xl border border-white/[0.08] py-2.5 text-[13px] font-semibold text-wa-muted transition-colors hover:bg-white/[0.04]"
                  >
                    Cancel
                  </button>
                </>
              )}

              {sheetMode === 'info' && (
                <>
                  <div className="px-2 pb-1 pt-1 text-center">
                    <p className="text-[14px] font-semibold text-wa-text">Message info</p>
                  </div>
                  <div className="my-2 space-y-2.5 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-3 text-[12px]">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-wa-muted">Sent</span>
                      <span className="text-right text-wa-text">{fullTime(message.createdAt)}</span>
                    </div>
                    {mine && (
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-wa-muted">Status</span>
                        <span className="text-wa-text">
                          {message.status === 'read' ? 'Read' : 'Delivered'}
                        </span>
                      </div>
                    )}
                    {message.edited && (
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-wa-muted">Edited</span>
                        <span className="text-wa-text">Yes</span>
                      </div>
                    )}
                    {message.forwarded && (
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-wa-muted">Forwarded</span>
                        <span className="text-wa-text">Yes</span>
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={closeSheet}
                    className="w-full rounded-2xl border border-white/[0.08] py-2.5 text-[13px] font-semibold text-wa-muted transition-colors hover:bg-white/[0.04]"
                  >
                    Close
                  </button>
                </>
              )}
            </div>
          </div>,
          document.body
        )}

      {open &&
        createPortal(
          <div
            className="animate-fade-in fixed inset-0 z-[70] flex items-center justify-center bg-black/85 p-4 backdrop-blur-md"
            onClick={() => setOpen(false)}
            role="presentation"
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="icon-btn absolute right-4 top-4 text-white"
              aria-label="Close image"
            >
              <X size={22} />
            </button>
            <img
              src={message.imageUrl}
              alt="Shared"
              className="animate-pop-in max-h-[88vh] max-w-full rounded-2xl object-contain shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            />
          </div>,
          document.body
        )}
    </div>
  )
}
