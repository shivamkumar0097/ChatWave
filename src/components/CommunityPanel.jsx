import { Plus, Users } from 'lucide-react'
import Avatar from '@/components/Avatar'

export default function CommunityPanel({ groups, onOpenGroup, onCreate }) {
  return (
    <section className="tab-fade flex min-w-0 flex-1 flex-col bg-wa-bg">
      <header className="flex items-center justify-between border-b border-wa-border px-4 py-4">
        <h2 className="text-[16px] font-semibold tracking-tight">Communities</h2>
        <button
          type="button"
          onClick={onCreate}
          className="flex items-center gap-1.5 rounded-full border border-wa-green/25 bg-wa-green/10 px-3 py-1.5 text-[11.5px] font-semibold text-wa-green"
        >
          <Plus size={14} />
          New group
        </button>
      </header>

      {groups.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-2xl border border-white/[0.07] bg-white/[0.04] text-wa-green">
            <Users size={22} />
          </div>
          <p className="text-[13.5px] font-medium text-wa-text">No communities yet</p>
          <p className="max-w-[240px] text-[12px] leading-relaxed text-wa-muted">
            Create a group to bring people together.
          </p>
          <button
            type="button"
            onClick={onCreate}
            className="btn-accent mt-2 rounded-xl px-4 py-2 text-[12px] font-semibold text-white"
          >
            Create a group
          </button>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-2">
          <p className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-wa-muted">
            {groups.length} group{groups.length > 1 ? 's' : ''}
          </p>
          {groups.map((group) => (
            <button
              key={group.id}
              type="button"
              onClick={() => onOpenGroup(group.id)}
              className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors hover:bg-white/[0.04]"
            >
              <Avatar name={group.name} color={group.avatarColor} src={group.avatarUrl} size="lg" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13.5px] font-medium text-wa-text">{group.name}</span>
                <span className="block text-[10.5px] text-wa-muted">
                  {group.members?.length || group.memberIds?.length || 0} members
                </span>
              </span>
              <Users size={15} className="shrink-0 text-wa-muted" />
            </button>
          ))}
        </div>
      )}
    </section>
  )
}
