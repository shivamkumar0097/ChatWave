import { createPortal } from 'react-dom'
import { useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, ImagePlus, Send, Trash2, X } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'

const BACKGROUNDS = ['#7c5cff', '#22d3ee', '#f472b6', '#f59e0b', '#00a884', '#ef4444']

export default function StoryModal({
  mode,
  group,
  index = 0,
  onClose,
  onAddText,
  onAddImage,
  onDelete,
  onViewed,
}) {
  const { user } = useAuth()
  const [text, setText] = useState('')
  const [background, setBackground] = useState(BACKGROUNDS[0])
  const [current, setCurrent] = useState(index)
  const [busy, setBusy] = useState(false)
  const fileRef = useRef(null)

  const mine = group?.userId === user?.id
  const stories = group?.stories || []
  const story = stories[current]

  const submitText = async () => {
    if (!text.trim() || busy) return
    setBusy(true)
    const ok = await onAddText(text, background)
    setBusy(false)
    if (ok) onClose()
  }

  const pickImage = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || busy) return
    setBusy(true)
    const ok = await onAddImage(file)
    setBusy(false)
    if (ok) onClose()
  }

  const move = async (step) => {
    const next = current + step
    if (next < 0 || next >= stories.length) {
      onClose()
      return
    }
    setCurrent(next)
    if (!mine) await onViewed(stories[next].id)
  }

  return createPortal(
    <div
      className="animate-fade-in fixed inset-0 z-[115] flex items-center justify-center bg-black/90 p-4 backdrop-blur-md"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="animate-pop-in relative flex max-h-[90vh] w-full max-w-sm flex-col overflow-hidden rounded-3xl bg-[#11141f] shadow-2xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <button
          type="button"
          onClick={onClose}
          className="icon-btn absolute right-3 top-3 z-10 text-white"
          aria-label="Close"
        >
          <X size={19} />
        </button>

        {mode === 'create' ? (
          <div
            className="flex min-h-[460px] flex-col justify-between p-5"
            style={{ background: `linear-gradient(160deg, ${background}, #0d0f19)` }}
          >
            <p className="pt-2 text-[14px] font-semibold text-white">New status</p>
            <textarea
              autoFocus
              value={text}
              maxLength={180}
              onChange={(event) => setText(event.target.value)}
              placeholder="Share something..."
              className="min-h-[140px] w-full resize-none bg-transparent text-[20px] leading-relaxed text-white outline-none placeholder:text-white/60"
            />
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {BACKGROUNDS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setBackground(color)}
                    className={`h-7 w-7 rounded-full border-2 ${
                      background === color ? 'border-white' : 'border-white/30'
                    }`}
                    style={{ backgroundColor: color }}
                    aria-label={`Background ${color}`}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  onChange={pickImage}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="grid h-11 w-11 place-items-center rounded-xl border border-white/20 bg-white/10 text-white"
                  aria-label="Add photo status"
                >
                  <ImagePlus size={18} />
                </button>
                <button
                  type="button"
                  onClick={submitText}
                  disabled={!text.trim() || busy}
                  className="btn-accent flex h-11 flex-1 items-center justify-center gap-2 rounded-xl text-[13px] font-semibold text-white disabled:opacity-40"
                >
                  <Send size={15} />
                  Share
                </button>
              </div>
            </div>
          </div>
        ) : story ? (
          <>
            <div
              className="relative flex min-h-[480px] flex-col justify-end p-5"
              style={
                story.kind === 'image'
                  ? undefined
                  : { background: `linear-gradient(160deg, ${story.background}, #0d0f19)` }
              }
            >
              {story.kind === 'image' && (
                <img src={story.imageUrl} alt="Status" className="absolute inset-0 h-full w-full object-cover" />
              )}
              <div className="absolute inset-x-0 top-0 flex gap-1 p-3">
                {stories.map((item, i) => (
                  <span
                    key={item.id}
                    className={`h-0.5 flex-1 rounded-full ${i <= current ? 'bg-white' : 'bg-white/30'}`}
                  />
                ))}
              </div>
              <div className="relative flex items-end justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-semibold text-white drop-shadow">
                    {mine ? 'My status' : group.name}
                  </p>
                  <p className="text-[11px] text-white/70">
                    {new Date(story.createdAt).toLocaleTimeString('en-IN', {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true,
                    })}
                    {mine && ` · ${story.viewedBy?.size || 0} views`}
                  </p>
                </div>
                {mine && (
                  <button
                    type="button"
                    onClick={async () => {
                      await onDelete(story.id)
                      onClose()
                    }}
                    className="icon-btn text-white hover:bg-white/10"
                    aria-label="Delete status"
                  >
                    <Trash2 size={17} />
                  </button>
                )}
              </div>
              {story.kind === 'text' && (
                <p className="relative mt-4 whitespace-pre-wrap break-words text-[21px] font-medium leading-relaxed text-white">
                  {story.text}
                </p>
              )}
            </div>
            <div className="flex h-12 items-center justify-between border-t border-white/10 bg-[#11141f] px-4">
              <button
                type="button"
                onClick={() => move(-1)}
                disabled={current === 0}
                className="icon-btn text-white disabled:opacity-30"
                aria-label="Previous status"
              >
                <ChevronLeft size={19} />
              </button>
              <span className="text-[11px] text-white/60">
                {current + 1} / {stories.length}
              </span>
              <button
                type="button"
                onClick={() => move(1)}
                className="icon-btn text-white"
                aria-label="Next status"
              >
                <ChevronRight size={19} />
              </button>
            </div>
          </>
        ) : null}
      </div>
    </div>,
    document.body
  )
}
