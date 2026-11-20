import { LogOut, Search, Trash2, UserPlus, Users, X } from 'lucide-react'
import { useState } from 'react'
import Avatar from '@/components/Avatar'

export default function GroupMembersModal({
  chat,
  contacts,
  isAdmin = false,
  onClose,
  onAdd,
  onRemove,
  onLeave,
}) {
  const [query, setQuery] = useState('')
  const [busyId, setBusyId] = useState(null)

  const members = chat.members || []
  const memberIds = chat.memberIds ?? members.map((member) => member.id)
  const available = contacts.filter(
    (contact) => !memberIds.includes(contact.id) && contact.name.toLowerCase().includes(query.trim().toLowerCase())
  )

  const run = async (id, action) => {
    if (busyId) return
    setBusyId(id)
    await action(id)
    setBusyId(null)
  }

  return (
    <div
      className="animate-fade-in fixed inset-0 z-[95] flex items-start justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="glass-strong animate-pop-in max-h-[calc(100vh-2rem)] w-full max-w-sm overflow-y-auto rounded-3xl shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)]"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Group members"
      >
        <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-wa-green/15 text-wa-green">
              <Users size={16} />
            </span>
            <div>
              <h3 className="text-[14px] font-semibold tracking-tight">Group members</h3>
              <p className="truncate text-[10.5px] text-wa-muted">{chat.name}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="icon-btn" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {isAdmin && (
          <div className="border-b border-white/[0.06] px-4 py-3">
            <div className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.035] px-3 py-2">
              <Search size={15} className="shrink-0 text-wa-muted" />
              <input
                autoComplete="off"
                spellCheck={false}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Add people by name"
                className="w-full bg-transparent py-0.5 text-[12.5px] outline-none placeholder:text-wa-muted"
              />
            </div>
            <div className="mt-2 max-h-40 space-y-0.5 overflow-y-auto">
              {available.length === 0 ? (
                <p className="px-2 py-3 text-center text-[11px] text-wa-muted">
                  No contacts left to add.
                </p>
              ) : (
                available.map((contact) => (
                  <button
                    key={contact.id}
                    type="button"
                    disabled={Boolean(busyId)}
                    onClick={() => run(contact.id, onAdd)}
                    className="flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 text-left transition-colors hover:bg-white/[0.05] disabled:opacity-50"
                  >
                    <Avatar
                      name={contact.name}
                      color={contact.avatarColor}
                      src={contact.avatarUrl}
                      size="sm"
                    />
                    <span className="min-w-0 flex-1 truncate text-[12.5px]">{contact.name}</span>
                    <UserPlus size={15} className="shrink-0 text-wa-green" />
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        <div className="p-2">
          <p className="px-2 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-wa-muted">
            {members.length} members
          </p>
          {members.map((member) => (
            <div
              key={member.id}
              className="flex items-center gap-2.5 rounded-xl px-2 py-2 transition-colors hover:bg-white/[0.04]"
            >
              <div className="relative">
                <Avatar
                  name={member.name}
                  color={member.avatarColor}
                  src={member.avatarUrl}
                  size="sm"
                />
                {member.online && (
                  <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-wa-panel bg-accent-2" />
                )}
              </div>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12.5px] font-medium">{member.name}</span>
                <span className="block text-[10px] text-wa-muted">
                  {chat.createdBy === member.id
                    ? 'Group admin'
                    : member.online
                      ? 'online'
                      : 'member'}
                </span>
              </span>
              {isAdmin && chat.createdBy !== member.id && (
                <button
                  type="button"
                  disabled={Boolean(busyId)}
                  onClick={() => run(member.id, onRemove)}
                  className="icon-btn text-red-300 hover:bg-red-500/10 disabled:opacity-50"
                  aria-label={`Remove ${member.name}`}
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          ))}
        </div>

        {!isAdmin && (
          <div className="border-t border-white/[0.07] p-3">
            <button
              type="button"
              onClick={onLeave}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-400/25 bg-red-500/10 py-2.5 text-[12.5px] font-semibold text-red-300 transition-colors hover:bg-red-500/20"
            >
              <LogOut size={15} />
              Leave group
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
