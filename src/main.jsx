import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

/* ── 전역 오류 수집 ── */
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:7860'
const GUEST_ID_KEY = 'dalibaba_guest_id'

function reportError(message, stack = '') {
  try {
    const body = JSON.stringify({
      message: String(message).slice(0, 500),
      stack: String(stack || '').slice(0, 2000),
      url: location.href,
      userAgent: navigator.userAgent,
    })
    const guestId = localStorage.getItem(GUEST_ID_KEY) || ''
    fetch(`${API_URL}/client-error`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Guest-Id': guestId },
      body,
      keepalive: true,
    }).catch(() => {})
  } catch {
    /* 오류 보고 자체가 실패해도 앱 동작에 영향 없도록 무시 */
  }
}

window.addEventListener('error', (e) => {
  reportError(e.message, e.error?.stack)
})
window.addEventListener('unhandledrejection', (e) => {
  const reason = e.reason
  reportError(reason?.message || String(reason), reason?.stack)
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

const bootSplash = document.getElementById('boot-splash')
if (bootSplash) {
  const startedAt = Number(bootSplash.dataset.startedAt || Date.now())
  const minimumDisplayTime = 2500
  const removeSplash = () => {
    const elapsed = Date.now() - startedAt
    window.setTimeout(() => {
      bootSplash.classList.add('is-hidden')
      window.setTimeout(() => bootSplash.remove(), 420)
    }, Math.max(0, minimumDisplayTime - elapsed))
  }

  if (document.readyState === 'complete') removeSplash()
  else window.addEventListener('load', removeSplash, { once: true })
}
