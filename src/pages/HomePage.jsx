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

function PersonIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" />
    </svg>
  )
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
  const [profileOpen, setProfileOpen] = useState(false)
  const activePlan = user?.entitlement
  const activePlanLabel = activePlan?.label || '무료 플랜'
  const [rates,     setRates]     = useState({})
  const [rateDate,  setRateDate]  = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [sourceLang, setSourceLang] = useState('auto')
  const [rateIndex, setRateIndex] = useState(0)
  const [authMode, setAuthMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [travelerName, setTravelerName] = useState('')
  const [authOpen, setAuthOpen] = useState(false)
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
    localStorage.setItem('dalibaba_saved_email', email)
    onAuthSubmit?.(authMode, email, password, true, travelerName)
  }

  useEffect(() => {
    setEmail(localStorage.getItem('dalibaba_saved_email') || '')
  }, [])

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
          <div className="home-profile-wrap">
            <button
              className="home-settings-btn"
              type="button"
              onClick={() => setProfileOpen(open => !open)}
              aria-label="내 정보"
            >
              <PersonIcon />
            </button>
            {profileOpen && (
              <>
                <div className="home-profile-backdrop" onClick={() => setProfileOpen(false)} />
                <div className="home-profile-panel">
                  <div className="home-profile-email">{user.name || user.email}</div>
                  <div className="home-profile-plan">{activePlanLabel}</div>
                  <div className="home-profile-row">
                    <span>촬영 & 분석</span>
                    <strong>{imageUsage ? `${imageUsage.remaining}/${imageUsage.limit}` : '1/1'}</strong>
                  </div>
                  <div className="home-profile-row">
                    <span>AI 질문</span>
                    <strong>{aiUsage ? `${aiUsage.remaining}/${aiUsage.limit}` : '3/3'}</strong>
                  </div>
                  <button
                    className="home-profile-tab logout"
                    type="button"
                    onClick={() => { setProfileOpen(false); onLogout?.() }}
                  >
                    로그아웃
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          <button className="home-login-btn" type="button" onClick={() => setAuthOpen(true)}>
            로그인
          </button>
        )}
        <button className="home-settings-btn" onClick={onSettingsClick} aria-label="설정">
          <SettingsGearIcon />
        </button>
      </div>

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
              <div className="auth-toggle">
                <button
                  type="button"
                  className={authMode === 'login' ? 'active' : ''}
                  onClick={() => setAuthMode('login')}
                >
                  로그인
                </button>
                <button
                  type="button"
                  className={authMode === 'register' ? 'active' : ''}
                  onClick={() => setAuthMode('register')}
                >
                  회원가입
                </button>
              </div>
            )}

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
              {!passwordRecovery && authMode === 'register' && (
                <input
                  type="text"
                  value={travelerName}
                  onChange={e => setTravelerName(e.target.value)}
                  placeholder="여행자 이름"
                  autoComplete="name"
                  maxLength={30}
                  required
                />
              )}
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
            <svg className="home-cta-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
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
          <div className="home-cta-divider" aria-hidden="true">
            <svg width="24" height="100%" viewBox="0 0 24 56" preserveAspectRatio="none">
              <path
                d="M0,0 L12,0 C18,7 6,7 12,14 C18,21 6,21 12,28 C18,35 6,35 12,42 C18,49 6,49 12,56 L0,56 Z"
                fill="#8A5A33"
              />
              <path
                d="M24,0 L12,0 C18,7 6,7 12,14 C18,21 6,21 12,28 C18,35 6,35 12,42 C18,49 6,49 12,56 L24,56 Z"
                fill="#FBF4EC"
              />
            </svg>
          </div>
          <button className="home-cta-btn gallery" onClick={() => (user ? galleryRef.current?.click() : setAuthOpen(true))}>
            <svg className="home-cta-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="3" width="18" height="18" rx="3" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
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
