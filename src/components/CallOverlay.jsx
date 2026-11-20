import { useEffect, useRef, useState } from 'react'
import { Mic, MicOff, Phone, PhoneOff, Video } from 'lucide-react'

const formatDuration = (total) => {
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

const initialsOf = (name) =>
  (name || '?')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

function CallAvatar({ name, src, color }) {
  const [failed, setFailed] = useState(false)
  return (
    <div
      className="grid h-28 w-28 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-emerald-400/40 to-teal-500/20 text-3xl font-semibold ring-4 ring-emerald-300/20"
      style={color ? { backgroundImage: `linear-gradient(140deg, ${color}, #22d3ee88)` } : undefined}
    >
      {src && !failed ? (
        <img
          src={src}
          alt={name}
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        initialsOf(name)
      )}
    </div>
  )
}

export default function CallOverlay({
  incoming,
  call,
  localStream,
  remoteStream,
  notice,
  onAccept,
  onDecline,
  onEnd,
  onToggleMute,
}) {
  const remoteVideoRef = useRef(null)
  const remoteAudioRef = useRef(null)
  const localVideoRef = useRef(null)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!remoteStream) return
    const node = call?.withVideo ? remoteVideoRef.current : remoteAudioRef.current
    if (node) node.srcObject = remoteStream
  }, [remoteStream, call?.withVideo])

  useEffect(() => {
    if (!localStream || !call?.withVideo || !localVideoRef.current) return
    localVideoRef.current.srcObject = localStream
  }, [localStream, call?.withVideo])

  useEffect(() => {
    if (!call?.startedAt) return undefined
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [call?.startedAt])

  if (!incoming && !call && !notice) return null

  const seconds = call?.startedAt ? Math.max(0, Math.floor((now - call.startedAt) / 1000)) : 0
  const callBackground =
    'bg-[radial-gradient(circle_at_50%_0%,#1d3b32_0%,#0d1a16_55%,#050a08_100%)]'

  return (
    <>
      {incoming && (
        <div
          className={`animate-fade-in fixed inset-0 z-[120] flex flex-col items-center justify-between px-6 py-14 text-white ${callBackground}`}
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-200/60">
            ChatWave
          </p>

          <div className="flex flex-col items-center gap-5 text-center">
            <div className="relative grid place-items-center">
              <span className="absolute h-56 w-56 animate-ping rounded-full bg-emerald-400/10" />
              <span className="absolute h-44 w-44 rounded-full border border-emerald-300/15" />
              <CallAvatar
                name={incoming.peerName}
                src={incoming.avatarUrl}
                color={incoming.avatarColor}
              />
            </div>
            <h2 className="text-[30px] font-medium tracking-tight">{incoming.peerName}</h2>
            <p className="flex items-center gap-1.5 text-[13px] text-emerald-100/70">
              {incoming.withVideo ? <Video size={15} /> : <Mic size={15} />}
              Incoming {incoming.withVideo ? 'video' : 'voice'} call...
            </p>
          </div>

          <div className="flex w-full max-w-xs items-start justify-center gap-16">
            <button type="button" onClick={onDecline} className="flex flex-col items-center gap-2">
              <span className="grid h-16 w-16 place-items-center rounded-full bg-red-500 shadow-[0_12px_30px_-8px_rgba(239,68,68,0.8)] transition-transform hover:scale-105">
                <PhoneOff size={26} />
              </span>
              <span className="text-[12px] text-white/70">Decline</span>
            </button>
            <button type="button" onClick={onAccept} className="flex flex-col items-center gap-2">
              <span className="grid h-16 w-16 place-items-center rounded-full bg-emerald-500 shadow-[0_12px_30px_-8px_rgba(16,185,129,0.8)] transition-transform hover:scale-105">
                <Phone size={26} />
              </span>
              <span className="text-[12px] text-white/70">Answer</span>
            </button>
          </div>
        </div>
      )}

      {call && (
        <div
          className={`animate-fade-in fixed inset-0 z-[120] flex flex-col items-center justify-center gap-8 px-6 py-10 text-white ${callBackground}`}
        >
          <p
            className={`text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-200/60 ${
              call.withVideo ? 'max-sm:hidden' : ''
            }`}
          >
            {call.role === 'caller' ? 'Calling' : 'In call'}
          </p>

          {call.withVideo && (
            <div className="relative w-full max-w-3xl max-sm:fixed max-sm:inset-0 max-sm:z-0">
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="max-h-[64vh] w-full rounded-3xl bg-black object-contain shadow-2xl max-sm:h-full max-sm:max-h-none max-sm:w-full max-sm:rounded-none max-sm:object-cover max-sm:shadow-none"
              />
              {localStream && (
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="absolute bottom-3 right-3 h-28 w-20 rounded-xl border border-white/15 bg-black object-cover shadow-lg max-sm:bottom-24 max-sm:h-36 max-sm:w-24"
                />
              )}
            </div>
          )}

          {!call.withVideo && (
            <>
              {remoteStream && <audio ref={remoteAudioRef} autoPlay playsInline />}
              <div className="relative grid place-items-center">
                <span className="absolute h-44 w-44 rounded-full border border-emerald-300/10" />
                <CallAvatar
                  name={call.peerName}
                  src={call.avatarUrl}
                  color={call.avatarColor}
                />
              </div>
            </>
          )}

          <div className="text-center max-sm:absolute max-sm:bottom-28 max-sm:left-0 max-sm:right-0 max-sm:z-10">
            <h2 className="text-[26px] font-medium tracking-tight drop-shadow-lg">{call.peerName}</h2>
            <p className="mt-1 text-[13px] text-emerald-100/70">
              {call.phase === 'connected'
                ? formatDuration(seconds)
                : call.phase === 'calling'
                  ? 'Ringing...'
                  : 'Connecting...'}
            </p>
          </div>

          <div className="flex w-full max-w-xs items-start justify-center gap-16 max-sm:absolute max-sm:bottom-8 max-sm:left-1/2 max-sm:z-10 max-sm:-translate-x-1/2">
            <button
              type="button"
              onClick={onToggleMute}
              className="flex flex-col items-center gap-2"
            >
              <span
                className={`grid h-14 w-14 place-items-center rounded-full transition-transform hover:scale-105 ${
                  call.muted ? 'bg-white/20' : 'bg-white/10'
                }`}
              >
                {call.muted ? <MicOff size={22} /> : <Mic size={22} />}
              </span>
              <span className="text-[12px] text-white/70">{call.muted ? 'Unmute' : 'Mute'}</span>
            </button>
            <button type="button" onClick={onEnd} className="flex flex-col items-center gap-2">
              <span className="grid h-14 w-14 place-items-center rounded-full bg-red-500 shadow-[0_12px_30px_-8px_rgba(239,68,68,0.8)] transition-transform hover:scale-105">
                <PhoneOff size={22} />
              </span>
              <span className="text-[12px] text-white/70">End</span>
            </button>
          </div>
        </div>
      )}

      {notice && (
        <div className="animate-pop-in fixed bottom-6 left-1/2 z-[130] -translate-x-1/2 rounded-full border border-white/10 bg-[#151827]/95 px-4 py-2 text-[12px] text-wa-text shadow-xl backdrop-blur">
          {notice}
        </div>
      )}
    </>
  )
}
