let context = null
let ringAudio = null
let ringToken = 0
let ringDataUrl = null

const soundEnabled = () =>
  typeof window === 'undefined' || window.localStorage.getItem('cw-sound') !== 'off'

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

const buildRingtoneUrl = () => {
  const rate = 8000
  const total = 1.6
  const tones = [
    [587.33, 0, 0.17],
    [783.99, 0.19, 0.17],
    [659.25, 0.43, 0.17],
    [880, 0.62, 0.3],
  ]
  const pcm = new Int16Array(Math.floor(rate * total))
  for (const [frequency, at, duration] of tones) {
    const from = Math.floor(at * rate)
    const to = Math.floor((at + duration) * rate)
    for (let i = from; i < to && i < pcm.length; i += 1) {
      const t = (i - from) / rate
      const envelope = Math.min(1, t / 0.01) * Math.min(1, (duration - t) / 0.04)
      pcm[i] += Math.sin(2 * Math.PI * frequency * t) * 11000 * Math.max(0, envelope)
    }
  }

  const buffer = new ArrayBuffer(44 + pcm.length * 2)
  const view = new DataView(buffer)
  const write = (offset, text) => {
    for (let i = 0; i < text.length; i += 1) view.setUint8(offset + i, text.charCodeAt(i))
  }
  write(0, 'RIFF')
  view.setUint32(4, 36 + pcm.length * 2, true)
  write(8, 'WAVE')
  write(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, rate, true)
  view.setUint32(28, rate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  write(36, 'data')
  view.setUint32(40, pcm.length * 2, true)
  for (let i = 0; i < pcm.length; i += 1) view.setInt16(44 + i * 2, pcm[i], true)

  let binary = ''
  const bytes = new Uint8Array(buffer)
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return `data:audio/wav;base64,${btoa(binary)}`
}

export const startRingtone = () => {
  if (!soundEnabled()) return
  if (!ringDataUrl) ringDataUrl = buildRingtoneUrl()
  if (!ringAudio) {
    ringAudio = new Audio(ringDataUrl)
    ringAudio.loop = true
    ringAudio.volume = 0.6
  }
  const token = ++ringToken
  ringAudio.currentTime = 0
  ringAudio.play().then(() => {
    if (token !== ringToken) ringAudio?.pause()
  }).catch(() => {})
}

export const stopRingtone = () => {
  ringToken += 1
  if (!ringAudio) return
  ringAudio.pause()
  ringAudio.currentTime = 0
  ringAudio.removeAttribute('src')
  ringAudio.load()
  ringAudio = null
}
