import QRCode from 'qrcode'

const PREFIX = 'chatwave:user:'

export const qrPayload = (username) => `${PREFIX}${username || 'unknown'}`

export const makeQrDataUrl = (username) =>
  QRCode.toDataURL(qrPayload(username), {
    width: 320,
    margin: 1,
    errorCorrectionLevel: 'M',
    color: { dark: '#0b0d18', light: '#ffffff' },
  })

export const parseQrPayload = (value) => {
  const text = String(value || '').trim()
  return text.startsWith(PREFIX) ? text.slice(PREFIX.length) : text
}
