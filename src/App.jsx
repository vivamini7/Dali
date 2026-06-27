import { useState, useCallback, useEffect, useRef } from 'react'
import HomePage     from './pages/HomePage'
import CameraPage   from './pages/CameraPage'
import ResultPage   from './pages/ResultPage'
import OrderPage    from './pages/OrderPage'
import SettingsPage from './pages/SettingsPage'
import PrivacyPage  from './pages/PrivacyPage'
import TermsPage    from './pages/TermsPage'
import {
  applySessionFromAuthUrl,
  authRedirectUrl,
  isSupabaseConfigured,
  supabase,
} from './lib/supabase'
import { Capacitor } from '@capacitor/core'
import { App as CapacitorApp } from '@capacitor/app'
import { Browser } from '@capacitor/browser'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:7860'
const GUEST_ID_KEY = 'dalibaba_guest_id'
const AUTH_TOKEN_KEY = 'dalibaba_auth_token'
const LOGGED_OUT_KEY = 'dalibaba_logged_out'

function screenFromPath() {
  if (window.location.pathname === '/privacy') return 'privacy'
  if (window.location.pathname === '/terms') return 'terms'
  return 'home'
}

async function getApiError(response, fallback) {
  try {
    const body = await response.json()
    const detail = body?.detail
    if (typeof detail === 'string') return detail
    if (detail?.message) return detail.message
  } catch {
    // Use the user-facing fallback below.
  }
  return fallback
}

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
  const [screen, setScreen] = useState(screenFromPath)  // 'home'|'camera'|'result'|'order'|'settings'

  const openPublicPage = useCallback((page) => {
    window.history.pushState({}, '', `/${page}`)
    setScreen(page)
  }, [])

  const closePublicPage = useCallback(() => {
    window.history.pushState({}, '', '/')
    setScreen('settings')
  }, [])

  useEffect(() => {
    const handlePopState = () => setScreen(screenFromPath())
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  /* ── 분석 데이터 ── */
  const [capturedImage, setCapturedImage] = useState(null)
  const [priceResult,   setPriceResult]   = useState(null)
  const [analyzing,     setAnalyzing]     = useState(false)
  const [analyzeError,  setAnalyzeError]  = useState(null)
  const [translatingImage, setTranslatingImage] = useState(false)

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
  const [imageUsage, setImageUsage] = useState(null)
  const [authError, setAuthError] = useState('')
  const [authNotice, setAuthNotice] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [passwordRecovery, setPasswordRecovery] = useState(false)
  const exchangedSupabaseToken = useRef('')
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
      setImageUsage(data.imageUsage || null)
    } catch {
      setAiUsage(null)
      setImageUsage(null)
    }
  }, [authHeaders])

  useEffect(() => { refreshAccount() }, [refreshAccount])

  const saveAppSession = useCallback(async (data, remember = true) => {
    localStorage.removeItem(LOGGED_OUT_KEY)
    localStorage.removeItem(AUTH_TOKEN_KEY)
    sessionStorage.removeItem(AUTH_TOKEN_KEY)
    if (remember) localStorage.setItem(AUTH_TOKEN_KEY, data.token)
    else sessionStorage.setItem(AUTH_TOKEN_KEY, data.token)
    setAuthToken(data.token)
    setUser(data.user)
    await refreshAccount(data.token)
  }, [refreshAccount])

  const exchangeSupabaseSession = useCallback(async (accessToken, remember = true) => {
    if (!accessToken || exchangedSupabaseToken.current === accessToken) return
    exchangedSupabaseToken.current = accessToken
    try {
      const res = await fetch(`${API_URL}/auth/supabase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_token: accessToken }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || '로그인 연결에 실패했습니다.')
      await saveAppSession(data, remember)
      setAuthError('')
      setAuthNotice('')
    } catch (error) {
      exchangedSupabaseToken.current = ''
      throw error
    }
  }, [saveAppSession])

  const exchangeNaverCode = useCallback(async (code) => {
    if (!code) return
    const res = await fetch(`${API_URL}/auth/naver/exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.detail || '네이버 로그인 연결에 실패했습니다.')
    await saveAppSession(data, true)
    setAuthError('')
    setAuthNotice('')
  }, [saveAppSession])

  const handleAuthReturnUrl = useCallback(async (url) => {
    const parsed = new URL(url)
    const authErrorMessage = parsed.searchParams.get('auth_error')
    if (authErrorMessage) throw new Error(authErrorMessage)

    const naverCode = parsed.searchParams.get('naver_code')
    if (naverCode) {
      await exchangeNaverCode(naverCode)
      return
    }

    const session = await applySessionFromAuthUrl(url)
    if (session?.access_token) {
      await exchangeSupabaseSession(session.access_token, true)
    }
  }, [exchangeNaverCode, exchangeSupabaseSession])

  useEffect(() => {
    let supabaseListener
    if (supabase) {
      if (localStorage.getItem(LOGGED_OUT_KEY) === '1') {
        supabase.auth.signOut().catch(() => {})
      } else {
        supabase.auth.getSession().then(({ data }) => {
          if (data.session?.access_token) {
            exchangeSupabaseSession(data.session.access_token, true).catch(error => {
              setAuthError(error.message || '로그인 연결에 실패했습니다.')
            })
          }
        })
      }

      const { data } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'PASSWORD_RECOVERY') {
          setPasswordRecovery(true)
          setAuthNotice('새 비밀번호를 입력해 주세요.')
        }
        if (session?.access_token && event !== 'TOKEN_REFRESHED') {
          window.setTimeout(() => {
            exchangeSupabaseSession(session.access_token, true).catch(error => {
              setAuthError(error.message || '로그인 연결에 실패했습니다.')
            })
          }, 0)
        }
      })
      supabaseListener = data
    }

    if (!Capacitor.isNativePlatform()) {
      const currentUrl = new URL(window.location.href)
      if (currentUrl.searchParams.has('naver_code') || currentUrl.searchParams.has('auth_error')) {
        handleAuthReturnUrl(currentUrl.href)
          .catch(error => setAuthError(error.message || '로그인 정보를 적용하지 못했습니다.'))
          .finally(() => {
            window.history.replaceState({}, '', currentUrl.pathname)
          })
      }
    }

    let appUrlListener
    if (Capacitor.isNativePlatform()) {
      CapacitorApp.addListener('appUrlOpen', async ({ url }) => {
        try {
          await handleAuthReturnUrl(url)
          await Browser.close().catch(() => {})
        } catch (error) {
          setAuthError(error.message || '로그인 정보를 앱에 적용하지 못했습니다.')
        }
      }).then(handle => {
        appUrlListener = handle
      })

      CapacitorApp.getLaunchUrl().then(async launch => {
        if (!launch?.url) return
        if (localStorage.getItem(LOGGED_OUT_KEY) === '1') return
        try {
          await handleAuthReturnUrl(launch.url)
        } catch (error) {
          setAuthError(error.message || '로그인 정보를 앱에 적용하지 못했습니다.')
        }
      })
    }

    return () => {
      supabaseListener?.subscription.unsubscribe()
      appUrlListener?.remove()
    }
  }, [exchangeSupabaseSession, handleAuthReturnUrl])

  const submitAuth = useCallback(async (mode, email, password, remember = true, name = '') => {
    setAuthLoading(true)
    setAuthError('')
    setAuthNotice('')
    try {
      if (isSupabaseConfigured) {
        if (mode === 'register') {
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: { emailRedirectTo: authRedirectUrl(), data: name ? { name } : undefined },
          })
          if (error) throw error
          if (data.session?.access_token) {
            await exchangeSupabaseSession(data.session.access_token, remember)
          } else {
            setAuthNotice('인증 메일을 보냈습니다. 메일의 링크를 누른 뒤 로그인해 주세요.')
          }
          return
        }

        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (!error && data.session?.access_token) {
          await exchangeSupabaseSession(data.session.access_token, remember)
          return
        }
        // Existing users created before Supabase Auth can still use the legacy login.
      }

      const res = await fetch(`${API_URL}/auth/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name: name || undefined }),
      })
      const data = await res.json()
      if (!res.ok) {
        const fallback = mode === 'register'
          ? '회원가입에 실패했습니다.'
          : '이메일 또는 비밀번호가 올바르지 않습니다.'
        throw new Error(data.detail || fallback)
      }
      await saveAppSession(data, remember)
    } catch (e) {
      setAuthError(typeof e.message === 'string' ? e.message : '로그인에 실패했습니다.')
    } finally {
      setAuthLoading(false)
    }
  }, [exchangeSupabaseSession, saveAppSession])

  const requestPasswordReset = useCallback(async (email) => {
    setAuthLoading(true)
    setAuthError('')
    setAuthNotice('')
    try {
      if (!supabase) throw new Error('비밀번호 재설정 기능이 아직 설정되지 않았습니다.')
      if (!email?.trim()) throw new Error('가입한 이메일 주소를 입력해 주세요.')
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: authRedirectUrl(),
      })
      if (error) throw error
      setAuthNotice('비밀번호 재설정 메일을 보냈습니다.')
    } catch (error) {
      setAuthError(error.message || '비밀번호 재설정 메일을 보내지 못했습니다.')
    } finally {
      setAuthLoading(false)
    }
  }, [])

  const updatePassword = useCallback(async (password) => {
    setAuthLoading(true)
    setAuthError('')
    try {
      if (!supabase) throw new Error('비밀번호 재설정 기능이 아직 설정되지 않았습니다.')
      if ((password || '').length < 8) throw new Error('새 비밀번호는 8자 이상이어야 합니다.')
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      setPasswordRecovery(false)
      setAuthNotice('비밀번호가 변경되었습니다.')
    } catch (error) {
      setAuthError(error.message || '비밀번호를 변경하지 못했습니다.')
    } finally {
      setAuthLoading(false)
    }
  }, [])

  const socialLogin = useCallback(async (provider) => {
    setAuthError('')
    setAuthNotice('')
    try {
      if (provider === 'naver') {
        const returnTo = Capacitor.isNativePlatform()
          ? 'dalibaba://auth/callback'
          : `${window.location.origin}/`
        const url = `${API_URL}/auth/naver/start?return_to=${encodeURIComponent(returnTo)}`
        if (Capacitor.isNativePlatform()) await Browser.open({ url })
        else window.location.assign(url)
        return
      }
      if (!supabase) throw new Error('소셜 로그인이 아직 설정되지 않았습니다.')
      const native = Capacitor.isNativePlatform()
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: authRedirectUrl(),
          skipBrowserRedirect: native,
        },
      })
      if (error) throw error
      if (native) {
        if (!data.url) throw new Error('로그인 주소를 만들지 못했습니다.')
        await Browser.open({ url: data.url })
      }
    } catch (error) {
      setAuthError(error.message || '소셜 로그인을 시작하지 못했습니다.')
    }
  }, [])

  const updateName = useCallback(async (name) => {
    setAuthError('')
    try {
      const res = await fetch(`${API_URL}/account/name`, {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      if (!res.ok) throw new Error(await getApiError(res, '여행자 이름을 저장하지 못했습니다.'))
      const data = await res.json()
      setUser(data.user)
    } catch (error) {
      setAuthError(error.message || '여행자 이름을 저장하지 못했습니다.')
    }
  }, [authHeaders])

  const deleteAccount = useCallback(async () => {
    setAuthError('')
    try {
      const res = await fetch(`${API_URL}/me`, { method: 'DELETE', headers: authHeaders() })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.detail || '계정 탈퇴에 실패했습니다.')
      }
      localStorage.setItem(LOGGED_OUT_KEY, '1')
      localStorage.removeItem(AUTH_TOKEN_KEY)
      sessionStorage.removeItem(AUTH_TOKEN_KEY)
      setAuthToken('')
      setUser(null)
      await supabase?.auth.signOut()
      await refreshAccount('')
    } catch (e) {
      setAuthError(typeof e.message === 'string' ? e.message : '계정 탈퇴에 실패했습니다.')
    }
  }, [authHeaders, refreshAccount])

  const logout = useCallback(async () => {
    localStorage.setItem(LOGGED_OUT_KEY, '1')
    localStorage.removeItem(AUTH_TOKEN_KEY)
    sessionStorage.removeItem(AUTH_TOKEN_KEY)
    setAuthToken('')
    setUser(null)
    exchangedSupabaseToken.current = ''
    await supabase?.auth.signOut()
    refreshAccount('')
  }, [refreshAccount])

  const purchasePlan = useCallback(async (planId) => {
    setAuthError('')
    const plan = plans.find(item => item.id === planId)
    setAuthError(
      `${plan?.label || '선택한 이용권'} 결제는 Google Play 인앱결제 연결 후 사용할 수 있습니다.`
    )
  }, [plans])

  /* ── 메뉴판 사진에 번역을 입힌 이미지 생성 (요청 시) ── */
  const translateMenuImage = useCallback(async () => {
    if (!capturedImage) {
      setAnalyzeError('원본 이미지를 찾을 수 없습니다. 다시 촬영해주세요.')
      return
    }
    setTranslatingImage(true)
    try {
      const headers = { ...authHeaders(), 'Content-Type': 'application/json' }
      const body = JSON.stringify({ image_base64: capturedImage.base64, image_type: capturedImage.type })
      const res = await fetch(`${API_URL}/translate-image`, { method: 'POST', headers, body })
      const data = await res.json()
      if (!res.ok) throw new Error(await getApiError(res, '메뉴판 이미지를 만들지 못했습니다.'))
      setPriceResult(prev => prev ? {
        ...prev,
        translatedImage: data.translated_image || null,
        translatedImageMessage: data.message || (data.translated_image ? null : '번역할 텍스트를 찾지 못했습니다.'),
      } : prev)
    } catch (e) {
      setAnalyzeError(e.message || '메뉴판 이미지를 만들지 못했습니다.')
    } finally {
      setTranslatingImage(false)
    }
  }, [capturedImage, authHeaders])

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
      setScreen('result')
      setAnalyzing(true)

      const body    = JSON.stringify({ image_base64: compressed.base64, image_type: compressed.type })
      const headers = { ...authHeaders(), 'Content-Type': 'application/json' }

      console.log('[Dalibaba] /analyze 호출 시작...')
      const res  = await fetch(`${API_URL}/analyze`, { method: 'POST', headers, body, signal: controller.signal })
      console.log('[Dalibaba] /analyze 응답:', res.status)
      if (!res.ok) {
        const fallback = res.status === 429
          ? '오늘 사용 가능한 촬영 & 분석 횟수를 모두 사용했습니다. 내일 다시 시도해주세요.'
          : res.status === 401
            ? '로그인이 필요한 기능입니다.'
            : '이미지 분석에 실패했습니다. 잠시 후 다시 시도해주세요.'
        throw new Error(await getApiError(res, fallback))
      }
      let data = await res.json()
      console.log('[Dalibaba] 분석 결과:', data)
      if (data?.imageUsage) setImageUsage(data.imageUsage)

      if (data?.documentType === 'other') {
        try {
          const translatedRes = await fetch(`${API_URL}/translate-image`, {
            method: 'POST',
            headers,
            body,
            signal: controller.signal,
          })
          if (!translatedRes.ok) {
            throw new Error(await getApiError(
              translatedRes,
              '번역 서비스가 일시적으로 혼잡해 텍스트 번역만 표시합니다.',
            ))
          }
          const translatedData = await translatedRes.json()
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
  }, [priceResult, authHeaders])

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
          onTranslateImage={translateMenuImage}
          translatingImage={translatingImage}
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
          defaultCurrency={defaultCurrency} onDefaultCurrencyChange={setDefaultCurrency}
          cardFee={cardFee} onCardFeeChange={setCardFee}
          user={user}
          plans={plans}
          authError={authError}
          authNotice={authNotice}
          authLoading={authLoading}
          onAuthSubmit={submitAuth}
          onPasswordReset={requestPasswordReset}
          onPasswordUpdate={updatePassword}
          passwordRecovery={passwordRecovery}
          onSocialLogin={socialLogin}
          onLogout={logout}
          onDeleteAccount={deleteAccount}
          onPurchasePlan={purchasePlan}
          onBack={() => setScreen('home')}
          onPrivacyClick={() => openPublicPage('privacy')}
          onTermsClick={() => openPublicPage('terms')}
        />
      ) : screen === 'privacy' ? (
        <PrivacyPage onBack={closePublicPage} />
      ) : screen === 'terms' ? (
        <TermsPage onBack={closePublicPage} />
      ) : (
        <HomePage
          onCameraClick={goCamera}
          onFileSelect={handleImageFile}
          onSettingsClick={() => setScreen('settings')}
          defaultCurrency={defaultCurrency}
          user={user}
          aiUsage={aiUsage}
          imageUsage={imageUsage}
          authError={authError}
          authNotice={authNotice}
          authLoading={authLoading}
          onAuthSubmit={submitAuth}
          onPasswordReset={requestPasswordReset}
          onPasswordUpdate={updatePassword}
          passwordRecovery={passwordRecovery}
          onSocialLogin={socialLogin}
          onLogout={logout}
          onUpdateName={updateName}
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
