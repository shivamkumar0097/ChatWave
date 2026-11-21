import { useEffect, useState } from 'react'
import { Download, X } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'

const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true

export default function InstallPrompt() {
  const { user, loading } = useAuth()
  const [prompt, setPrompt] = useState(null)
  const [help, setHelp] = useState(false)
  const [installed, setInstalled] = useState(isStandalone)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const showPrompt = (event) => {
      event.preventDefault()
      window.cwInstallPrompt = event
      setPrompt(event)
      setHelp(false)
    }
    const onInstalled = () => {
      setInstalled(true)
      window.cwInstallPrompt = null
    }

    window.addEventListener('beforeinstallprompt', showPrompt)
    window.addEventListener('appinstalled', onInstalled)
    if (window.cwInstallPrompt) showPrompt(window.cwInstallPrompt)

    return () => {
      window.removeEventListener('beforeinstallprompt', showPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  if (installed || dismissed || loading || user) return null

  const install = async () => {
    if (!prompt) {
      setHelp(true)
      return
    }
    prompt.prompt()
    await prompt.userChoice
    setPrompt(null)
    window.cwInstallPrompt = null
  }

  return (
    <div className="animate-fade-up fixed inset-x-3 bottom-20 z-[105] mx-auto flex max-w-sm items-center gap-3 rounded-2xl border border-white/10 bg-[#151827]/95 p-3 shadow-2xl backdrop-blur-xl md:bottom-5">
      <div className="ring-gradient grid h-10 w-10 shrink-0 place-items-center rounded-xl">
        <img src="/logo.jpg" alt="" className="h-6 w-6" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-wa-text">Install ChatWave</p>
        {help ? (
          <p className="text-[11px] leading-snug text-wa-muted">
            Chrome menu (⋮) → Install app / Add to Home screen
          </p>
        ) : (
          <p className="text-[11px] text-wa-muted">Add it to your home screen for quick access</p>
        )}
      </div>
      <button
        type="button"
        onClick={install}
        className="btn-accent flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-[12px] font-semibold text-white"
      >
        <Download size={14} />
        Install
      </button>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="shrink-0 p-1 text-wa-muted transition-colors hover:text-wa-text"
        aria-label="Dismiss"
      >
        <X size={16} />
      </button>
    </div>
  )
}
