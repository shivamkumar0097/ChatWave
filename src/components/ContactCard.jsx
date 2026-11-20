import { createPortal } from 'react-dom'
import { ShieldCheck, ShieldOff, X } from 'lucide-react'
import Avatar from '@/components/Avatar'

export default function ContactCard({ chat, blocked, onClose, onToggleBlock }) {
  const otherId = chat.memberIds?.find((id) => id !== chat.userId)
  const username = chat.members?.find((member) => member.id === otherId)?.username || ''

  return createPortal(
    <div
      className="animate-fade-in fixed inset-0 z-[135] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="glass-strong animate-pop-in w-full max-w-xs rounded-3xl p-5 text-center"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex justify-end">
          <button type="button" onClick={onClose} className="icon-btn" aria-label="Close">
            <X size={17} />
          </button>
        </div>
        <div className="mx-auto w-fit rounded-full p-[2px] ring-gradient">
          <Avatar
            name={chat.name}
            src={chat.avatarUrl}
            color={chat.avatarColor}
            size="xl"
          />
        </div>
        <h2 className="mt-3 text-[17px] font-semibold">{chat.name}</h2>
        {username && <p className="mt-0.5 text-[12px] text-wa-green">@{username}</p>}
        <button
          type="button"
          onClick={() => {
            onToggleBlock(chat)
            onClose()
          }}
          className={`mt-5 flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-[12.5px] font-semibold transition-colors ${
            blocked
              ? 'bg-wa-green/15 text-wa-green hover:bg-wa-green/25'
              : 'bg-red-500/15 text-red-300 hover:bg-red-500/25'
          }`}
        >
          {blocked ? <ShieldCheck size={15} /> : <ShieldOff size={15} />}
          {blocked ? 'Unblock contact' : 'Block contact'}
        </button>
      </div>
    </div>,
    document.body
  )
}
