import { useState } from 'react'
import { Delete, LockKeyhole } from 'lucide-react'

const KEYPAD = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'back']

export default function AppLock({ mode = 'verify', expectedPin, onSuccess, onCancel, onForgot }) {
  const [pin, setPin] = useState('')
  const [confirm, setConfirm] = useState('')
  const [step, setStep] = useState(mode === 'set' ? 'enter' : 'verify')
  const [error, setError] = useState('')
  const [forgotConfirm, setForgotConfirm] = useState(false)
  const [pressed, setPressed] = useState(null)

  const current = step === 'confirm' ? confirm : pin

  const press = (key, index) => {
    setPressed(index)
    setTimeout(() => setPressed(null), 220)
    setError('')
    if (key === 'back') {
      if (step === 'confirm') setConfirm((value) => value.slice(0, -1))
      else setPin((value) => value.slice(0, -1))
      return
    }
    if (!key) return
    if (step === 'confirm') {
      if (confirm.length >= 4) return
      const next = confirm + key
      setConfirm(next)
      if (next.length === 4) {
        if (next === pin) onSuccess(pin)
        else {
          setError('PINs do not match. Try again.')
          setPin('')
          setConfirm('')
          setStep('enter')
        }
      }
      return
    }
    if (pin.length >= 4) return
    const next = pin + key
    setPin(next)
    if ((mode === 'verify' || mode === 'disable') && next.length === 4) {
      if (next === expectedPin) onSuccess(next)
      else {
        setTimeout(() => setPin(''), 320)
        setError('Wrong PIN. Try again.')
      }
      return
    }
    if (mode === 'set' && next.length === 4) setStep('confirm')
  }

  return (
    <div className="animate-fade-in fixed inset-0 z-[200] flex flex-col items-center justify-center overflow-hidden bg-[#07080f] px-5">
      <div className="aurora-blob left-[-18%] top-[-12%] h-80 w-80 bg-[#7c5cff]/35" />
      <div
        className="aurora-blob bottom-[-14%] right-[-18%] h-80 w-80 bg-[#22d3ee]/25"
        style={{ animationDelay: '-6s' }}
      />

      <div className="relative flex w-full max-w-[340px] flex-col items-center overflow-hidden rounded-[36px] border border-white/[0.12] bg-white/[0.07] px-7 py-9 shadow-[0_40px_100px_-25px_rgba(0,0,0,0.95),inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-3xl">
        <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
        <span className="pointer-events-none absolute -right-12 -top-16 h-40 w-40 rounded-full bg-[#7c5cff]/25 blur-3xl" />
        <span className="pointer-events-none absolute -bottom-16 -left-12 h-40 w-40 rounded-full bg-[#22d3ee]/20 blur-3xl" />

        <p className="gradient-text relative text-[11px] font-bold uppercase tracking-[0.32em]">
          ChatWave
        </p>

        <div className="ring-gradient relative mb-6 mt-5 grid h-[72px] w-[72px] place-items-center rounded-[24px] shadow-[0_22px_55px_-16px_rgba(124,92,255,0.95)]">
          <div className="grid h-full w-full place-items-center rounded-[23px] bg-black/25 backdrop-blur-xl">
            <LockKeyhole size={30} className="text-white" />
          </div>
        </div>

        <h2 className="relative text-[19px] font-semibold tracking-tight text-wa-text">
          {mode === 'set'
            ? step === 'confirm'
              ? 'Confirm PIN'
              : 'Set a PIN'
            : mode === 'disable'
              ? 'Disable screen lock'
              : 'Unlock ChatWave'}
        </h2>
        <p className="relative mt-1.5 text-center text-[12px] text-wa-muted">
          {mode === 'set'
            ? 'Choose a 4-digit PIN to lock the app'
            : mode === 'disable'
              ? 'Enter your PIN to turn the lock off'
              : 'Enter your 4-digit PIN to continue'}
        </p>

        <div className="relative mt-7 flex gap-4 rounded-full border border-white/[0.12] bg-white/[0.06] px-6 py-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl">
          {[0, 1, 2, 3].map((index) => (
            <span
              key={index}
              className={`h-4 w-4 rounded-full border transition-all duration-300 ${
                current.length > index
                  ? 'scale-110 border-wa-green bg-wa-green shadow-[0_0_12px_rgba(124,92,255,0.8)]'
                  : 'border-white/25 bg-transparent'
              }`}
            />
          ))}
        </div>

        {error && <p className="mt-4 text-[11.5px] text-red-300">{error}</p>}

        <div className="relative mt-8 grid w-full grid-cols-3 gap-3">
          {KEYPAD.map((key, index) =>
            key === '' ? (
              <span key={index} />
            ) : (
              <button
                key={index}
                type="button"
                onClick={() => press(key, index)}
                className={`grid h-14 place-items-center rounded-[18px] border border-white/[0.1] bg-white/[0.07] text-[19px] font-medium text-wa-text shadow-[0_14px_34px_-20px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.07)] backdrop-blur-xl transition-all duration-200 hover:border-white/20 hover:bg-white/[0.12] active:bg-white/[0.18] ${
                  pressed === index ? 'pin-key-pop' : ''
                }`}
              >
                {key === 'back' ? <Delete size={20} /> : key}
              </button>
            )
          )}
        </div>

        {mode === 'verify' && onForgot && (
          <div className="mt-7 w-full text-center">
            {forgotConfirm ? (
              <>
                <p className="text-[11px] leading-relaxed text-wa-muted">
                  This clears the PIN and signs you out. Sign in again with your email and password.
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setForgotConfirm(false)}
                    className="flex-1 rounded-xl border border-white/10 py-2 text-[11.5px] text-wa-muted"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => onForgot()}
                    className="flex-1 rounded-xl bg-red-500/20 py-2 text-[11.5px] font-semibold text-red-200"
                  >
                    Reset
                  </button>
                </div>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setForgotConfirm(true)}
                className="text-[12px] font-medium text-wa-green transition-opacity hover:opacity-80"
              >
                Forgot PIN?
              </button>
            )}
          </div>
        )}

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="mt-7 text-[12px] font-medium text-wa-muted transition-colors hover:text-wa-text"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  )
}
