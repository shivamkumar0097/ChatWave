const URL_PATTERN = /(https?:\/\/[^\s<]+)/g

export default function EmojiText({ text }) {
  if (!text) return null
  const parts = String(text).replace(/\r\n?/g, '\n').split(URL_PATTERN)

  return parts.map((part, index) => {
    if (/^https?:\/\//.test(part)) {
      return (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noreferrer noopener"
          onClick={(event) => event.stopPropagation()}
          className="underline decoration-current/40 underline-offset-2 transition-colors hover:decoration-current"
        >
          {part}
        </a>
      )
    }
    return <span key={index}>{part}</span>
  })
}
