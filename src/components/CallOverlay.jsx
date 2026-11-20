import { useEffect, useRef, useState } from 'react'
import { Mic, MicOff, PhoneOff, Video } from 'lucide-react'

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

  return (
    <>
      {incoming && (
        <div className="animate-fade-in fixed inset-0 z-[120] flex items-center justify-center bg-black/75 p-4 backdrop-blur-md">
          <div className="glass-strong animate-pop-in w-full max-w-xs rounded-3xl p-6 text-center shadow-[0_30px_80px_-30px_rgba(0,0,0,0.95)]">
            <div className="ring-gradient mx-auto w-fit rounded-full p-[2px]">
              <div className="grid h-20 w-20 place-items-center rounded-full bg-[#11141f] text-xl font-semibold">
                {initialsOf(incoming.peerName)}
              </div>
            </div>
            <h2 className="mt-4 truncate text-[18px] font-semibold">{incoming.peerName}</h2>
            <p className="mt-1 flex items-center justify-center gap-1.5 text-[12px] text-wa-muted">
              {incoming.withVideo ? <Video size={14} /> : <Mic size={14} />}
              Incoming {incoming.withVideo ? 'video' : 'audio'} call
            </p>
            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={onDecline}
                className="grid h-12 w-12 place-items-center rounded-full bg-red-500/20 text-red-200 transition-colors hover:bg-red-500/35"
                aria-label="Decline call"
              >
                <PhoneOff size={20} />
              </button>
              <button
                type="button"
                onClick={onAccept}
                className="btn-accent grid h-12 w-12 place-items-center rounded-full text-white"
                aria-label="Accept call"
              >
                <Mic size={20} />
              </button>
            </div>
          </div>
        </div>
      )}

      {call && (
        <div className="animate-fade-in fixed inset-0 z-[120] flex flex-col items-center justify-center bg-[#05060c]/95 p-4 backdrop-blur-xl">
          <div className="relative flex w-full max-w-3xl flex-col items-center justify-center gap-6">
            {call.withVideo && (
              <div className="relative w-full">
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="max-h-[68vh] w-full rounded-3xl bg-black object-contain shadow-2xl"
                />
                {localStream && (
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="absolute bottom-3 right-3 h-28 w-20 rounded-xl border border-white/15 bg-black object-cover shadow-lg"
                  />
                )}
              </div>
            )}

            {!call.withVideo && (
              <>
                {remoteStream && <audio ref={remoteAudioRef} autoPlay playsInline />}
                <div className="ring-gradient rounded-full p-[3px]">
                  <div className="grid h-28 w-28 place-items-center rounded-full bg-[#11141f] text-3xl font-semibold">
                    {initialsOf(call.peerName)}
                  </div>
                </div>
              </>
            )}

            <div className="text-center">
              <h2 className="text-[20px] font-semibold tracking-tight">{call.peerName}</h2>
              <p className="mt-1 text-[12.5px] text-wa-muted">
                {call.phase === 'connected'
                  ? formatDuration(seconds)
                  : call.phase === 'calling'
                    ? 'Calling...'
                    : 'Connecting...'}
              </p>
            </div>

            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={onToggleMute}
                className={`grid h-12 w-12 place-items-center rounded-full border transition-colors ${
                  call.muted
                    ? 'border-white/10 bg-white/10 text-white'
                    : 'border-white/10 bg-white/[0.04] text-wa-text hover:bg-white/10'
                }`}
                aria-label={call.muted ? 'Unmute microphone' : 'Mute microphone'}
              >
                {call.muted ? <MicOff size={19} /> : <Mic size={19} />}
              </button>
              <button
                type="button"
                onClick={onEnd}
                className="grid h-12 w-12 place-items-center rounded-full bg-red-500 text-white transition-colors hover:bg-red-400"
                aria-label="End call"
              >
                <PhoneOff size={20} />
              </button>
            </div>
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
