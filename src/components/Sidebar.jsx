import { useEffect, useRef, useState } from 'react'
import {
  Archive,
  ArchiveRestore,
  Bell,
  BellOff,
  LogOut,
  MessageSquarePlus,
  Search,
  Settings,
  Sparkles,
  UserRound,
} from 'lucide-react'
import Avatar from '@/components/Avatar'
import ChatListItem from '@/components/ChatListItem'

export default function Sidebar({
  chats,
  activeId,
  onSelect,
  onNewChat,
  onSignOut,
  onProfile,
  onSettings,
  soundOn = true,
  onToggleSound,
  me,
  loading = false,
  pinnedIds,
  archivedIds,
  className = '',
}) {
  const [query, setQuery] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    if (!menuOpen) return undefined

    const handleClick = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) setMenuOpen(false)
    }
    const handleKey = (event) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }

    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [menuOpen])

  const archivedCount = chats.filter((chat) => archivedIds?.has(chat.id)).length
  const filtered = chats
    .filter((chat) => Boolean(archivedIds?.has(chat.id)) === showArchived)
    .filter((chat) => chat.name.toLowerCase().includes(query.trim().toLowerCase()))
  const ordered = [...filtered].sort(
    (a, b) => Number(Boolean(pinnedIds?.has(b.id))) - Number(Boolean(pinnedIds?.has(a.id)))
  )

  const menuItems = [
    {
      key: 'new-chat',
      icon: MessageSquarePlus,
      label: 'New chat',
      action: () => {
        setMenuOpen(false)
        onNewChat()
      },
    },
    {
      key: 'profile',
      icon: UserRound,
      label: 'Profile',
      action: () => {
        setMenuOpen(false)
        onProfile()
      },
    },
    {
      key: 'notifications',
      icon: soundOn ? Bell : BellOff,
      label: soundOn ? 'Mute notifications' : 'Unmute notifications',
      action: () => {
        setMenuOpen(false)
        onToggleSound()
      },
    },
    {
      key: 'settings',
      icon: Settings,
      label: 'Settings',
      action: () => {
        setMenuOpen(false)
        onSettings()
      },
    },
    {
      key: 'logout',
      icon: LogOut,
      label: 'Log out',
      danger: true,
      action: () => {
        setMenuOpen(false)
        onSignOut()
      },
    },
  ]

  return (
    <aside
      className={`h-full w-full min-w-0 flex-col border-r border-white/[0.06] bg-[#0a0c14]/85 backdrop-blur-2xl md:w-[390px] md:min-w-[340px] md:max-w-[420px] ${className}`}
    >
      <header className="animate-slide-down relative z-30 flex items-center justify-between px-4 pb-3 pt-4">
        <button
          type="button"
          onClick={onProfile}
          className="group flex min-w-0 items-center gap-3 rounded-2xl px-1 py-1 text-left transition-colors transition-transform duration-200 hover:scale-[1.02] hover:bg-white/[0.04]"
          aria-label="Edit profile"
        >
          <Avatar name={me?.name || 'You'} src={me?.avatarUrl} color={me?.color} size="sm" ring />
          <span className="min-w-0">
            <span className="block truncate text-[15px] font-medium leading-tight">
              {me?.name || 'You'}
            </span>
            <span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-wa-muted">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent-2 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
              <span className="truncate">{me?.bio || 'online'}</span>
            </span>
          </span>
        </button>

        <div className="relative flex items-center gap-1" ref={menuRef}>
          <button
            type="button"
            onClick={onNewChat}
            className="icon-btn text-wa-text hover:text-white"
            aria-label="New chat"
          >
            <MessageSquarePlus size={20} />
          </button>
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            className={`icon-btn ${menuOpen ? 'bg-white/[0.08] text-white' : ''}`}
            aria-label="Menu"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            title="Menu"
            style={{ position: 'relative', zIndex: menuOpen ? 60 : 'auto' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <circle cx="12" cy="5" r="1.9" />
              <circle cx="12" cy="12" r="1.9" />
              <circle cx="12" cy="19" r="1.9" />
            </svg>
          </button>

          {menuOpen && (
            <div
              role="menu"
              className="animate-pop-in absolute right-0 top-11 z-50 w-52 overflow-hidden rounded-2xl border border-white/[0.12] bg-[#11141f] p-1.5 shadow-[0_24px_60px_-16px_rgba(0,0,0,0.95)]"
            >
              {menuItems.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  role="menuitem"
                  onClick={item.action}
                  className={`flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left text-[13px] font-medium transition-colors ${item.danger
                      ? 'text-red-400 hover:bg-red-500/10'
                      : 'text-wa-text hover:bg-white/[0.06]'
                    }`}
                >
                  <item.icon
                    size={17}
                    className={item.danger ? 'text-red-400' : 'text-wa-muted'}
                  />
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      <div className="animate-fade-up px-3 pb-3" style={{ animationDelay: '80ms' }}>
        <div className="group flex items-center gap-2.5 rounded-xl border border-white/[0.06] bg-white/[0.035] px-3 py-2 transition-all duration-200 focus-within:border-wa-green/50 focus-within:bg-white/[0.05] focus-within:shadow-[0_0_0_4px_rgba(124,92,255,0.13)]">
          <Search
            size={16}
            className="shrink-0 text-wa-muted transition-colors group-focus-within:text-wa-green"
          />
          <input
            autoComplete="off"
            spellCheck={false}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={showArchived ? 'Search archived chats' : 'Search or start new chat'}
            className="w-full bg-transparent py-0.5 text-[14.5px] text-wa-text outline-none placeholder:text-wa-muted"
          />
          <kbd className="hidden shrink-0 rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[9px] font-medium text-wa-muted sm:block">
            /
          </kbd>
        </div>
      </div>

      {archivedCount > 0 || showArchived ? (
        <div className="animate-fade-up px-3 pb-2" style={{ animationDelay: '90ms' }}>
          <button
            type="button"
            onClick={() => setShowArchived((value) => !value)}
            className="flex w-full items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.025] px-3 py-2 text-[12px] font-medium text-wa-muted transition-colors hover:bg-white/[0.05] hover:text-wa-text"
          >
            {showArchived ? <ArchiveRestore size={15} /> : <Archive size={15} />}
            <span className="flex-1 text-left">{showArchived ? 'Back to chats' : 'Archived'}</span>
            {!showArchived && (
              <span className="grid h-5 min-w-5 place-items-center rounded-full bg-wa-green/15 px-1.5 text-[10.5px] font-semibold text-wa-green">
                {archivedCount}
              </span>
            )}
          </button>
        </div>
      ) : null}

      <div className="stagger-list flex-1 overflow-y-auto px-2">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-14 text-center">
            {loading ? (
              <div className="w-full space-y-2">
                {[0, 1, 2, 3].map((row) => (
                  <div key={row} className="flex items-center gap-3 rounded-xl p-2">
                    <div className="shimmer-line h-[46px] w-[46px] rounded-full" />
                    <div className="flex-1 space-y-2">
                      <div className="shimmer-line h-3 w-1/2 rounded-full" />
                      <div className="shimmer-line h-2.5 w-4/5 rounded-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <>
                <div className="animate-float mb-4 grid h-14 w-14 place-items-center rounded-2xl border border-white/[0.07] bg-white/[0.04] text-wa-green">
                  <Sparkles size={24} />
                </div>
                <p className="text-sm font-medium text-wa-text">
                  {showArchived
                    ? 'No archived chats'
                    : chats.length === 0
                      ? 'No conversations yet'
                      : 'Nothing found'}
                </p>
                <p className="mt-1 max-w-[220px] text-[12px] leading-relaxed text-wa-muted">
                  {showArchived
                    ? 'Chats you archive will show up here.'
                    : chats.length === 0
                      ? 'Start your first chat and say hello.'
                      : 'Try a different name to find a conversation.'}
                </p>
                {chats.length === 0 && !showArchived && (
                  <button
                    type="button"
                    onClick={onNewChat}
                    className="btn-accent mt-4 rounded-xl px-4 py-2 text-[12px] font-semibold text-white"
                  >
                    Start a new chat
                  </button>
                )}
              </>
            )}
          </div>
        ) : (
          ordered.map((chat) => (
            <ChatListItem
              key={chat.id}
              chat={chat}
              active={chat.id === activeId}
              pinned={Boolean(pinnedIds?.has(chat.id))}
              onSelect={() => onSelect(chat.id)}
            />
          ))
        )}
      </div>

      <footer className="animate-fade-up flex items-center justify-between border-t border-white/[0.05] px-4 py-3 text-[11px] text-wa-muted">
        <span>ChatWave 2026</span>
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-wa-green" />
          real-time
        </span>
      </footer>
    </aside>
  )
}
