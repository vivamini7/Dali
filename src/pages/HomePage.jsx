import { useEffect, useState, useRef } from 'react'
import SquirrelHeader from '../components/SquirrelHeader'
import ExchangePage from './ExchangePage'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:7860'

const PREVIEW_RATES = [
  { code: 'USD', name: '미국 달러', flag: '🇺🇸' },
  { code: 'EUR', name: '유로',      flag: '🇪🇺' },
  { code: 'JPY', name: '일본 엔',   flag: '🇯🇵' },
  { code: 'CNY', name: '중국 위안', flag: '🇨🇳' },
]

const SOURCE_LANGS = [
  { code: 'auto', label: '언어 감지' },
  { code: 'en',   label: '영어' },
  { code: 'ja',   label: '일본어' },
  { code: 'zh',   label: '중국어' },
  { code: 'th',   label: '태국어' },
  { code: 'fr',   label: '프랑스어' },
  { code: 'de',   label: '독일어' },
  { code: 'es',   label: '스페인어' },
  { code: 'it',   label: '이탈리아어' },
  { code: 'vi',   label: '베트남어' },
]

function fmtRate(value, code) {
  if (!value) return null
  const isInt = ['JPY', 'KRW', 'IDR', 'VND'].includes(code)
  return isInt
    ? value.toLocaleString('ko-KR', { maximumFractionDigits: 2 })
    : value.toLocaleString('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function SettingsGearIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.17A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.17a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9c.14.31.47 1 .94 1H21a2 2 0 010 4h-.17a1.65 1.65 0 00-1.43 1z" />
    </svg>
  )
}

export default function HomePage({
  onCameraClick,
  onFileSelect,
  onSettingsClick,
  defaultCurrency,
  user,
  aiUsage,
  imageUsage,
  authError,
  authNotice,
  authLoading,
  onAuthSubmit,
  onPasswordReset,
  onPasswordUpdate,
  passwordRecovery,
  onSocialLogin,
  onLogout,
}) {
  const [rates,     setRates]     = useState({})
  const [rateDate,  setRateDate]  = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [sourceLang, setSourceLang] = useState('auto')
  const [rateIndex, setRateIndex] = useState(0)
  const [authMode, setAuthMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authOpen, setAuthOpen] = useState(false)
  const [rememberLogin, setRememberLogin] = useState(() => localStorage.getItem('dalibaba_remember_login') === '1')
  const cameraRef = useRef(null)
  const galleryRef = useRef(null)

  useEffect(() => {
    // 환율은 프론트에서 직접 가져옴 (백엔드 불필요, CORS 허용 API)
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 8000)

    fetch('https://open.er-api.com/v6/latest/USD', { signal: controller.signal })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.rates) {
          setRates(d.rates)
          setRateDate(new Date().toLocaleString('ko-KR', {
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', hour12: false,
          }))
        }
      })
      .catch(() => {})
      .finally(() => { clearTimeout(timer); setLoading(false) })
  }, [])

  const handleGalleryFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    onFileSelect(file)
  }

  const handleCameraFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    onFileSelect(file)
  }

  const submitAuth = (e) => {
    e.preventDefault()
    if (passwordRecovery) {
      onPasswordUpdate?.(password)
      return
    }
    if (rememberLogin) {
      localStorage.setItem('dalibaba_remember_login', '1')
      localStorage.setItem('dalibaba_saved_email', email)
    } else {
      localStorage.removeItem('dalibaba_remember_login')
      localStorage.removeItem('dalibaba_saved_email')
    }
    onAuthSubmit?.(authMode, email, password, rememberLogin)
  }

  useEffect(() => {
    if (rememberLogin) setEmail(localStorage.getItem('dalibaba_saved_email') || '')
  }, [rememberLogin])

  useEffect(() => {
    if (user) setAuthOpen(false)
  }, [user])

  useEffect(() => {
    if (passwordRecovery) setAuthOpen(true)
  }, [passwordRecovery])

  const krwRate = rates['KRW'] || 0
  const activeRate = PREVIEW_RATES[rateIndex]
  const activeUsdToTarget = rates[activeRate.code]
  const activeKrwPerUnit = activeUsdToTarget && krwRate
    ? krwRate / activeUsdToTarget
    : null
  const moveRate = (step) => {
    setRateIndex(index => (index + step + PREVIEW_RATES.length) % PREVIEW_RATES.length)
  }

  return (
    <div className="home-page" style={{overflowY:'auto'}}>

      {/* ── 헤더: 다람쥐 motion ── */}
      <div className="home-header">
        <SquirrelHeader />
        {user ? (
          <button className="home-login-btn" type="button" onClick={onLogout}>
            로그아웃
          </button>
        ) : (
          <button className="home-login-btn" type="button" onClick={() => setAuthOpen(true)}>
            로그인
          </button>
        )}
        <button className="home-settings-btn" onClick={onSettingsClick} aria-label="설정">
          <SettingsGearIcon />
        </button>
      </div>

      {user && (imageUsage || aiUsage) && (
        <div className="home-usage-row">
          {imageUsage && (
            <span className="home-usage-pill">촬영/분석 {imageUsage.remaining}/{imageUsage.limit}</span>
          )}
          {aiUsage && (
            <span className="home-usage-pill">AI 질문 {aiUsage.remaining}/{aiUsage.limit}</span>
          )}
        </div>
      )}

      {authOpen && (
        <div className="home-auth-overlay" onClick={() => setAuthOpen(false)}>
          <form className="home-auth-modal" onSubmit={submitAuth} onClick={e => e.stopPropagation()}>
            <div className="home-auth-top">
              <div>
                <span className="home-account-kicker">계정</span>
                <strong>{passwordRecovery ? '새 비밀번호 설정' : authMode === 'login' ? '로그인' : '회원가입'}</strong>
              </div>
              <button className="home-auth-close" type="button" onClick={() => setAuthOpen(false)}>✕</button>
            </div>

            {!passwordRecovery && (
              <>
                <div className="social-login-list">
                  <button type="button" className="social-login-btn google" onClick={() => onSocialLogin?.('google')} aria-label="Google 계정으로 계속">
                    <span className="social-brand-icon google-icon" aria-hidden="true">G</span>
                  </button>
                  <button type="button" className="social-login-btn kakao" onClick={() => onSocialLogin?.('kakao')} aria-label="카카오 계정으로 계속">
                    <span className="social-brand-icon kakao-icon" aria-hidden="true">
                      <svg viewBox="0 0 24 24">
                        <path d="M12 4C6.9 4 3 7.1 3 10.9c0 2.5 1.7 4.7 4.3 5.9l-.9 3.1c-.1.3.2.5.5.3l3.8-2.5c.4 0 .9.1 1.3.1 5.1 0 9-3.1 9-6.9S17.1 4 12 4Z" />
                      </svg>
                    </span>
                  </button>
                  <button type="button" className="social-login-btn naver" onClick={() => onSocialLogin?.('naver')} aria-label="네이버 계정으로 계속">
                    <span className="social-brand-icon naver-icon" aria-hidden="true">N</span>
                  </button>
                </div>

                <div className="home-auth-divider"><span>또는 이메일</span></div>
              </>
            )}

            <div className="home-auth-fields">
              {!passwordRecovery && (
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="email@example.com"
                  autoComplete="email"
                  required
                />
              )}
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={passwordRecovery ? '새 비밀번호 (8자 이상)' : '비밀번호'}
                autoComplete={authMode === 'login' && !passwordRecovery ? 'current-password' : 'new-password'}
                minLength={passwordRecovery ? 8 : 6}
                required
              />
            </div>
            {!passwordRecovery && (
              <label className="home-remember-row">
                <input
                  type="checkbox"
                  checked={rememberLogin}
                  onChange={e => setRememberLogin(e.target.checked)}
                />
                <span>로그인 정보 저장하기</span>
              </label>
            )}
            {authError && <div className="home-auth-error">{authError}</div>}
            {authNotice && <div className="home-auth-info">{authNotice}</div>}
            <button className="home-auth-submit" type="submit" disabled={authLoading}>
              {authLoading
                ? '처리 중...'
                : passwordRecovery
                  ? '새 비밀번호 저장'
                  : authMode === 'login'
                    ? '이메일로 로그인'
                    : '회원가입 완료'}
            </button>
            {!passwordRecovery && authMode === 'login' && (
              <button
                className="home-auth-secondary"
                type="button"
                disabled={authLoading}
                onClick={() => onPasswordReset?.(email)}
              >
                비밀번호를 잊으셨나요?
              </button>
            )}
            {!passwordRecovery && (
              <button
                className="home-auth-switch"
                type="button"
                onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
              >
                {authMode === 'login' ? '이메일로 회원가입하기' : '이미 계정이 있어요. 로그인하기'}
              </button>
            )}
          </form>
        </div>
      )}

      <div className="home-tools-grid">
        {/* ── 실시간 환율 미리보기 ── */}
        <div className="home-rate-card">
          <div className="home-rate-header">
            <span className="home-rate-title">⚡ 실시간 환율</span>
            <span className="home-rate-updated">
              {rateDate ? (
                <>{rateDate} <span style={{color:'var(--blue)',cursor:'pointer'}} onClick={() => window.location.reload()}>♻</span></>
              ) : '불러오는 중...'}
            </span>
          </div>

          <div className="home-rate-list" style={{ display: 'none' }}>
            {PREVIEW_RATES.map(c => {
              const usdToTarget = rates[c.code]
              const krwPerUnit  = usdToTarget && krwRate
                ? krwRate / usdToTarget
                : null
              return (
                <div key={c.code} className="home-rate-row">
                  <span className="home-rate-flag">{c.flag}</span>
                  <div className="home-rate-info">
                    <div className="home-rate-code">{c.code}</div>
                    <div className="home-rate-name">{c.name}</div>
                  </div>
                  {loading ? (
                    <div className="home-rate-loading" />
                  ) : (
                    <div className="home-rate-value">
                      {krwPerUnit
                        ? <>{fmtRate(krwPerUnit, 'KRW')}<span>KRW</span></>
                        : <span style={{color:'var(--text-3)',fontSize:'.75rem'}}>—</span>
                      }
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          <div className="home-rate-slider" aria-live="polite">
            <button className="home-rate-arrow" type="button" onClick={() => moveRate(-1)} aria-label="이전 환율">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>
            </button>

            <div className="home-rate-slide" key={activeRate.code}>
              <div className="home-rate-slide-top">
                <span className="home-rate-flag">{activeRate.flag}</span>
                <div className="home-rate-info">
                  <div className="home-rate-code">{activeRate.code}</div>
                  <div className="home-rate-name">{activeRate.name}</div>
                </div>
              </div>
              {loading ? (
                <div className="home-rate-loading" />
              ) : (
                <div className="home-rate-value">
                  {activeKrwPerUnit
                    ? <>{fmtRate(activeKrwPerUnit, 'KRW')}<span>KRW</span></>
                    : <span style={{color:'var(--text-3)',fontSize:'.75rem'}}>--</span>
                  }
                </div>
              )}
            </div>

            <button className="home-rate-arrow" type="button" onClick={() => moveRate(1)} aria-label="다음 환율">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
            </button>
          </div>
          <div className="home-rate-dots" aria-hidden="true">
            {PREVIEW_RATES.map((rate, index) => (
              <span key={rate.code} className={index === rateIndex ? 'active' : ''} />
            ))}
          </div>
        </div>

        <ExchangePage embedded defaultCurrency={defaultCurrency} />
      </div>

      {/* ── 메인 CTA 카드 ── */}
      <div className="home-cta-card">
        <div className="home-cta-kicker">Dalibaba</div>
        <div className="home-cta-title">
          메뉴판도 영수증도<br />
          <em>찍으면 바로 정리</em>
        </div>
        <div className="home-cta-sub">카메라로 메뉴판이나 영수증을 찍으면 AI가 메뉴명, 수량, 금액을 읽고 원화로 정리해줘요.</div>

        <div className="home-howto" aria-label="사용 방법">
          <div>
            <span>메뉴판을 찍고 AI에게 물어보세요.</span>
          </div>
          <div>
            <span>담은 메뉴로 주문서와 금액을 확인해요.</span>
          </div>
          <div>
            <span>팁이 필요한 나라는 팁 금액도 함께 봐요.</span>
          </div>
        </div>

        {/* 다람쥐 배경 */}
        <img src="/squirrel-peek.png" alt="" className="home-cta-squirrel" aria-hidden="true" />
      </div>

      <div className="home-action-card">
        <div className="home-cta-btns">
          <button className="home-cta-btn" onClick={() => (user ? cameraRef.current?.click() : setAuthOpen(true))}>
            촬영하기
          </button>
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: 'none' }}
            onChange={handleCameraFile}
          />
          <button className="home-cta-btn gallery" onClick={() => (user ? galleryRef.current?.click() : setAuthOpen(true))}>
            앨범에서 선택
          </button>
          <input
            ref={galleryRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleGalleryFile}
          />
        </div>
      </div>

    </div>
  )
}
