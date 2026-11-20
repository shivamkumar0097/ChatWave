import { Plus } from 'lucide-react'
import Avatar from '@/components/Avatar'

const initialsOf = (name) =>
  (name || '?')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

export default function StoryTray({ groups, myUserId, loading, onCreate, onOpen }) {
  const mine = groups.find((group) => group.userId === myUserId)
  const others = groups.filter((group) => group.userId !== myUserId)

  if (!loading && !mine && others.length === 0) return null

  return (
    <div className="animate-fade-up flex gap-3 overflow-x-auto px-3 pb-3 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <button type="button" onClick={onCreate} className="flex w-16 shrink-0 flex-col items-center gap-1.5">
        <span className="relative grid h-14 w-14 place-items-center rounded-full border border-dashed border-wa-green/40 bg-wa-green/5">
          {mine ? (
            <Avatar name={mine.name} src={mine.avatarUrl} color={mine.avatarColor} size="md" />
          ) : (
            <Plus size={22} className="text-wa-green" />
          )}
          <span className="absolute bottom-0 right-0 grid h-5 w-5 place-items-center rounded-full border-2 border-wa-bg bg-wa-green text-white">
            <Plus size={12} />
          </span>
        </span>
        <span className="w-full truncate text-center text-[10px] text-wa-muted">My status</span>
      </button>

      {others.map((group) => {
        const unseen = group.stories.some((story) => !story.viewedBy?.has?.(myUserId))
        return (
          <button
            key={group.userId}
            type="button"
            onClick={() => onOpen(group, 0)}
            className="flex w-16 shrink-0 flex-col items-center gap-1.5"
          >
            <span
              className={`grid h-14 w-14 place-items-center rounded-full p-[2px] ${
                unseen ? 'ring-gradient' : 'bg-white/15'
              }`}
            >
              <span className="grid h-full w-full place-items-center overflow-hidden rounded-full bg-wa-panel text-[13px] font-semibold text-wa-text">
                {group.avatarUrl ? (
                  <img src={group.avatarUrl} alt={group.name} className="h-full w-full object-cover" />
                ) : (
                  <span style={{ color: group.avatarColor }}>{initialsOf(group.name)}</span>
                )}
              </span>
            </span>
            <span className="w-full truncate text-center text-[10px] text-wa-muted">{group.name}</span>
          </button>
        )
      })}
    </div>
  )
}
