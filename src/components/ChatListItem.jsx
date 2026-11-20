import { CheckCheck, Check, Pin } from 'lucide-react'
import Avatar from '@/components/Avatar'
import EmojiText from '@/components/EmojiText'

export default function ChatListItem({ chat, active, pinned = false, onSelect }) {
  const last = chat.messages[chat.messages.length - 1]

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`group relative flex w-full items-center gap-3 overflow-hidden rounded-2xl transition-transform duration-200 hover:translate-x-0.5 px-2.5 py-2.5 text-left transition-all duration-200 ${
        active
          ? 'active-chat-glow border border-wa-green/25'
          : 'border border-transparent hover:border-white/[0.06] hover:bg-white/[0.035]'
      }`}
    >
      {active && (
        <span className="absolute left-0 top-1/2 h-7 w-[3px] -translate-y-1/2 rounded-r-full bg-gradient-to-b from-wa-green to-accent-2" />
      )}

      <Avatar
        name={chat.name}
        color={chat.avatarColor}
        src={chat.avatarUrl}
        size="lg"
        online={chat.online}
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span
            className={`truncate text-[15.5px] font-medium ${
              active ? 'text-white' : 'text-wa-text'
            }`}
          >
            {chat.name}
          </span>
          <span className="flex shrink-0 items-center gap-1">
            {pinned && <Pin size={11} className="rotate-45 text-wa-muted" />}
            <span
              className={`text-[11px] ${
                chat.unread ? 'font-medium text-wa-green' : 'text-wa-muted'
              }`}
            >
              {chat.lastTime}
            </span>
          </span>
        </div>
        <div className="mt-0.5 flex items-center justify-between gap-2">
          <span className="flex min-w-0 items-center gap-1 text-[13.5px] text-wa-muted">
            {chat.typing ? (
              <span className="flex items-center gap-1 truncate text-accent-2">
                <span className="flex items-end gap-0.5">
                  <span className="typing-dot h-1 w-1 rounded-full bg-accent-2" />
                  <span className="typing-dot h-1 w-1 rounded-full bg-accent-2" />
                  <span className="typing-dot h-1 w-1 rounded-full bg-accent-2" />
                </span>
                typing...
              </span>
            ) : (
              <>
                {last?.from === 'me' &&
                  (last.status === 'read' ? (
                    <CheckCheck size={14} className="shrink-0 text-accent-2" />
                  ) : (
                    <Check size={14} className="shrink-0 text-wa-muted/70" />
                  ))}
                <span className="truncate">
                  {last?.deleted
                    ? 'Message deleted'
                    : last?.imageUrl && !last?.text
                      ? 'Photo'
                      : last?.fileUrl && !last?.text
                        ? last.fileName || 'Attachment'
                        : <EmojiText text={last?.text || 'No messages yet'} />}
                </span>
              </>
            )}
          </span>
          {chat.unread > 0 && (
            <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-gradient-to-br from-wa-green to-accent-3 px-1.5 text-[11px] font-semibold text-white shadow-[0_4px_14px_-4px_rgba(124,92,255,0.9)]">
              {chat.unread}
            </span>
          )}
        </div>
      </div>
    </button>
  )
}




