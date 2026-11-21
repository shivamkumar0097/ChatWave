import { useEffect, useRef, useState } from 'react'
import {
  CornerUpLeft,
  FileText,
  Image as ImageIcon,
  Loader2,
  Mic,
  Music,
  Paperclip,
  Pencil,
  Send,
  Smile,
  Trash2,
  Video,
  X,
} from 'lucide-react'
import 'emoji-picker-element'

const formatBytes = (bytes) => {
  if (!bytes) return ''
  const units = ['B', 'KB', 'MB', 'GB']
  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit += 1
  }
  return `${value.toFixed(value >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`
}

const formatDuration = (seconds) => {
  const safe = Math.max(0, seconds || 0)
  const minutes = Math.floor(safe / 60)
  return `${String(minutes).padStart(2, '0')}:${String(safe % 60).padStart(2, '0')}`
}

const FILE_ICONS = {
  image: ImageIcon,
  video: Video,
  audio: Music,
  document: FileText,
}

export default function Composer({
  onSend,
  onTyping,
  onSendAttachment,
  uploading = false,
  replyTo = null,
  replyAuthorName = '',
  onCancelReply,
  draftKey = '',
  editing = null,
  onEdit,
  onCancelEdit,
}) {
  const [text, setText] = useState('')
  const [emojiOpen, setEmojiOpen] = useState(false)
  const [attachOpen, setAttachOpen] = useState(false)
  const [pending, setPending] = useState(null)
  const [recording, setRecording] = useState(null)
  const [recordError, setRecordError] = useState('')
  const lastTypingSent = useRef(0)
  const imageRef = useRef(null)
  const videoRef = useRef(null)
  const audioRef = useRef(null)
  const docRef = useRef(null)
  const inputRef = useRef(null)
  const pickerRef = useRef(null)
  const wrapRef = useRef(null)
  const attachWrapRef = useRef(null)
  const textRef = useRef('')
  const recorderRef = useRef(null)
  const streamRef = useRef(null)
  const chunksRef = useRef([])
  const discardRef = useRef(false)
  const timerRef = useRef(null)
  const canSend = (Boolean(text.trim()) || Boolean(pending)) && !uploading
  const PendingIcon = pending ? FILE_ICONS[pending.kind] || FileText : FileText
  const attachOptions = [
    { key: 'image', label: 'Photo', icon: ImageIcon, ref: imageRef },
    { key: 'video', label: 'Video', icon: Video, ref: videoRef },
    { key: 'audio', label: 'Audio', icon: Music, ref: audioRef },
    { key: 'document', label: 'Document', icon: FileText, ref: docRef },
  ]

  useEffect(() => {
    textRef.current = text
  }, [text])

  useEffect(() => {
    setPending((previous) => {
      if (previous?.url) URL.revokeObjectURL(previous.url)
      return null
    })
    setAttachOpen(false)
    if (editing) {
      setText(editing.text || '')
      setEmojiOpen(false)
      requestAnimationFrame(() => inputRef.current?.focus())
      return
    }
    const saved = draftKey && typeof window !== 'undefined' ? window.localStorage.getItem(draftKey) : ''
    setText(saved || '')
  }, [draftKey, editing])

  useEffect(
    () => () => {
      window.clearInterval(timerRef.current)
      if (recorderRef.current?.state === 'recording') {
        discardRef.current = true
        recorderRef.current.stop()
      }
      streamRef.current?.getTracks().forEach((track) => track.stop())
    },
    []
  )

  useEffect(() => {
    if (!emojiOpen) return undefined

    const close = (event) => {
      if (!wrapRef.current?.contains(event.target)) setEmojiOpen(false)
    }

    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [emojiOpen])

  useEffect(() => {
    if (!attachOpen) return undefined

    const close = (event) => {
      if (!attachWrapRef.current?.contains(event.target)) setAttachOpen(false)
    }

    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [attachOpen])

  useEffect(() => {
    const picker = pickerRef.current
    if (!emojiOpen || !picker) return undefined

    const handlePick = (event) => {
      const emoji = event.detail?.unicode
      if (!emoji) return
      const input = inputRef.current
      const value = textRef.current
      const start = input?.selectionStart ?? value.length
      const end = input?.selectionEnd ?? value.length
      const next = value.slice(0, start) + emoji + value.slice(end)
      textRef.current = next
      setText(next)
      requestAnimationFrame(() => {
        input?.focus()
        input?.setSelectionRange(start + emoji.length, start + emoji.length)
      })
    }

    picker.addEventListener('emoji-click', handlePick)
    return () => picker.removeEventListener('emoji-click', handlePick)
  }, [emojiOpen])

  const handleChange = (event) => {
    const value = event.target.value
    setText(value)
    if (!editing && draftKey) window.localStorage.setItem(draftKey, value)
    const now = Date.now()
    if (now - lastTypingSent.current > 1500 && value.trim()) {
      lastTypingSent.current = now
      onTyping?.()
    }
  }

  const clearPending = () => {
    if (pending?.url) URL.revokeObjectURL(pending.url)
    setPending(null)
  }

  const submit = (event) => {
    event.preventDefault()
    if (uploading || recording) return
    const value = text.trim()

    if (pending) {
      onSendAttachment?.(pending.file, {
        kind: pending.kind,
        caption: value,
        replyTo: replyTo?.id,
      })
      clearPending()
      setText('')
      if (draftKey) window.localStorage.removeItem(draftKey)
      setEmojiOpen(false)
      setAttachOpen(false)
      onCancelReply?.()
      return
    }

    if (!value) return

    if (editing) {
      onEdit?.(value)
      setText('')
      setEmojiOpen(false)
      onCancelEdit?.()
      return
    }

    onSend(value, replyTo ? { replyTo: replyTo.id } : undefined)
    setText('')
    if (draftKey) window.localStorage.removeItem(draftKey)
    setEmojiOpen(false)
    onCancelReply?.()
  }

  const pickAttachment = (event, kind) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (pending?.url) URL.revokeObjectURL(pending.url)
    setPending({ file, kind, url: URL.createObjectURL(file) })
    setAttachOpen(false)
    window.requestAnimationFrame(() => inputRef.current?.focus())
  }

  const startRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setRecordError('Voice notes are not supported in this browser.')
      window.setTimeout(() => setRecordError(''), 4000)
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const preferred = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'].find(
        (type) => MediaRecorder.isTypeSupported(type)
      )
      const recorder = new MediaRecorder(stream, preferred ? { mimeType: preferred } : undefined)
      chunksRef.current = []
      discardRef.current = false
      streamRef.current = stream

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data)
      }

      recorder.onstop = () => {
        streamRef.current?.getTracks().forEach((track) => track.stop())
        streamRef.current = null
        window.clearInterval(timerRef.current)
        timerRef.current = null
        setRecording(null)
        if (discardRef.current) return

        const type = recorder.mimeType || 'audio/webm'
        const blob = new Blob(chunksRef.current, { type })
        if (!blob.size) return
        const extension = type.includes('mp4') ? 'm4a' : type.includes('ogg') ? 'ogg' : 'webm'
        const file = new File([blob], `voice-${Date.now()}.${extension}`, { type })
        onSendAttachment?.(file, { kind: 'audio', caption: '', replyTo: replyTo?.id })
        onCancelReply?.()
      }

      recorder.start()
      recorderRef.current = recorder
      setRecording({ seconds: 0 })
      const startedAt = Date.now()
      timerRef.current = window.setInterval(() => {
        const seconds = Math.floor((Date.now() - startedAt) / 1000)
        if (seconds >= 300) {
          discardRef.current = false
          recorderRef.current?.stop()
          return
        }
        setRecording({ seconds })
      }, 250)
    } catch {
      setRecordError('Microphone access was blocked.')
      window.setTimeout(() => setRecordError(''), 4000)
    }
  }

  const stopRecording = (send) => {
    if (!recorderRef.current) return
    discardRef.current = !send
    recorderRef.current.stop()
  }

  return (
    <form
      onSubmit={submit}
      className="cw-composer animate-fade-up relative flex shrink-0 flex-col gap-2 border-t border-white/[0.05] bg-[#0a0c14]/80 px-2.5 py-2.5 backdrop-blur-xl sm:px-5"
    >
      {recordError && (
        <p className="w-full rounded-xl border border-red-400/25 bg-red-500/10 px-3 py-1.5 text-[11.5px] text-red-200">
          {recordError}
        </p>
      )}

      {pending && (
        <div className="animate-slide-down mb-0.5 flex w-full items-center gap-2.5 rounded-2xl border border-white/[0.08] bg-white/[0.035] p-2">
          {pending.kind === 'image' ? (
            <img
              src={pending.url}
              alt="Attachment preview"
              className="h-14 w-14 shrink-0 rounded-xl object-cover"
            />
          ) : (
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-wa-green/10 text-wa-green">
              <PendingIcon size={22} />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12.5px] font-medium text-wa-text">{pending.file.name}</p>
            <p className="mt-0.5 text-[11px] text-wa-muted">
              {formatBytes(pending.file.size)} ·{' '}
              {pending.kind === 'image'
                ? 'Photo'
                : pending.kind === 'video'
                  ? 'Video'
                  : pending.kind === 'audio'
                    ? 'Audio'
                    : 'Document'}
            </p>
          </div>
          <button
            type="button"
            onClick={clearPending}
            className="mr-1 text-wa-muted transition-colors hover:text-wa-text"
            aria-label="Remove attachment"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {editing && (
        <div className="animate-slide-down absolute inset-x-0 bottom-full mx-2 mb-1.5 flex items-start gap-2 rounded-t-xl border border-b-0 border-accent-2/30 border-l-[3px] border-l-accent-2 bg-[#12151f] px-3 py-2">
          <Pencil size={14} className="mt-0.5 shrink-0 text-accent-2" />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold text-accent-2">Editing message</p>
            <p className="truncate text-[12px] text-wa-muted">{editing.text}</p>
          </div>
          <button
            type="button"
            onClick={onCancelEdit}
            className="mt-0.5 text-wa-muted transition-colors hover:text-wa-text"
            aria-label="Cancel edit"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {!editing && replyTo && (
        <div className="animate-slide-down absolute inset-x-0 bottom-full mx-2 mb-1.5 flex items-start gap-2 rounded-t-xl border border-b-0 border-white/[0.08] border-l-[3px] border-l-wa-green bg-[#12151f] px-3 py-2">
          <CornerUpLeft size={14} className="mt-0.5 shrink-0 text-wa-green" />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold text-wa-green">
              {replyAuthorName || (replyTo.from === 'me' ? 'You' : 'Them')}
            </p>
            <p className="truncate text-[12px] text-wa-muted">
              {replyTo.imageUrl && !replyTo.text
                ? '📷 Photo'
                : replyTo.fileUrl && !replyTo.text
                  ? replyTo.fileName || 'Attachment'
                  : replyTo.text}
            </p>
          </div>
          <button
            type="button"
            onClick={onCancelReply}
            className="mt-0.5 text-wa-muted transition-colors hover:text-wa-text"
            aria-label="Cancel reply"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {recording ? (
        <div className="flex w-full items-center gap-3 rounded-2xl border border-red-400/25 bg-red-500/[0.08] px-3 py-2">
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-70" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[12.5px] font-semibold text-red-200">Recording voice note</p>
            <p className="text-[11px] text-red-200/60">
              {formatDuration(recording.seconds)} · tap send to finish
            </p>
          </div>
          <button
            type="button"
            onClick={() => stopRecording(false)}
            className="icon-btn text-red-300 hover:text-red-100"
            aria-label="Cancel recording"
          >
            <Trash2 size={18} />
          </button>
          <button
            type="button"
            onClick={() => stopRecording(true)}
            className="btn-accent grid h-10 w-10 shrink-0 place-items-center rounded-2xl text-white"
            aria-label="Send voice note"
          >
            <Send size={17} />
          </button>
        </div>
      ) : (
        <div className="flex min-w-0 w-full items-end gap-1.5 sm:gap-2">
          <div ref={wrapRef} className="shrink-0">
            <button
              type="button"
              onClick={() => setEmojiOpen((open) => !open)}
              className={`icon-btn mb-0.5 ${emojiOpen ? 'bg-white/[0.08] text-white' : ''}`}
              aria-label="Emoji"
              aria-expanded={emojiOpen}
            >
              <Smile size={21} />
            </button>

            {emojiOpen && (
              <div className="animate-pop-in absolute bottom-full left-1 z-40 mb-2 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0f1220] shadow-[0_30px_70px_-20px_rgba(0,0,0,0.95)] sm:left-4">
                <emoji-picker ref={pickerRef} class="cw-emoji-picker" />
              </div>
            )}
          </div>

          <div ref={attachWrapRef} className="relative shrink-0">
            <button
              type="button"
              onClick={() => setAttachOpen((open) => !open)}
              disabled={uploading || Boolean(editing)}
              className={`icon-btn mb-0.5 disabled:opacity-40 ${
                attachOpen ? 'bg-white/[0.08] text-white' : ''
              }`}
              aria-label="Attach file"
              aria-expanded={attachOpen}
            >
              {uploading ? <Loader2 size={20} className="animate-spin" /> : <Paperclip size={20} />}
            </button>

            {attachOpen && (
              <div className="animate-pop-in absolute bottom-full left-0 z-40 mb-2 w-44 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0f1220] p-1.5 shadow-[0_30px_70px_-20px_rgba(0,0,0,0.95)]">
                {attachOptions.map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => {
                      setAttachOpen(false)
                      option.ref.current?.click()
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-[12.5px] text-wa-text transition-colors hover:bg-white/[0.06]"
                  >
                    <option.icon size={16} className="text-wa-green" />
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <input
            ref={imageRef}
            type="file"
            accept="image/*"
            onChange={(event) => pickAttachment(event, 'image')}
            className="hidden"
          />
          <input
            ref={videoRef}
            type="file"
            accept="video/*"
            onChange={(event) => pickAttachment(event, 'video')}
            className="hidden"
          />
          <input
            ref={audioRef}
            type="file"
            accept="audio/*"
            onChange={(event) => pickAttachment(event, 'audio')}
            className="hidden"
          />
          <input
            ref={docRef}
            type="file"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
            onChange={(event) => pickAttachment(event, 'document')}
            className="hidden"
          />

          <input
            ref={inputRef}
            value={text}
            onChange={handleChange}
            placeholder={
              editing
                ? 'Edit message...'
                : uploading
                  ? 'Uploading...'
                  : pending
                    ? 'Add a caption...'
                    : 'Write a message...'
            }
            className="min-h-11 min-w-0 flex-1 rounded-2xl border border-white/[0.06] bg-white/[0.04] px-4 py-2.5 text-[15px] text-wa-text outline-none transition-all duration-200 placeholder:text-wa-muted focus:border-wa-green/50 focus:bg-white/[0.055] focus:shadow-[0_0_0_4px_rgba(124,92,255,0.12)]"
          />

          {!editing && !text.trim() && !pending && !uploading ? (
            <button
              type="button"
              onClick={startRecording}
              className="btn-accent mb-0.5 grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-white transition-all"
              aria-label="Record voice note"
            >
              <Mic size={19} />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!canSend}
              className="btn-accent mb-0.5 grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-white transition-all disabled:cursor-not-allowed disabled:opacity-35 disabled:shadow-none"
              aria-label="Send"
            >
              <Send size={19} />
            </button>
          )}
        </div>
      )}
    </form>
  )
}
