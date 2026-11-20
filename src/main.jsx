import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './app.css'
import App from './App.jsx'

if (window.localStorage.getItem('cw-theme') === 'light') {
  document.documentElement.classList.add('light')
}

const coarsePointer = () => window.matchMedia?.('(pointer: coarse)').matches

const blockPinch = (event) => {
  if (coarsePointer() && event.touches?.length > 1) event.preventDefault()
}

const blockGesture = (event) => {
  if (coarsePointer()) event.preventDefault()
}

document.addEventListener('touchmove', blockPinch, { passive: false })
document.addEventListener('gesturestart', blockGesture)
document.addEventListener('gesturechange', blockGesture)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
