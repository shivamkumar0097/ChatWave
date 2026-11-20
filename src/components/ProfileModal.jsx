import { useRef, useState } from 'react'
import {
  Bell,
  BellOff,
  CalendarDays,
  Camera,
  Check,
  CheckCheck,
  Loader2,
  LogOut,
  Mail,
  Monitor,
  Palette,
  Settings,
  Sparkles,
  UserRound,
  Vibrate,
  X,
} from 'lucide-react'
import Avatar from '@/components/Avatar'
import { supabase } from '@/lib/supabase'

const COLORS = [
  '#7c5cff',
  '#22d3ee',
  '#00a884',
  '#f472b6',
  '#f59e0b',
  '#ef4444',
  '#3b82f6',
  '#8b5cf6',
]

const readBool = (key, fallback) => {
  if (typeof window === 'undefined') return fallback
  const value = window.localStorage.getItem(key)
  if (value === null) return fallback
  return value === '1'
}

const writeBool = (key, value) => {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(key, value ? '1' : '0')
}

const joinedLabel = (iso) => {
  if (!iso) return 'Recently'
  return new Date(iso).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
}

function SettingRow({ icon: Icon, title, description, value, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center gap-3 px-3.5 py-3 text-left transition-colors hover:bg-white/[0.04]"
    >
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-wa-green/10 text-wa-green">
        <Icon size={16} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-medium text-wa-text">{title}</span>
        <span className="mt-0.5 block text-[11px] leading-relaxed text-wa-muted">
          {description}
        </span>
      </span>
      <span
        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
          value ? 'bg-wa-green' : 'bg-white/15'
        }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${
            value ? 'left-[18px]' : 'left-0.5'
          }`}
        />
      </span>
    </button>
  )
}

export default function ProfileModal({
  user,
  currentName,
  currentAvatarUrl,
  currentBio = '',
  currentColor = '#7c5cff',
  initialTab = 'profile',
  soundOn = true,
  onToggleSound,
  onClose,
  onSaved,
  onSignOut,
}) {
  const [tab, setTab] = useState(initialTab)
  const [name, setName] = useState(currentName || '')
  const [bio, setBio] = useState(currentBio || '')
  const [color, setColor] = useState(currentColor || '#7c5cff')
  const [preview, setPreview] = useState('')
  const [removed, setRemoved] = useState(false)
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [note, setNote] = useState('')
  const [readReceipts, setReadReceipts] = useState(() => readBool('cw-read-receipts', true))
  const [haptics, setHaptics] = useState(() => readBool('cw-haptics', true))
  const [reduceMotion, setReduceMotion] = useState(() => readBool('cw-reduce-motion', false))
  const [desktopNotifs, setDesktopNotifs] = useState(() =>
    readBool('cw-desktop-notifications', false)
  )
  const fileRef = useRef(null)

  const displayAvatar = removed ? '' : preview || currentAvatarUrl || ''

  const pickFile = (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file.')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('Image must be under 2 MB.')
      return
    }
    setError('')
    setNote('')
    setRemoved(false)
    setPreview(URL.createObjectURL(file))
  }

  const removeAvatar = () => {
    setPreview('')
    setRemoved(true)
    setError('')
    setNote('')
    if (fileRef.current) fileRef.current.value = ''
  }

  const save = async (event) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    setNote('')
    setSaved(false)

    let nextAvatarUrl = removed ? null : currentAvatarUrl || null
    const file = fileRef.current?.files?.[0]

    if (file) {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'png'
      const path = `${user.id}/avatar-${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { contentType: file.type, upsert: true })

      if (uploadError) {
        setBusy(false)
        setError(uploadError.message)
        return
      }

      nextAvatarUrl = supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl
    }

    const payload = {
      name: name.trim() || currentName,
      avatar_url: nextAvatarUrl,
      avatar_color: color,
      bio: bio.trim(),
    }

    let { error: updateError } = await supabase
      .from('profiles')
      .update(payload)
      .eq('id', user.id)

    if (updateError) {
      // bio column not migrated yet (schema7.sql not applied) — save the rest
      const legacy = {
        name: payload.name,
        avatar_url: payload.avatar_url,
        avatar_color: payload.avatar_color,
      }
      const retry = await supabase.from('profiles').update(legacy).eq('id', user.id)
      if (retry.error) {
        setBusy(false)
        setError(retry.error.message)
        return
      }
      setNote('About was not saved — run supabase/schema7.sql to enable it.')
    }

    setBusy(false)
    setSaved(true)
    setPreview(nextAvatarUrl || '')
    setRemoved(false)
    if (fileRef.current) fileRef.current.value = ''
    await onSaved?.()
    window.setTimeout(() => setSaved(false), 2600)
  }

  const toggleReadReceipts = () => {
    const next = !readReceipts
    setReadReceipts(next)
    writeBool('cw-read-receipts', next)
  }

  const toggleHaptics = () => {
    const next = !haptics
    setHaptics(next)
    writeBool('cw-haptics', next)
  }

  const toggleReduceMotion = () => {
    const next = !reduceMotion
    setReduceMotion(next)
    writeBool('cw-reduce-motion', next)
    document.documentElement.classList.toggle('reduce-motion', next)
  }

  const toggleDesktopNotifs = async () => {
    if (
      !desktopNotifs &&
      typeof Notification !== 'undefined' &&
      Notification.permission === 'default'
    ) {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') return
    }
    const next = !desktopNotifs
    setDesktopNotifs(next)
    writeBool('cw-desktop-notifications', next)
  }

  const tabs = [
    { key: 'profile', icon: UserRound, label: 'Profile' },
    { key: 'settings', icon: Settings, label: 'Settings' },
  ]

  return (
    <div className="animate-fade-in fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-md">
      <div
        className="animate-pop-in flex max-h-[calc(100vh-2rem)] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-white/[0.08] bg-[#0f1220]/95 shadow-[0_40px_100px_-30px_rgba(0,0,0,0.95)]"
        role="dialog"
        aria-modal="true"
        aria-label="Profile and settings"
      >
        <header className="relative shrink-0 overflow-hidden border-b border-white/[0.06] px-5 pb-3.5 pt-4">
          <div className="pointer-events-none absolute -right-10 -top-14 h-36 w-36 rounded-full bg-[#7c5cff]/30 blur-3xl" />
          <div className="pointer-events-none absolute -left-8 top-8 h-24 w-24 rounded-full bg-[#22d3ee]/15 blur-3xl" />

          <div className="relative flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="ring-gradient grid h-9 w-9 place-items-center rounded-2xl shadow-[0_10px_26px_-12px_rgba(124,92,255,0.9)]">
                <UserRound size={17} className="text-white" />
              </span>
              <div>
                <h2 className="text-[14px] font-semibold tracking-tight text-wa-text">
                  Profile & settings
                </h2>
                <p className="text-[10.5px] text-wa-muted">
                  Your identity, your preferences
                </p>
              </div>
            </div>
            <button type="button" onClick={onClose} className="icon-btn" aria-label="Close">
              <X size={18} />
            </button>
          </div>

          <div className="relative mt-3 flex gap-1 rounded-xl border border-white/[0.06] bg-white/[0.03] p-1">
            {tabs.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setTab(item.key)}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-[12px] font-medium transition-colors ${
                  tab === item.key
                    ? 'bg-white/[0.09] text-white shadow-sm'
                    : 'text-wa-muted hover:text-wa-text'
                }`}
              >
                <item.icon size={14} />
                {item.label}
              </button>
            ))}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          {tab === 'profile' ? (
            <form onSubmit={save} className="space-y-5 px-5 py-5">
              <div className="flex flex-col items-center gap-3">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="group relative rounded-full"
                  aria-label="Change photo"
                >
                  <div className="ring-gradient rounded-full p-[2px] shadow-[0_16px_40px_-16px_rgba(124,92,255,0.9)]">
                    <div className="rounded-full bg-[#0f1220] p-[3px]">
                      <Avatar
                        name={name || currentName}
                        src={displayAvatar}
                        color={color}
                        size="xl"
                      />
                    </div>
                  </div>
                  <span className="absolute inset-0 grid place-items-center rounded-full bg-black/55 text-white opacity-0 transition-opacity group-hover:opacity-100">
                    <Camera size={22} />
                  </span>
                  <span className="absolute -bottom-0.5 -right-0.5 grid h-8 w-8 place-items-center rounded-full border-4 border-[#0f1220] bg-gradient-to-br from-[#8b5cf6] to-[#22d3ee] text-white shadow-lg transition-transform group-hover:scale-110">
                    <Camera size={13} />
                  </span>
                </button>

                <div className="text-center">
                  <p className="truncate text-[15px] font-semibold text-wa-text">
                    {name.trim() || currentName}
                  </p>
                  <p className="text-[11.5px] text-wa-muted">{user.email}</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="rounded-full border border-white/[0.1] bg-white/[0.04] px-3 py-1 text-[11px] font-medium text-wa-text transition-colors hover:bg-white/[0.08]"
                  >
                    Change photo
                  </button>
                  {displayAvatar && (
                    <button
                      type="button"
                      onClick={removeAvatar}
                      className="rounded-full border border-red-400/25 bg-red-500/10 px-3 py-1 text-[11px] font-medium text-red-300 transition-colors hover:bg-red-500/15"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>

              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={pickFile}
                className="hidden"
              />

              <label className="block">
                <span className="mb-1.5 block text-[11px] font-medium text-wa-muted">
                  Display name
                </span>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  maxLength={40}
                  placeholder="Your name"
                  className="input-luxe"
                />
              </label>

              <label className="block">
                <span className="flex items-center justify-between">
                  <span className="mb-1.5 block text-[11px] font-medium text-wa-muted">
                    About
                  </span>
                  <span className="mb-1.5 text-[10.5px] tabular-nums text-wa-muted/80">
                    {bio.length}/140
                  </span>
                </span>
                <textarea
                  value={bio}
                  onChange={(event) => setBio(event.target.value)}
                  maxLength={140}
                  rows={3}
                  placeholder="A short line about you..."
                  className="input-luxe min-h-[84px] resize-none leading-relaxed"
                />
              </label>

              <div>
                <span className="flex items-center gap-1.5 text-[11px] font-medium text-wa-muted">
                  <Palette size={13} />
                  Avatar color
                </span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {COLORS.map((swatch) => (
                    <button
                      key={swatch}
                      type="button"
                      onClick={() => setColor(swatch)}
                      aria-label={`Use color ${swatch}`}
                      aria-pressed={color === swatch}
                      className={`grid h-8 w-8 place-items-center rounded-full transition-transform hover:scale-110 ${
                        color === swatch
                          ? 'ring-2 ring-white/80 ring-offset-2 ring-offset-[#0f1220]'
                          : ''
                      }`}
                      style={{
                        backgroundImage: `linear-gradient(140deg, ${swatch}, ${swatch}99 60%, #22d3ee88)`,
                      }}
                    >
                      {color === swatch && <Check size={14} className="text-white" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2.5 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-3">
                <div className="flex items-center gap-2.5 text-[12px]">
                  <Mail size={14} className="shrink-0 text-wa-green" />
                  <span className="text-wa-muted">Email</span>
                  <span className="ml-auto max-w-[180px] truncate text-wa-text">
                    {user.email}
                  </span>
                </div>
                <div className="flex items-center gap-2.5 text-[12px]">
                  <CalendarDays size={14} className="shrink-0 text-wa-green" />
                  <span className="text-wa-muted">Member since</span>
                  <span className="ml-auto text-wa-text">{joinedLabel(user.created_at)}</span>
                </div>
              </div>

              {error && (
                <p className="rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-[11.5px] text-red-300">
                  {error}
                </p>
              )}
              {note && (
                <p className="rounded-lg border border-amber-400/25 bg-amber-400/10 px-3 py-2 text-[11.5px] text-amber-200">
                  {note}
                </p>
              )}

              <button
                type="submit"
                disabled={busy}
                className="btn-accent flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-[13px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busy ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : saved ? (
                  <Check size={15} />
                ) : (
                  <Sparkles size={15} />
                )}
                {busy ? 'Saving...' : saved ? 'Saved!' : 'Save changes'}
              </button>
            </form>
          ) : (
            <div className="space-y-4 px-5 py-5">
              <p className="text-[11px] leading-relaxed text-wa-muted">
                Preferences are saved automatically on this device.
              </p>

              <div className="divide-y divide-white/[0.06] overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02]">
                <SettingRow
                  icon={soundOn ? Bell : BellOff}
                  title="Notification sounds"
                  description="Play a sound when a new message arrives"
                  value={soundOn}
                  onToggle={onToggleSound}
                />
                <SettingRow
                  icon={Monitor}
                  title="Desktop notifications"
                  description="Show a browser alert when a message arrives while this tab is hidden"
                  value={desktopNotifs}
                  onToggle={toggleDesktopNotifs}
                />
                <SettingRow
                  icon={CheckCheck}
                  title="Read receipts"
                  description="Let others see when you have read their messages"
                  value={readReceipts}
                  onToggle={toggleReadReceipts}
                />
                <SettingRow
                  icon={Vibrate}
                  title="Haptic feedback"
                  description="Vibrate on swipe-to-reply and long-press"
                  value={haptics}
                  onToggle={toggleHaptics}
                />
                <SettingRow
                  icon={Sparkles}
                  title="Reduce motion"
                  description="Tone down animations and transitions"
                  value={reduceMotion}
                  onToggle={toggleReduceMotion}
                />
              </div>

              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-3">
                <p className="text-[11px] font-medium text-wa-muted">Signed in as</p>
                <p className="mt-0.5 truncate text-[12.5px] text-wa-text">{user.email}</p>
              </div>

              {onSignOut && (
                <button
                  type="button"
                  onClick={() => {
                    onClose()
                    onSignOut()
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-400/25 bg-red-500/10 py-2.5 text-[13px] font-semibold text-red-300 transition-colors hover:bg-red-500/15"
                >
                  <LogOut size={15} />
                  Log out
                </button>
              )}

              <p className="pb-1 text-center text-[10.5px] text-wa-muted/70">
                ChatWave - v0.1
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
