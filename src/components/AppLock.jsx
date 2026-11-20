import { useState } from 'react'
import { Delete, LockKeyhole } from 'lucide-react'

const KEYPAD = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'back']

export default function AppLock({ mode = 'verify', expectedPin, onSuccess, onCancel }) {
  const [pin, setPin] = useState('')
  const [confirm, setConfirm] = useState('')
  const [step, setStep] = useState(mode === 'set' ? 'enter' : 'verify')
  const [error, setError] = useState('')

  const current = step === 'confirm' ? confirm : pin

  const press = (key) => {
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
    if (mode === 'verify' && next.length === 4) {
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

      <div className="relative flex w-full max-w-xs flex-col items-center rounded-[32px] border border-white/10 bg-white/[0.055] px-6 py-8 shadow-[0_35px_90px_-25px_rgba(0,0,0,0.95)] backdrop-blur-2xl">
        <div className="ring-gradient mb-6 grid h-16 w-16 place-items-center rounded-2xl shadow-[0_18px_45px_-16px_rgba(124,92,255,0.9)]">
          <LockKeyhole size={27} className="text-white" />
        </div>

        <h2 className="text-[18px] font-semibold text-wa-text">
          {mode === 'verify' ? 'Unlock ChatWave' : step === 'confirm' ? 'Confirm PIN' : 'Set a PIN'}
        </h2>
        <p className="mt-1 text-center text-[12px] text-wa-muted">
          {mode === 'verify'
            ? 'Enter your 4-digit PIN to continue'
            : 'Choose a 4-digit PIN to lock the app'}
        </p>

        <div className="mt-7 flex gap-3 rounded-full border border-white/10 bg-white/[0.05] px-5 py-3 backdrop-blur-xl">
          {[0, 1, 2, 3].map((index) => (
            <span
              key={index}
              className={`h-3.5 w-3.5 rounded-full border transition-all duration-200 ${
                current.length > index
                  ? 'scale-110 border-wa-green bg-wa-green shadow-[0_0_12px_rgba(124,92,255,0.8)]'
                  : 'border-white/25 bg-transparent'
              }`}
            />
          ))}
        </div>

        {error && <p className="mt-4 text-[11.5px] text-red-300">{error}</p>}

        <div className="mt-8 grid w-full grid-cols-3 gap-3">
          {KEYPAD.map((key, index) =>
            key === '' ? (
              <span key={index} />
            ) : (
              <button
                key={index}
                type="button"
                onClick={() => press(key)}
                className="grid h-14 place-items-center rounded-2xl border border-white/10 bg-white/[0.06] text-[18px] font-medium text-wa-text shadow-[0_12px_30px_-18px_rgba(0,0,0,0.9)] backdrop-blur-xl transition-all active:scale-95 active:bg-white/[0.14]"
              >
                {key === 'back' ? <Delete size={20} /> : key}
              </button>
            )
          )}
        </div>

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
