import { useState } from 'react'
import StaticLogoHeader from '../components/StaticLogoHeader'
import { EXCHANGE_CURRENCIES } from '../data/currencies'

const LANGS = [
  { code: 'auto', label: '자동 감지', flag: '🌐' },
  { code: 'ja',   label: '일본어',   flag: '🇯🇵' },
  { code: 'zh',   label: '중국어',   flag: '🇨🇳' },
  { code: 'en',   label: '영어',     flag: '🇺🇸' },
  { code: 'th',   label: '태국어',   flag: '🇹🇭' },
  { code: 'vi',   label: '베트남어', flag: '🇻🇳' },
  { code: 'fr',   label: '프랑스어', flag: '🇫🇷' },
  { code: 'de',   label: '독일어',   flag: '🇩🇪' },
  { code: 'es',   label: '스페인어', flag: '🇪🇸' },
  { code: 'it',   label: '이탈리아어', flag: '🇮🇹' },
]

export default function SettingsPage({
  sourceLang,
  onSourceLangChange,
  defaultCurrency,
  onDefaultCurrencyChange,
  cardFee,
  onCardFeeChange,
  user,
  plans = [],
  aiUsage,
  authError,
  onPurchasePlan,
  onDeleteAccount,
  onBack,
  onPrivacyClick,
  onTermsClick,
}) {
  const [payOpen, setPayOpen] = useState(false)
  const [selectedPlanId, setSelectedPlanId] = useState('')
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const selectedCurrency = EXCHANGE_CURRENCIES.find(item => item.code === defaultCurrency) || EXCHANGE_CURRENCIES[0]
  const activePlan = user?.entitlement
  const passPlans = plans.filter(plan => plan.kind === 'pass')
  const subscriptionPlans = plans.filter(plan => plan.kind === 'subscription')
  const selectedPlan = plans.find(plan => plan.id === selectedPlanId) || plans[0]
  const expiresLabel = activePlan?.expiresAt
    ? new Date(activePlan.expiresAt).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })
    : null

  const openPaySheet = () => {
    setSelectedPlanId(activePlan?.planId || plans[0]?.id || '')
    setPayOpen(true)
  }

  const checkout = () => {
    if (!selectedPlan) return
    onPurchasePlan?.(selectedPlan.id)
  }

  const confirmDelete = async () => {
    setDeleting(true)
    try {
      await onDeleteAccount?.()
    } finally {
      setDeleting(false)
      setDeleteOpen(false)
    }
  }

  return (
    <div className="settings-page">
      <div className="subtle-logo-header">
        <button className="settings-back-btn" onClick={onBack} aria-label="뒤로">←</button>
        <StaticLogoHeader />
      </div>

      <div className="settings-card" style={{marginTop:10}}>
        <div className="plan-status">
          <div>
            <div className="settings-section-title">AI 질문</div>
            <div className="settings-row-hint">
              무료 사용자는 하루 3회까지 질문할 수 있습니다.
            </div>
          </div>
          <strong>{aiUsage ? `${aiUsage.remaining}/${aiUsage.limit}` : '3/3'}</strong>
        </div>
        {activePlan && (
          <div className="plan-active-banner">
            {activePlan.label} · {expiresLabel}까지 활성화
          </div>
        )}
      </div>

      <div className="settings-card" style={{marginTop:10}}>
        <button className="settings-pay-entry" type="button" onClick={openPaySheet}>
          <div>
            <div className="settings-section-title">여행 패스 · 구독</div>
            <div className="settings-row-hint">
              {activePlan ? `${activePlan.label} 활성화됨` : '여행 기간권 또는 구독권을 선택합니다.'}
            </div>
          </div>
          <span className="settings-pay-entry-action">
            선택
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M9 6l6 6-6 6" />
            </svg>
          </span>
        </button>
        {authError && user && <div className="settings-error-text inside">{authError}</div>}
      </div>

      {payOpen && (
        <div className="pay-sheet-overlay" onClick={() => setPayOpen(false)}>
          <div className="pay-sheet" onClick={e => e.stopPropagation()}>
            <div className="pay-sheet-header">
              <div>
                <div className="pay-sheet-title">여행 패스 · 구독</div>
                <div className="pay-sheet-sub">필요한 기간을 선택한 뒤 결제로 이동합니다.</div>
              </div>
              <button className="pay-sheet-close" type="button" onClick={() => setPayOpen(false)}>✕</button>
            </div>

            <div className="pay-section-label">여행 패스</div>
            <div className="pay-plan-grid">
              {passPlans.map(plan => (
                <button
                  key={plan.id}
                  type="button"
                  className={`pay-plan-option ${selectedPlan?.id === plan.id ? 'active' : ''}`}
                  onClick={() => setSelectedPlanId(plan.id)}
                >
                  <span>{plan.label}</span>
                  <strong>${plan.priceUsd.toFixed(2)}</strong>
                </button>
              ))}
            </div>

            <div className="pay-section-label">구독</div>
            <div className="pay-subscription-list">
              {subscriptionPlans.map(plan => (
                <button
                  key={plan.id}
                  type="button"
                  className={`pay-subscription-option ${selectedPlan?.id === plan.id ? 'active' : ''}`}
                  onClick={() => setSelectedPlanId(plan.id)}
                >
                  <span>{plan.label}</span>
                  <strong>${plan.priceUsd.toFixed(2)}</strong>
                </button>
              ))}
            </div>

            {!user && <div className="settings-pay-note sheet">결제하려면 메인 화면에서 먼저 이메일 로그인이 필요합니다.</div>}
            <button
              className="pay-checkout-btn"
              type="button"
              disabled={!selectedPlan || !user}
              onClick={checkout}
            >
              {selectedPlan ? `${selectedPlan.label} 결제하기` : '요금제 선택'}
            </button>
          </div>
        </div>
      )}

      {/* 메뉴판 언어 */}
      <div className="settings-card">
        <div className="settings-row">
          <span className="settings-row-label">메뉴판 언어</span>
          <div className="settings-lang-picker">
            <span className="settings-lang-flag-cur">
              {LANGS.find(l => l.code === sourceLang)?.flag}
            </span>
            <span className="settings-lang-name-cur">
              {LANGS.find(l => l.code === sourceLang)?.label}
            </span>
            <span className="settings-lang-arrow">›</span>
            <select
              value={sourceLang}
              onChange={e => onSourceLangChange(e.target.value)}
              className="settings-lang-native-select"
              aria-label="메뉴판 언어 선택"
            >
              {LANGS.map(l => (
                <option key={l.code} value={l.code}>{l.flag} {l.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 기본 설정 */}
      <div className="settings-card" style={{marginTop:10}}>
        <div className="settings-row">
          <span className="settings-row-label">번역 언어</span>
          <span className="settings-row-value">한국어</span>
        </div>
        <div className="settings-row">
          <div>
            <div className="settings-row-label">환율계산기 기본 통화</div>
            <div className="settings-row-hint">계산기를 열 때 먼저 보여줄 통화</div>
          </div>
          <div className="settings-lang-picker">
            <span className="settings-lang-flag-cur">{selectedCurrency.flag}</span>
            <span className="settings-lang-name-cur">{selectedCurrency.code}</span>
            <span className="settings-lang-arrow">›</span>
            <select
              value={selectedCurrency.code}
              onChange={e => onDefaultCurrencyChange(e.target.value)}
              className="settings-lang-native-select"
              aria-label="환율계산기 기본 통화 선택"
            >
              {EXCHANGE_CURRENCIES.map(item => (
                <option key={item.code} value={item.code}>
                  {item.flag} {item.code} {item.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="settings-row">
          <div>
            <div className="settings-row-label">카드 수수료</div>
            <div className="settings-row-hint">해외 결제 시 카드사 수수료율</div>
          </div>
          <div className="settings-fee-input-wrap">
            <input
              type="number"
              min="0"
              max="10"
              step="0.1"
              value={cardFee}
              onChange={e => onCardFeeChange(parseFloat(e.target.value) || 0)}
              className="settings-fee-input"
            />
            <span className="settings-fee-unit">%</span>
          </div>
        </div>
      </div>

      {/* 약관 / 고객지원 */}
      <div className="settings-card" style={{marginTop:10}}>
        <button className="settings-row settings-row-link" type="button" onClick={onPrivacyClick}>
          <span className="settings-row-label">개인정보 처리방침</span>
          <span className="settings-lang-arrow">›</span>
        </button>
        <button className="settings-row settings-row-link" type="button" onClick={onTermsClick}>
          <span className="settings-row-label">이용약관</span>
          <span className="settings-lang-arrow">›</span>
        </button>
        <div className="settings-row">
          <span className="settings-row-label">고객지원</span>
          <span className="settings-row-value">dalibaba.help@gmail.com</span>
        </div>
      </div>

      {/* 계정 탈퇴 */}
      {user && (
        <div className="settings-card" style={{marginTop:10}}>
          <button className="settings-row settings-row-link danger" type="button" onClick={() => setDeleteOpen(true)}>
            <span className="settings-row-label">계정 탈퇴</span>
            <span className="settings-lang-arrow">›</span>
          </button>
        </div>
      )}

      {deleteOpen && (
        <div className="pay-sheet-overlay" onClick={() => setDeleteOpen(false)}>
          <div className="pay-sheet" onClick={e => e.stopPropagation()}>
            <div className="pay-sheet-header">
              <div>
                <div className="pay-sheet-title">계정을 탈퇴할까요?</div>
                <div className="pay-sheet-sub">
                  계정, 이용권, 사용 기록이 모두 삭제되며 되돌릴 수 없습니다.
                </div>
              </div>
              <button className="pay-sheet-close" type="button" onClick={() => setDeleteOpen(false)}>✕</button>
            </div>
            {authError && <div className="settings-error-text inside">{authError}</div>}
            <button className="pay-checkout-btn danger" type="button" disabled={deleting} onClick={confirmDelete}>
              {deleting ? '탈퇴 처리 중...' : '계정 탈퇴'}
            </button>
          </div>
        </div>
      )}

      {/* 앱 정보 */}
      <div className="settings-card" style={{marginTop:10}}>
        <div className="settings-row">
          <span className="settings-row-label">앱 버전</span>
          <span className="settings-row-value">1.0.0 BETA</span>
        </div>
        <div className="settings-row">
          <span className="settings-row-label">AI 분석 엔진</span>
          <span className="settings-row-value">Llama 4 Scout</span>
        </div>
        <div className="settings-row">
          <span className="settings-row-label">환율 데이터</span>
          <span className="settings-row-value">open.er-api.com</span>
        </div>
      </div>

      {/* 배경 다람쥐 */}
      <img src="/squirrel-peek.png" alt="" className="settings-bg-squirrel" aria-hidden="true" />

      {/* 앱 소개 */}
      <div className="settings-about">
        <div className="settings-about-name">Dalibaba</div>
      </div>

    </div>
  )
}
