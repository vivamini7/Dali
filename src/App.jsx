import { useState, useCallback, useEffect } from 'react'
import HomePage     from './pages/HomePage'
import CameraPage   from './pages/CameraPage'
import ResultPage   from './pages/ResultPage'
import OrderPage    from './pages/OrderPage'
import SettingsPage from './pages/SettingsPage'
import PrivacyPage  from './pages/PrivacyPage'
import TermsPage    from './pages/TermsPage'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:7860'
const GUEST_ID_KEY = 'dalibaba_guest_id'
const AUTH_TOKEN_KEY = 'dalibaba_auth_token'

/* ── 이미지 압축 ── */
async function compressImage(file) {
  return new Promise(resolve => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const MAX = 1280
      const ratio = Math.min(MAX / img.width, MAX / img.height, 1)
      const w = Math.round(img.width * ratio)
      const h = Math.round(img.height * ratio)
      const canvas = document.createElement('canvas')
      canvas.width = w; canvas.height = h
      canvas.getContext('2d').drawImage(img, 0, 0, w, h)
      canvas.toBlob(blob => {
        const reader = new FileReader()
        reader.onload = e => {
          const [meta, b64] = e.target.result.split(',')
          const mime = meta.match(/:(.*?);/)[1]
          resolve({ base64: b64, type: mime, previewUrl: URL.createObjectURL(blob) })
        }
        reader.readAsDataURL(blob)
      }, 'image/jpeg', 0.85)
    }
    img.src = url
  })
}

/* ── Nav Icons ── */
function HomeIcon({ active }) {
  return (
    <svg viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'}
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  )
}
function ExchangeIcon({ active }) {
  return (
    <svg viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23"/>
      <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
    </svg>
  )
}
function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/>
    </svg>
  )
}

export default function App() {
  useEffect(() => {
    document.documentElement.removeAttribute('data-theme')
    localStorage.removeItem('theme')
  }, [])

  /* ── 기본 메뉴판 언어 ── */
  const [sourceLang, setSourceLang] = useState(() => localStorage.getItem('sourceLang') || 'auto')
  useEffect(() => { localStorage.setItem('sourceLang', sourceLang) }, [sourceLang])

  /* ── 카드 수수료 (%) ── */
  const [cardFee, setCardFee] = useState(() => parseFloat(localStorage.getItem('cardFee') || '0'))
  useEffect(() => { localStorage.setItem('cardFee', cardFee) }, [cardFee])

  const [defaultCurrency, setDefaultCurrency] = useState(() => localStorage.getItem('defaultCurrency') || 'JPY')
  useEffect(() => { localStorage.setItem('defaultCurrency', defaultCurrency) }, [defaultCurrency])

  /* ── 화면 상태 ── */
  const [screen, setScreen] = useState('home')  // 'home'|'camera'|'result'|'order'|'settings'

  /* ── 분석 데이터 ── */
  const [capturedImage, setCapturedImage] = useState(null)
  const [priceResult,   setPriceResult]   = useState(null)
  const [analyzing,     setAnalyzing]     = useState(false)
  const [analyzeError,  setAnalyzeError]  = useState(null)

  /* ── 주문 데이터 ── */
  const [orderCart,        setOrderCart]        = useState({})
  const [orderPriceResult, setOrderPriceResult] = useState(null)
  const [orderFromReceipt, setOrderFromReceipt] = useState(false)

  /* ── 카메라 언어 설정 ── */
  const [targetLang, setTargetLang] = useState('ko')

  const [authToken, setAuthToken] = useState(() => localStorage.getItem(AUTH_TOKEN_KEY) || sessionStorage.getItem(AUTH_TOKEN_KEY) || '')
  const [user, setUser] = useState(null)
  const [plans, setPlans] = useState([])
  const [aiUsage, setAiUsage] = useState(null)
  const [authError, setAuthError] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [guestId] = useState(() => {
    const existing = localStorage.getItem(GUEST_ID_KEY)
    if (existing) return existing
    const next = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`
    localStorage.setItem(GUEST_ID_KEY, next)
    return next
  })

  const authHeaders = useCallback((tokenOverride = authToken) => {
    const headers = { 'X-Guest-Id': guestId }
    if (tokenOverride) headers.Authorization = `Bearer ${tokenOverride}`
    return headers
  }, [authToken, guestId])

  const refreshAccount = useCallback(async (tokenOverride = authToken) => {
    try {
      const res = await fetch(`${API_URL}/me`, { headers: authHeaders(tokenOverride) })
      const data = await res.json()
      setUser(data.user || null)
      setPlans(data.plans || [])
      setAiUsage(data.usage || null)
    } catch {
      setAiUsage(null)
    }
  }, [authHeaders])

  useEffect(() => { refreshAccount() }, [refreshAccount])

  const submitAuth = useCallback(async (mode, email, password, remember = true) => {
    setAuthLoading(true)
    setAuthError('')
    try {
      const res = await fetch(`${API_URL}/auth/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || '로그인에 실패했습니다.')
      localStorage.removeItem(AUTH_TOKEN_KEY)
      sessionStorage.removeItem(AUTH_TOKEN_KEY)
      if (remember) localStorage.setItem(AUTH_TOKEN_KEY, data.token)
      else sessionStorage.setItem(AUTH_TOKEN_KEY, data.token)
      setAuthToken(data.token)
      setUser(data.user)
      await refreshAccount(data.token)
    } catch (e) {
      setAuthError(typeof e.message === 'string' ? e.message : '로그인에 실패했습니다.')
    } finally {
      setAuthLoading(false)
    }
  }, [refreshAccount])

  const deleteAccount = useCallback(async () => {
    setAuthError('')
    try {
      const res = await fetch(`${API_URL}/me`, { method: 'DELETE', headers: authHeaders() })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.detail || '계정 탈퇴에 실패했습니다.')
      }
      localStorage.removeItem(AUTH_TOKEN_KEY)
      sessionStorage.removeItem(AUTH_TOKEN_KEY)
      setAuthToken('')
      setUser(null)
      await refreshAccount('')
    } catch (e) {
      setAuthError(typeof e.message === 'string' ? e.message : '계정 탈퇴에 실패했습니다.')
    }
  }, [authHeaders, refreshAccount])

  const logout = useCallback(() => {
    localStorage.removeItem(AUTH_TOKEN_KEY)
    sessionStorage.removeItem(AUTH_TOKEN_KEY)
    setAuthToken('')
    setUser(null)
    refreshAccount('')
  }, [refreshAccount])

  const purchasePlan = useCallback(async (planId) => {
    setAuthError('')
    try {
      const res = await fetch(`${API_URL}/purchase`, {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || '구매를 완료할 수 없습니다.')
      setUser(data.user)
      setPlans(data.plans || plans)
      await refreshAccount()
    } catch (e) {
      setAuthError(typeof e.message === 'string' ? e.message : '구매를 완료할 수 없습니다.')
    }
  }, [authHeaders, plans, refreshAccount])

  /* ── 이미지 선택 → 분석 시작 ── */
  const handleImageFile = useCallback(async (file, options = {}) => {
    if (!file) return
    const appendMode = options.append === true && Array.isArray(priceResult?.prices) && priceResult.prices.length > 0
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 40000) // 40초 타임아웃
    try {
      const compressed = await compressImage(file)
      setCapturedImage(compressed)
      if (!appendMode) setPriceResult(null)
      setAnalyzeError(null)
      setScreen('camera')
      setAnalyzing(true)

      const body    = JSON.stringify({ image_base64: compressed.base64, image_type: compressed.type })
      const headers = { 'Content-Type': 'application/json' }

      console.log('[Dalibaba] /analyze 호출 시작...')
      const res  = await fetch(`${API_URL}/analyze`, { method: 'POST', headers, body, signal: controller.signal })
      console.log('[Dalibaba] /analyze 응답:', res.status)
      let data = res.ok ? await res.json() : null
      console.log('[Dalibaba] 분석 결과:', data)

      if (!data) setAnalyzeError('분석에 실패했습니다.\n메뉴판이 잘 보이도록 다시 찍어주세요.')

      if (data?.documentType === 'other') {
        try {
          const translatedRes = await fetch(`${API_URL}/translate-image`, {
            method: 'POST',
            headers,
            body,
            signal: controller.signal,
          })
          const translatedData = translatedRes.ok ? await translatedRes.json() : null
          data = {
            ...data,
            translatedImage: translatedData?.translated_image || null,
            translatedImageMessage: translatedData?.message || null,
          }
        } catch (translateError) {
          if (translateError.name === 'AbortError') throw translateError
          console.error('[Dalibaba] 번역 이미지 생성 오류:', translateError)
          data = {
            ...data,
            translatedImage: null,
            translatedImageMessage: '번역 이미지를 만들지 못해 텍스트 번역만 표시합니다.',
          }
        }
      }

      if (appendMode && data?.documentType === 'menu' && Array.isArray(data?.prices)) {
        setPriceResult(prev => ({
          ...prev,
          prices: [...(prev?.prices || []), ...data.prices],
          detectedLanguage: prev?.detectedLanguage || data.detectedLanguage,
          detectedCurrency: prev?.detectedCurrency || data.detectedCurrency,
          documentType: 'menu',
        }))
        setScreen('result')
      } else if (data?.documentType === 'receipt' && Array.isArray(data.prices) && data.prices.length > 0) {
        setPriceResult(data)
        const receiptCart = data.prices.reduce((cart, item, index) => {
          cart[index] = Math.max(1, Number(item.qty) || 1)
          return cart
        }, {})
        setOrderCart(receiptCart)
        setOrderPriceResult(data)
        setOrderFromReceipt(true)
        setScreen('order')
      } else {
        setPriceResult(data)
        setScreen('result')
      }
    } catch (e) {
      console.error('[Dalibaba] 오류:', e)
      if (e.name === 'AbortError') {
        setAnalyzeError('분석 시간이 초과되었습니다.(40초)\n백엔드 서버를 확인해주세요.')
      } else {
        const isNet = e.message?.includes('fetch') || e.message?.includes('Failed') || e.message?.includes('NetworkError')
        setAnalyzeError(isNet
          ? '서버에 연결할 수 없습니다.\n백엔드가 실행 중인지 확인해주세요.'
          : e.message)
      }
      setScreen('result')
    } finally {
      clearTimeout(timer)
      setAnalyzing(false)
    }
  }, [priceResult])

  /* ── 탭 전환 ── */
  /* ── 카메라 화면으로 ── */
  const goCamera = () => setScreen('camera')

  /* ── 결과에서 뒤로 ── */
  const goBackFromResult = () => {
    setScreen('home')
    setCapturedImage(null)
    setPriceResult(null)
    setAnalyzeError(null)
    setOrderFromReceipt(false)
  }

  /* ── 카메라에서 뒤로 ── */
  const goBackFromCamera = () => setScreen('home')

  /* ── 주문서로 이동 ── */
  const goToOrder = (cart, result) => {
    setOrderCart(cart)
    setOrderPriceResult(result)
    setOrderFromReceipt(false)
    setScreen('order')
  }

  const showNav = false

  /* ── 렌더 ── */
  return (
    <div className="app">

      {/* ── 화면 영역 ── */}
      {screen === 'camera' ? (
        <CameraPage
          onFile={handleImageFile}
          onBack={goBackFromCamera}
          analyzing={analyzing}
          capturedImage={capturedImage}
          sourceLang={sourceLang}
          targetLang={targetLang}
          onSourceLangChange={setSourceLang}
          onTargetLangChange={setTargetLang}
        />
      ) : screen === 'result' ? (
        <ResultPage
          priceResult={priceResult}
          analyzing={analyzing}
          error={analyzeError}
          onBack={goBackFromResult}
          onOrder={goToOrder}
          onAddMenu={(file) => handleImageFile(file, { append: true })}
          cardFee={cardFee}
          authToken={authToken}
          guestId={guestId}
          aiUsage={aiUsage}
          onAiUsageChange={setAiUsage}
        />
      ) : screen === 'order' ? (
        <OrderPage
          priceResult={orderPriceResult}
          cart={orderCart}
          onBack={() => setScreen(orderFromReceipt ? 'home' : 'result')}
          onReset={goBackFromResult}
          cardFee={cardFee}
        />
      ) : screen === 'settings' ? (
        <SettingsPage
          sourceLang={sourceLang} onSourceLangChange={setSourceLang}
          defaultCurrency={defaultCurrency} onDefaultCurrencyChange={setDefaultCurrency}
          cardFee={cardFee} onCardFeeChange={setCardFee}
          user={user}
          plans={plans}
          aiUsage={aiUsage}
          authError={authError}
          authLoading={authLoading}
          onAuthSubmit={submitAuth}
          onLogout={logout}
          onDeleteAccount={deleteAccount}
          onPurchasePlan={purchasePlan}
          onBack={() => setScreen('home')}
          onPrivacyClick={() => setScreen('privacy')}
          onTermsClick={() => setScreen('terms')}
        />
      ) : screen === 'privacy' ? (
        <PrivacyPage onBack={() => setScreen('settings')} />
      ) : screen === 'terms' ? (
        <TermsPage onBack={() => setScreen('settings')} />
      ) : (
        <HomePage
          onCameraClick={goCamera}
          onFileSelect={handleImageFile}
          onSettingsClick={() => setScreen('settings')}
          defaultCurrency={defaultCurrency}
          user={user}
          aiUsage={aiUsage}
          authError={authError}
          authLoading={authLoading}
          onAuthSubmit={submitAuth}
          onLogout={logout}
        />
      )}

      {/* ── 하단 내비게이션 ── */}
      {showNav && (
        <nav className="bottom-nav" role="navigation" aria-label="메인 메뉴">
          <button
            className={`nav-btn ${tab === 'home' && screen === 'home' ? 'active' : ''}`}
            onClick={() => switchTab('home')}
            aria-label="홈"
          >
            <HomeIcon active={tab === 'home' && screen === 'home'} />
            홈
          </button>
          <button
            className={`nav-btn ${tab === 'exchange' ? 'active' : ''}`}
            onClick={() => switchTab('exchange')}
            aria-label="환율"
          >
            <ExchangeIcon active={tab === 'exchange'} />
            환율
          </button>
          <button
            className={`nav-btn ${tab === 'settings' ? 'active' : ''}`}
            onClick={() => switchTab('settings')}
            aria-label="설정"
          >
            <SettingsIcon />
            설정
          </button>
        </nav>
      )}

    </div>
  )
}
