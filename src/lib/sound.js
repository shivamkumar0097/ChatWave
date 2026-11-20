let context = null

const getContext = () => {
  if (typeof window === 'undefined') return null
  const Ctor = window.AudioContext || window.webkitAudioContext
  if (!Ctor) return null
  if (!context) context = new Ctor()
  return context
}

const run = (ctx, play) => {
  if (ctx.state === 'suspended') {
    ctx.resume().then(() => play(ctx)).catch(() => {})
    return
  }
  play(ctx)
}

const note = (ctx, frequency, start, duration, volume) => {
  const oscillator = ctx.createOscillator()
  const gain = ctx.createGain()

  oscillator.type = 'sine'
  oscillator.frequency.value = frequency
  gain.gain.setValueAtTime(0.0001, start)
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)

  oscillator.connect(gain)
  gain.connect(ctx.destination)
  oscillator.start(start)
  oscillator.stop(start + duration + 0.02)
}

export const playNotification = () => {
  const ctx = getContext()
  if (!ctx) return

  run(ctx, (audio) => {
    const now = audio.currentTime
    note(audio, 880, now, 0.16, 0.055)
    note(audio, 1174.66, now + 0.11, 0.22, 0.045)
  })
}

export const playSendSound = () => {
  const ctx = getContext()
  if (!ctx) return

  run(ctx, (audio) => {
    const now = audio.currentTime

    const oscillator = audio.createOscillator()
    const gain = audio.createGain()
    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(660, now)
    oscillator.frequency.exponentialRampToValueAtTime(1120, now + 0.055)
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(0.05, now + 0.012)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.095)
    oscillator.connect(gain)
    gain.connect(audio.destination)
    oscillator.start(now)
    oscillator.stop(now + 0.1)

    const soft = audio.createOscillator()
    const softGain = audio.createGain()
    soft.type = 'triangle'
    soft.frequency.setValueAtTime(1320, now)
    soft.frequency.exponentialRampToValueAtTime(1900, now + 0.04)
    softGain.gain.setValueAtTime(0.0001, now)
    softGain.gain.exponentialRampToValueAtTime(0.012, now + 0.008)
    softGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.055)
    soft.connect(softGain)
    softGain.connect(audio.destination)
    soft.start(now)
    soft.stop(now + 0.06)
  })
}
