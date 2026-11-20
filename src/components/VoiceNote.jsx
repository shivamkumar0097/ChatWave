import { useEffect, useMemo, useRef, useState } from 'react'
import { Pause, Play } from 'lucide-react'

const BAR_COUNT = 32

const formatTime = (seconds) => {
  if (!Number.isFinite(seconds)) return '0:00'
  const minutes = Math.floor(seconds / 60)
  const rest = Math.floor(seconds % 60)
  return `${minutes}:${String(rest).padStart(2, '0')}`
}

const seedFrom = (value) => {
  let hash = 0
  for (const char of value || 'voice') hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return hash
}

export default function VoiceNote({ url, mine = false }) {
  const audioRef = useRef(null)
  const [playing, setPlaying] = useState(false)
  const [current, setCurrent] = useState(0)
  const [duration, setDuration] = useState(0)

  const bars = useMemo(() => {
    const base = seedFrom(url) || 7
    return Array.from({ length: BAR_COUNT }, (_, index) => {
      const value = (base * (index + 37) * 1103515245 + index * 12345) >>> 0
      const wave = 0.35 + ((value >>> 16) % 100) / 140
      const envelope = 0.6 + Math.sin((index / BAR_COUNT) * Math.PI) * 0.4
      return Math.round(Math.min(1, wave * envelope) * 100)
    })
  }, [url])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return undefined
    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    const onEnded = () => {
      setPlaying(false)
      setCurrent(0)
    }
    const onTime = () => setCurrent(audio.currentTime)
    const onMeta = () => setDuration(audio.duration || 0)
    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)
    audio.addEventListener('ended', onEnded)
    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('loadedmetadata', onMeta)
    return () => {
      audio.pause()
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
      audio.removeEventListener('ended', onEnded)
      audio.removeEventListener('timeupdate', onTime)
      audio.removeEventListener('loadedmetadata', onMeta)
    }
  }, [url])

  const toggle = () => {
    const audio = audioRef.current
    if (!audio) return
    if (audio.paused) audio.play().catch(() => {})
    else audio.pause()
  }

  const progress = duration ? current / duration : 0
  const color = mine ? 'bg-white' : 'bg-wa-green'

  return (
    <div className={`mb-1 flex w-full min-w-56 items-center gap-2.5 ${mine ? 'text-white' : 'text-wa-text'}`}>
      <audio ref={audioRef} src={url} preload="metadata" className="hidden" />
      <button
        type="button"
        onClick={toggle}
        className={`grid h-9 w-9 shrink-0 place-items-center rounded-full transition-transform active:scale-90 ${
          mine ? 'bg-white/20' : 'bg-wa-green/15'
        }`}
        aria-label={playing ? 'Pause voice note' : 'Play voice note'}
      >
        {playing ? <Pause size={15} /> : <Play size={15} className="ml-0.5" />}
      </button>
      <div className="flex h-9 min-w-0 flex-1 items-center gap-[2px]">
        {bars.map((height, index) => {
          const passed = index / BAR_COUNT <= progress
          return (
            <span
              key={index}
              className={`voice-bar flex-1 rounded-full ${passed ? color : mine ? 'bg-white/30' : 'bg-wa-green/30'} ${
                playing ? 'voice-bar-playing' : ''
              }`}
              style={{
                height: `${Math.max(12, height)}%`,
                animationDelay: `${(index % 8) * 60}ms`,
              }}
            />
          )
        })}
      </div>
      <span className={`shrink-0 text-[10px] tabular-nums ${mine ? 'text-white/75' : 'text-wa-muted'}`}>
        {formatTime(playing || current ? current : duration)}
      </span>
    </div>
  )
}
