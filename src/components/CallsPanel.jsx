import { useRef, useState } from 'react'
import { ArrowDownLeft, ArrowUpRight, Phone, PhoneOff, Plus, Trash2, Video, X } from 'lucide-react'
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

function CallRow({ entry, menuOpen, onLongPress, onCloseMenu, index = 0, removing = false, onRequestRemove }) {
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
      style={{ animationDelay: `${Math.min(index, 10) * 35}ms` }}
      className={`animate-fade-up relative flex select-none items-center gap-3 rounded-2xl px-3 py-2.5 transition-all duration-200 hover:bg-white/[0.04] ${
        removing ? '-translate-x-6 opacity-0' : ''
      }`}
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
                onRequestRemove(entry.id)
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

export default function CallsPanel({ history, onRemove, contacts = [], onStartCall }) {
  const [menuFor, setMenuFor] = useState(null)
  const [removingId, setRemovingId] = useState(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [selectedContact, setSelectedContact] = useState(null)

  const requestRemove = (id) => {
    setRemovingId(id)
    window.setTimeout(() => {
      onRemove(id)
      setRemovingId(null)
    }, 200)
  }
  const groups = []
  for (const entry of history) {
    const label = dayLabel(entry.startedAt)
    const last = groups[groups.length - 1]
    if (!last || last.label !== label) groups.push({ label, items: [] })
    groups[groups.length - 1].items.push(entry)
  }

  return (
    <section className="tab-fade flex min-w-0 flex-1 flex-col bg-wa-bg">
      <header className="flex items-center justify-between border-b border-wa-border px-4 py-4">
        <h2 className="text-[16px] font-semibold tracking-tight">Recent calls</h2>
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="flex items-center gap-1.5 rounded-full border border-wa-green/25 bg-wa-green/10 px-3 py-1.5 text-[11.5px] font-semibold text-wa-green transition-colors hover:bg-wa-green/20"
        >
          <Plus size={14} />
          Start a call
        </button>
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
                {group.items.map((entry, rowIndex) => (
                  <CallRow
                    key={entry.id}
                    entry={entry}
                    index={rowIndex}
                    onRequestRemove={requestRemove}
                    removing={removingId === entry.id}
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

      {pickerOpen && (
        <div
          className="animate-fade-in fixed inset-0 z-[140] flex items-start justify-center bg-black/70 p-4 pt-16 backdrop-blur-sm sm:pt-24"
          onClick={() => setPickerOpen(false)}
          role="presentation"
        >
          <div
            className="glass-strong animate-pop-in w-full max-w-sm overflow-hidden rounded-3xl"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
              <div>
                <h3 className="text-[14px] font-semibold">Start a call</h3>
                <p className="text-[10.5px] text-wa-muted">Choose a contact</p>
              </div>
              <button
                type="button"
                onClick={() => setPickerOpen(false)}
                className="icon-btn"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <div className="max-h-[55vh] overflow-y-auto p-2">
              {contacts.length === 0 ? (
                <p className="px-4 py-8 text-center text-[12px] text-wa-muted">
                  No contacts available.
                </p>
              ) : (
                contacts.map((contact) => (
                  <button
                    key={contact.id}
                    type="button"
                    onClick={() => {
                      setSelectedContact(contact)
                      setPickerOpen(false)
                    }}
                    className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors hover:bg-white/[0.05]"
                  >
                    <Avatar
                      name={contact.name}
                      src={contact.avatarUrl}
                      color={contact.avatarColor}
                      size="sm"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium">{contact.name}</span>
                      <span className="block truncate text-[10.5px] text-wa-muted">
                        {contact.username ? `@${contact.username}` : 'Tap to call'}
                      </span>
                    </span>
                    <Phone size={15} className="shrink-0 text-wa-green" />
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {selectedContact && (
        <div
          className="animate-fade-in fixed inset-0 z-[150] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          onClick={() => setSelectedContact(null)}
          role="presentation"
        >
          <div
            className="glass-strong animate-pop-in w-full max-w-xs rounded-3xl p-6 text-center"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="flex justify-center">
              <Avatar
                name={selectedContact.name}
                src={selectedContact.avatarUrl}
                color={selectedContact.avatarColor}
                size="xl"
              />
            </div>
            <h3 className="mt-3 text-center text-[16px] font-semibold">{selectedContact.name}</h3>
            {selectedContact.username && (
              <p className="mt-0.5 text-[11px] text-wa-muted">@{selectedContact.username}</p>
            )}
            <p className="mt-4 text-[12px] text-wa-muted">Start a voice call?</p>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setSelectedContact(null)}
                className="flex-1 rounded-xl border border-white/10 py-2.5 text-[12.5px] font-semibold text-wa-muted transition-colors hover:bg-white/[0.05]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onStartCall?.(selectedContact, false)
                  setSelectedContact(null)
                }}
                className="btn-accent flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-[12.5px] font-semibold text-white"
              >
                <Phone size={15} />
                Call
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
