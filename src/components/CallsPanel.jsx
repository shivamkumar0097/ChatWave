import { useRef, useState } from 'react'
import { ArrowDownLeft, ArrowUpRight, PhoneOff, Trash2, Video } from 'lucide-react'
import Avatar from '@/components/Avatar'

const timeOf = (timestamp) =>
  new Date(timestamp).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })

const dayLabel = (timestamp) => {
  const date = new Date(timestamp)
  const now = new Date()
  if (date.toDateString() === now.toDateString()) return 'Today'
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: date.getFullYear() === now.getFullYear() ? undefined : 'numeric',
  })
}

const durationLabel = (seconds) => {
  if (!seconds) return ''
  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`
}

function CallRow({ entry, onRemove, menuOpen, onLongPress, onCloseMenu }) {
  const timerRef = useRef(null)
  const missed = entry.status === 'missed' || entry.status === 'no_answer'
  const outgoing = entry.direction === 'outgoing'

  const startPress = () => {
    timerRef.current = window.setTimeout(() => onLongPress(entry.id), 550)
  }
  const cancelPress = () => {
    if (timerRef.current) window.clearTimeout(timerRef.current)
    timerRef.current = null
  }

  return (
    <div
      onPointerDown={startPress}
      onPointerUp={cancelPress}
      onPointerLeave={cancelPress}
      onPointerCancel={cancelPress}
      onContextMenu={(event) => {
        event.preventDefault()
        onLongPress(entry.id)
      }}
      className="relative flex select-none items-center gap-3 rounded-2xl px-3 py-2.5 transition-colors hover:bg-white/[0.04]"
    >
      <div className="relative">
        <Avatar
          name={entry.peerName}
          src={entry.avatarUrl}
          color={entry.avatarColor}
          size="lg"
        />
        <span
          className={`absolute -bottom-1 -right-1 grid h-5 w-5 place-items-center rounded-full border-2 border-wa-bg ${
            missed ? 'bg-red-500 text-white' : outgoing ? 'bg-sky-500 text-white' : 'bg-wa-green text-white'
          }`}
        >
          {missed ? <PhoneOff size={10} /> : outgoing ? <ArrowUpRight size={11} /> : <ArrowDownLeft size={11} />}
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <p className={`truncate text-[14px] font-medium ${missed ? 'text-red-400' : 'text-wa-text'}`}>
          {entry.peerName}
        </p>
        <p className="mt-0.5 flex items-center gap-1 text-[11px] text-wa-muted">
          {entry.withVideo && <Video size={11} />}
          {dayLabel(entry.startedAt)} at {timeOf(entry.startedAt)}
          {durationLabel(entry.duration) && ` · ${durationLabel(entry.duration)}`}
        </p>
      </div>

      {menuOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={onCloseMenu} />
          <div className="animate-pop-in absolute right-3 top-11 z-50 overflow-hidden rounded-xl border border-white/10 bg-[#151827] shadow-xl">
            <button
              type="button"
              onClick={() => {
                onRemove(entry.id)
                onCloseMenu()
              }}
              className="flex w-full items-center gap-2 px-4 py-2.5 text-[12px] text-red-300 transition-colors hover:bg-red-500/10"
            >
              <Trash2 size={14} />
              Remove
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export default function CallsPanel({ history, onRemove }) {
  const [menuFor, setMenuFor] = useState(null)
  const groups = []
  for (const entry of history) {
    const label = dayLabel(entry.startedAt)
    const last = groups[groups.length - 1]
    if (!last || last.label !== label) groups.push({ label, items: [] })
    groups[groups.length - 1].items.push(entry)
  }

  return (
    <section className="flex min-w-0 flex-1 flex-col bg-wa-bg">
      <header className="flex items-center justify-between border-b border-wa-border px-4 py-4">
        <h2 className="text-[16px] font-semibold tracking-tight">Recent calls</h2>
        <span className="text-[11px] text-wa-muted">{history.length} calls</span>
      </header>

      {history.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-2xl border border-white/[0.07] bg-white/[0.04] text-wa-green">
            <Video size={22} />
          </div>
          <p className="text-[13.5px] font-medium text-wa-text">No recent calls</p>
          <p className="max-w-[240px] text-[12px] leading-relaxed text-wa-muted">
            Voice and video calls from your chats will show up here.
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-2">
          {groups.map((group) => (
            <div key={group.label} className="mb-3">
              <p className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-wa-muted">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map((entry) => (
                  <CallRow
                    key={entry.id}
                    entry={entry}
                    onRemove={onRemove}
                    menuOpen={menuFor === entry.id}
                    onLongPress={setMenuFor}
                    onCloseMenu={() => setMenuFor(null)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
