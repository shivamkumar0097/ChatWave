import { Circle, MessageCircle, Phone, Users } from 'lucide-react'

const TABS = [
  { key: 'chats', label: 'Chats', icon: MessageCircle },
  { key: 'status', label: 'Status', icon: Circle },
  { key: 'community', label: 'Community', icon: Users },
  { key: 'calls', label: 'Calls', icon: Phone },
]

const PLACEHOLDERS = {
  status: {
    title: 'Status',
    text: 'Status updates will show up here.',
  },
  community: {
    title: 'Community',
    text: 'Community spaces are coming soon.',
  },
  calls: {
    title: 'Calls',
    text: 'Start a voice or video call from any chat.',
  },
}

export function TabPlaceholder({ tab }) {
  const meta = PLACEHOLDERS[tab]
  const Icon = TABS.find((item) => item.key === tab)?.icon || Circle
  if (!meta) return null

  return (
    <section className="flex min-w-0 flex-1 flex-col items-center justify-center gap-3 bg-wa-bg px-6 text-center">
      <div className="grid h-16 w-16 place-items-center rounded-2xl border border-white/[0.07] bg-white/[0.04] text-wa-green">
        <Icon size={26} />
      </div>
      <h2 className="text-[17px] font-semibold tracking-tight text-wa-text">{meta.title}</h2>
      <p className="max-w-[240px] text-[12.5px] leading-relaxed text-wa-muted">{meta.text}</p>
    </section>
  )
}

export default function Navigation({ active, onChange, mobile = false }) {
  if (mobile) {
    return (
      <nav className="animate-fade-up fixed inset-x-0 bottom-0 z-40 flex h-16 items-center justify-around border-t border-wa-border bg-wa-bg/95 backdrop-blur-xl md:hidden">
        {TABS.map((tab) => {
          const activeTab = active === tab.key
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onChange(tab.key)}
              className={`relative flex min-w-16 flex-col items-center gap-1 rounded-xl px-2 py-2 text-[10px] font-medium transition-all duration-300 ${
                activeTab ? 'text-wa-green' : 'text-wa-muted'
              }`}
            >
              <span
                className={`pointer-events-none absolute inset-x-1 inset-y-0.5 rounded-xl border border-white/15 bg-white/[0.12] shadow-[0_8px_24px_-10px_rgba(124,92,255,0.9)] backdrop-blur-xl transition-all duration-300 ${
                  activeTab ? 'scale-100 opacity-100' : 'scale-90 opacity-0'
                }`}
              />
              <tab.icon
                size={19}
                className={`relative transition-transform duration-300 ${activeTab ? '-translate-y-0.5 scale-110' : ''}`}
              />
              <span className="relative">{tab.label}</span>
            </button>
          )
        })}
      </nav>
    )
  }

  return (
    <nav className="hidden h-full w-[74px] shrink-0 flex-col items-center gap-2 border-r border-wa-border bg-wa-bg py-4 md:flex">
      <div className="mb-4 grid h-10 w-10 place-items-center rounded-2xl bg-wa-green/15 text-wa-green">
        <MessageCircle size={20} />
      </div>
      {TABS.map((tab) => {
        const activeTab = active === tab.key
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onChange(tab.key)}
            title={tab.label}
            aria-label={tab.label}
            className={`relative flex w-16 flex-col items-center gap-1 rounded-2xl py-2.5 transition-all duration-300 ${
              activeTab ? 'text-wa-green' : 'text-wa-muted hover:text-wa-text'
            }`}
          >
            <span
              className={`pointer-events-none absolute inset-0 rounded-2xl border border-white/15 bg-white/[0.1] shadow-[0_10px_30px_-12px_rgba(124,92,255,0.9)] backdrop-blur-xl transition-all duration-300 ${
                activeTab ? 'scale-100 opacity-100' : 'scale-90 opacity-0'
              }`}
            />
            <tab.icon
              size={20}
              className={`relative transition-transform duration-300 ${activeTab ? '-translate-y-0.5 scale-110' : ''}`}
            />
            <span className="relative text-[9.5px] font-medium">{tab.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
