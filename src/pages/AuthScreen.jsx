import { useState } from 'react'
import { ArrowRight, Check, Eye, EyeOff, Loader2, Lock, Mail, ShieldCheck, User, Users, X, Zap } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'

const TERMS = [
  {
    title: 'Be respectful',
    text: 'No harassment, hate speech, spam or illegal content. Accounts violating this can be suspended.',
  },
  {
    title: 'Your account, your responsibility',
    text: 'Keep your password safe. You are responsible for all activity that happens from your account.',
  },
  {
    title: 'Your data',
    text: 'Your messages and profile stay private to you and the people you chat with. We never sell your data.',
  },
  {
    title: 'Fair use',
    text: 'Do not attempt to disrupt, scrape or reverse-engineer the service or access other users\' data.',
  },
  {
    title: 'Age requirement',
    text: 'You must be at least 13 years old (or the minimum age required in your country) to use ChatWave.',
  },
  {
    title: 'Service availability',
    text: 'ChatWave is provided as-is. We work hard to keep it online, but cannot guarantee uninterrupted access.',
  },
]

function TermsModal({ onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Terms and conditions"
    >
      <div
        className="glass-strong animate-pop-in max-h-[80vh] w-full max-w-lg overflow-hidden rounded-3xl shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/[0.07] px-6 py-4">
          <div>
            <h3 className="text-base font-semibold tracking-tight">Terms & Conditions</h3>
            <p className="text-[11px] text-wa-muted">Last updated: November 2025</p>
          </div>
          <button
            type="button"
            onClick={() => onClose()}
            className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-white/5 text-wa-muted transition-colors hover:text-wa-text"
            aria-label="Close"
          >
            <X size={15} />
          </button>
        </div>
        <div className="max-h-[calc(80vh-4.5rem)] space-y-4 overflow-y-auto px-6 py-5">
          {TERMS.map((term, index) => (
            <div key={term.title} className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
              <p className="text-[13px] font-medium text-wa-text">
                <span className="mr-1.5 text-wa-green">{String(index + 1).padStart(2, '0')}</span>
                {term.title}
              </p>
              <p className="mt-1 text-[12px] leading-relaxed text-wa-muted">{term.text}</p>
            </div>
          ))}
          <p className="pb-1 text-center text-[11px] leading-relaxed text-wa-muted">
            By using ChatWave you agree to these terms. Questions? Reach out to the developer.
          </p>
        </div>
      </div>
    </div>
  )
}

const features = [
  {
    icon: Zap,
    title: 'Instant delivery',
    text: 'Messages land in real time with typing and presence.',
  },
  {
    icon: ShieldCheck,
    title: 'Private by design',
    text: 'Row-level security keeps every conversation yours.',
  },
  {
    icon: Users,
    title: 'Made for everyone',
    text: 'Clean, fast and comfortable on any screen size.',
  },
]

export default function AuthScreen() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState('signin')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [termsOpen, setTermsOpen] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const isSignup = mode === 'signup'

  const switchMode = (next) => {
    setMode(next)
    setError('')
    setNotice('')
  }

  const strength = (() => {
    if (!password) return 0
    let score = 0
    if (password.length >= 6) score += 1
    if (password.length >= 10) score += 1
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1
    if (/\d/.test(password) && /[^A-Za-z0-9]/.test(password)) score += 1
    return score
  })()

  const strengthMeta = [
    { label: 'Too short', bar: 'bg-red-400/80', text: 'text-red-300' },
    { label: 'Weak', bar: 'bg-red-400/80', text: 'text-red-300' },
    { label: 'Okay', bar: 'bg-amber-300/80', text: 'text-amber-200' },
    { label: 'Good', bar: 'bg-accent-2/80', text: 'text-accent-2' },
    { label: 'Strong', bar: 'bg-wa-green', text: 'text-wa-green' },
  ][strength]

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    setNotice('')

    if (isSignup && !agreed) {
      setError('Please accept the Terms & Conditions to create an account.')
      return
    }

    setBusy(true)

    const result = isSignup
      ? await signUp(email.trim(), password, name.trim() || email.split('@')[0])
      : await signIn(email.trim(), password)

    setBusy(false)

    if (result.error) {
      setError(result.error.message)
      return
    }

    if (isSignup && !result.data.session) {
      setNotice('Account created. Check your email for the confirmation link, then sign in.')
    }
  }

  return (
    <div className="relative min-h-full overflow-hidden bg-wa-bg px-4 py-10 sm:px-6 lg:px-10">
      <div className="aurora-blob left-[-8%] top-[-12%] h-80 w-80 bg-[#7c5cff]/50" />
      <div
        className="aurora-blob right-[-6%] top-[18%] h-72 w-72 bg-[#22d3ee]/35"
        style={{ animationDelay: '-6s' }}
      />
      <div
        className="aurora-blob bottom-[-14%] left-[35%] h-72 w-80 bg-[#f472b6]/25"
        style={{ animationDelay: '-11s' }}
      />

      <div className="relative mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-6xl items-center">
        <div className="grid w-full items-center gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
          <div className="animate-fade-up hidden flex-col gap-8 lg:flex">
            <div className="flex items-center gap-3">
              <div className="ring-gradient grid h-11 w-11 place-items-center rounded-2xl shadow-[0_10px_30px_-10px_rgba(124,92,255,0.9)]"><img src="/logo.jpg" alt="ChatWave" className="h-6 w-6" /></div>
              <span className="text-lg font-semibold tracking-tight">ChatWave</span>
            </div>

            <div className="space-y-5">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-wa-muted">
                <span className="h-1.5 w-1.5 rounded-full bg-accent-2 shadow-[0_0_10px_2px_rgba(34,211,238,0.7)]" />
                Real-time messaging
              </span>
              <h1 className="text-5xl font-semibold leading-[1.05] tracking-tight xl:text-6xl">
                Conversations that
                <br />
                <span className="gradient-text">flow with you.</span>
              </h1>
              <p className="max-w-md text-[15px] leading-relaxed text-wa-muted">
                Fast, focused and beautifully simple. Chat one to one, see when friends are
                online, and never lose your place again.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="group rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4 transition-all duration-300 hover:-translate-y-1 hover:border-wa-green/40 hover:bg-white/[0.055]"
                >
                  <feature.icon
                    size={19}
                    className="mb-3 text-wa-green transition-transform duration-300 group-hover:scale-110"
                  />
                  <p className="text-[13px] font-medium text-wa-text">{feature.title}</p>
                  <p className="mt-1 text-[11.5px] leading-relaxed text-wa-muted">{feature.text}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="animate-fade-up mx-auto w-full max-w-md" style={{ animationDelay: '80ms' }}>
            <div className="mb-8 flex flex-col items-center gap-3 text-center lg:hidden">
              <div className="ring-gradient grid h-14 w-14 place-items-center rounded-2xl shadow-[0_12px_34px_-10px_rgba(124,92,255,0.9)]"><img src="/logo.jpg" alt="ChatWave" className="h-8 w-8" /></div>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">ChatWave</h1>
                <p className="mt-1 text-sm text-wa-muted">Chats that flow with you.</p>
              </div>
            </div>

            <div className="glass-strong relative overflow-hidden rounded-3xl p-6 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)] sm:p-7">
              <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-wa-green/60 to-transparent" />

              <div className="mb-6">
                <h2 className="text-xl font-semibold tracking-tight">
                  {isSignup ? 'Create your account' : 'Welcome back'}
                </h2>
                <p className="mt-1 text-[13px] text-wa-muted">
                  {isSignup
                    ? 'It takes less than a minute to get started.'
                    : 'Sign in to pick up where you left off.'}
                </p>
              </div>

              <div className="mb-5 grid grid-cols-2 gap-1 rounded-xl border border-white/[0.06] bg-black/30 p-1 text-[13px]">
                <button
                  type="button"
                  onClick={() => switchMode('signin')}
                  aria-pressed={!isSignup}
                  className={`rounded-lg py-2 font-medium transition-all duration-200 ${
                    !isSignup
                      ? 'bg-white/[0.09] text-white shadow-sm'
                      : 'text-wa-muted hover:text-wa-text'
                  }`}
                >
                  Sign in
                </button>
                <button
                  type="button"
                  onClick={() => switchMode('signup')}
                  aria-pressed={isSignup}
                  className={`rounded-lg py-2 font-medium transition-all duration-200 ${
                    isSignup
                      ? 'bg-white/[0.09] text-white shadow-sm'
                      : 'text-wa-muted hover:text-wa-text'
                  }`}
                >
                  Create account
                </button>
              </div>

              <form onSubmit={submit} className="form-stagger flex flex-col gap-3.5">
                {isSignup && (
                  <div className="group relative">
                    <User
                      size={16}
                      className="pointer-events-none absolute left-3.5 top-1/2 z-10 -translate-y-1/2 text-wa-muted transition-colors group-focus-within:text-wa-green"
                    />
                    <input
                      id="auth-name"
                      name="name"
                      autoComplete="name"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      placeholder="Your name"
                      aria-label="Your name"
                      className="input-luxe pl-10"
                    />
                  </div>
                )}

                <div className="group relative">
                  <Mail
                    size={16}
                    className="pointer-events-none absolute left-3.5 top-1/2 z-10 -translate-y-1/2 text-wa-muted transition-colors group-focus-within:text-wa-green"
                  />
                  <input
                    id="auth-email"
                    name="email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    autoCapitalize="none"
                    spellCheck={false}
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="Email address"
                    aria-label="Email address"
                    className="input-luxe pl-10"
                  />
                </div>

                <div className="group relative">
                  <Lock
                    size={16}
                    className="pointer-events-none absolute left-3.5 top-1/2 z-10 -translate-y-1/2 text-wa-muted transition-colors group-focus-within:text-wa-green"
                  />
                  <input
                    id="auth-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete={isSignup ? 'new-password' : 'current-password'}
                    required
                    minLength={6}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Password (min 6 characters)"
                    aria-label="Password"
                    className="input-luxe pl-10 pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    onMouseDown={(event) => event.preventDefault()}
                    className="absolute right-2 top-1/2 z-10 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-wa-muted transition-colors hover:bg-white/[0.06] hover:text-wa-text"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showPassword}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {isSignup && password && (
                  <div className="-mt-0.5 space-y-1.5">
                    <div className="flex gap-1">
                      {[0, 1, 2, 3].map((index) => (
                        <span
                          key={index}
                          className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                            index < Math.max(1, strength) ? strengthMeta.bar : 'bg-white/10'
                          }`}
                        />
                      ))}
                    </div>
                    <div className="flex items-center justify-between text-[10.5px]">
                      <span className={`font-medium ${strengthMeta.text}`}>
                        {strengthMeta.label}
                      </span>
                      <span className="flex items-center gap-1 text-wa-muted">
                        {password.length >= 6 && <Check size={11} className="text-wa-green" />}
                        Use 6+ characters
                      </span>
                    </div>
                  </div>
                )}

                {isSignup && (
                  <div className="flex items-start gap-2.5 text-[12px] leading-relaxed text-wa-muted">
                    <input
                      id="auth-terms"
                      type="checkbox"
                      checked={agreed}
                      onChange={(event) => {
                        setAgreed(event.target.checked)
                        if (event.target.checked) setError('')
                      }}
                      className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-wa-green"
                    />
                    <span>
                      <label htmlFor="auth-terms" className="cursor-pointer">
                        I agree to the{' '}
                      </label>
                      <button
                        type="button"
                        onClick={() => setTermsOpen(true)}
                        className="font-medium text-wa-green underline decoration-wa-green/40 underline-offset-2 transition-colors hover:decoration-wa-green"
                      >
                        Terms & Conditions
                      </button>
                      <label htmlFor="auth-terms" className="cursor-pointer">
                        {' '}
                        and the privacy practices of ChatWave.
                      </label>
                    </span>
                  </div>
                )}

                {error && (
                  <p
                    role="alert"
                    className="animate-pop-in flex items-start gap-2 rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2 text-[12.5px] leading-relaxed text-red-300"
                  >
                    <X size={14} className="mt-0.5 shrink-0" />
                    <span>{error}</span>
                  </p>
                )}
                {notice && (
                  <p
                    role="status"
                    className="animate-pop-in flex items-start gap-2 rounded-xl border border-accent-2/25 bg-accent-2/10 px-3 py-2 text-[12.5px] leading-relaxed text-accent-2"
                  >
                    <Check size={14} className="mt-0.5 shrink-0" />
                    <span>{notice}</span>
                  </p>
                )}

                <button
                  type="submit"
                  disabled={busy}
                  aria-busy={busy}
                  className="btn-accent mt-1 flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {busy ? (
                    <>
                      <Loader2 size={17} className="animate-spin" />
                      Please wait...
                    </>
                  ) : (
                    <>
                      {isSignup ? 'Create account' : 'Sign in'}
                      <ArrowRight size={17} />
                    </>
                  )}
                </button>
              </form>

              <p className="mt-5 text-center text-[11px] leading-relaxed text-wa-muted">
                Secure sessions powered by Supabase. Your chats stay yours.
                {!isSignup && (
                  <>
                    {' '}
                    <button
                      type="button"
                      onClick={() => setTermsOpen(true)}
                      className="font-medium text-wa-green underline decoration-wa-green/40 underline-offset-2 transition-colors hover:decoration-wa-green"
                    >
                      Terms & Conditions
                    </button>
                  </>
                )}
              </p>
            </div>

            <p className="mt-5 text-center text-[11px] text-wa-muted">
              ChatWave - built by Shivam Kumar
            </p>
          </div>
        </div>
      </div>

      {termsOpen && <TermsModal onClose={() => setTermsOpen(false)} />}
    </div>
  )
}




