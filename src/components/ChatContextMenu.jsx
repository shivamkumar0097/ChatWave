import { createPortal } from 'react-dom'
import {
  Archive,
  ArchiveRestore,
  Bell,
  BellOff,
  CheckCheck,
  Circle,
  Copy,
  Pin,
  PinOff,
  ShieldCheck,
  ShieldOff,
  Trash2,
  UserRound,
} from 'lucide-react'

export default function ChatContextMenu({
  chat,
  x,
  y,
  pinned,
  archived,
  muted,
  blocked,
  onClose,
  onMarkRead,
  onMarkUnread,
  onTogglePin,
  onToggleArchive,
  onToggleMute,
  onViewProfile,
  onToggleBlock,
  onCopyUsername,
  onClearChat,
}) {
  const options = [
    {
      key: 'read',
      label: (chat.unread || 0) > 0 ? 'Mark as read' : 'Mark as unread',
      icon: (chat.unread || 0) > 0 ? CheckCheck : Circle,
      action: () => ((chat.unread || 0) > 0 ? onMarkRead : onMarkUnread)(),
    },
    {
      key: 'pin',
      label: pinned ? 'Unpin chat' : 'Pin chat',
      icon: pinned ? PinOff : Pin,
      action: onTogglePin,
    },
    {
      key: 'archive',
      label: archived ? 'Unarchive chat' : 'Archive chat',
      icon: archived ? ArchiveRestore : Archive,
      action: onToggleArchive,
    },
    {
      key: 'mute',
      label: muted ? 'Unmute notifications' : 'Mute notifications',
      icon: muted ? Bell : BellOff,
      action: onToggleMute,
    },
    { key: 'profile', label: 'View profile', icon: UserRound, action: onViewProfile },
    {
      key: 'block',
      label: blocked ? 'Unblock contact' : 'Block contact',
      icon: blocked ? ShieldCheck : ShieldOff,
      action: onToggleBlock,
      danger: !blocked,
    },
    { key: 'copy', label: 'Copy username', icon: Copy, action: onCopyUsername },
    { key: 'clear', label: 'Clear chat', icon: Trash2, action: onClearChat, danger: true },
  ]

  return createPortal(
    <div className="fixed inset-0 z-[130]" onClick={onClose} role="presentation">
      <div
        className="animate-pop-in absolute w-56 overflow-hidden rounded-2xl border border-white/10 bg-[#151827] p-1.5 shadow-[0_24px_60px_-16px_rgba(0,0,0,0.95)]"
        style={{
          left: Math.max(8, Math.min(x, (window.innerWidth || 400) - 236)),
          top: Math.max(8, Math.min(y, (window.innerHeight || 700) - 360)),
        }}
        onClick={(event) => event.stopPropagation()}
        role="menu"
      >
        {options.map((option) => (
          <button
            key={option.key}
            type="button"
            onClick={() => {
              option.action()
              onClose()
            }}
            className={`flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left text-[12.5px] transition-colors hover:bg-white/[0.06] ${
              option.danger ? 'text-red-300' : 'text-wa-text'
            }`}
          >
            <option.icon size={16} className={option.danger ? 'text-red-300' : 'text-wa-muted'} />
            {option.label}
          </button>
        ))}
      </div>
    </div>,
    document.body
  )
}
