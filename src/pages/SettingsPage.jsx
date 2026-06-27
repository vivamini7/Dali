import { useState } from 'react'
import StaticLogoHeader from '../components/StaticLogoHeader'
import { EXCHANGE_CURRENCIES } from '../data/currencies'

export default function SettingsPage({
  defaultCurrency,
  onDefaultCurrencyChange,
  cardFee,
  onCardFeeChange,
  user,
  plans = [],
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
  const premiumPlans = plans.filter(plan => plan.kind === 'premium')
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

      <div className="settings-row-2col">
        <button className="settings-mini-card settings-mini-btn" type="button" onClick={openPaySheet} style={{flex: 1}}>
          <div className="settings-mini-title">여행 패스 · 구독</div>
          <div className="settings-mini-value">{activePlan ? activePlan.label : '선택하기'}</div>
          <div className="settings-mini-hint">{activePlan ? `${expiresLabel}까지` : '구매 / 구독'}</div>
        </button>
      </div>
      {authError && user && <div className="settings-error-text inside" style={{margin:'8px 16px 0'}}>{authError}</div>}

      {payOpen && (
        <div className="pay-sheet-overlay" onClick={() => setPayOpen(false)}>
          <div className="pay-sheet" onClick={e => e.stopPropagation()}>
            <div className="pay-sheet-header">
              <div>
                <div className="pay-sheet-title">여행 패스 · 구독</div>
                <div className="pay-sheet-sub">Google Play 인앱결제 연결 후 사용할 수 있습니다.</div>
              </div>
              <button className="pay-sheet-close" type="button" onClick={() => setPayOpen(false)}>✕</button>
            </div>

            <div className="pay-section-label">여행 패스 (촬영 & 분석 5회 · AI 질문 15회)</div>
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

            <div className="pay-section-label">구독 (촬영 & 분석 5회 · AI 질문 15회)</div>
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

            <div className="pay-section-label">프리미엄 (촬영 & 분석 10회 · AI 질문 30회)</div>
            <div className="pay-subscription-list">
              {premiumPlans.map(plan => (
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
              {selectedPlan ? `${selectedPlan.label} 준비 중` : '요금제 선택'}
            </button>
          </div>
        </div>
      )}

      {/* 기본 설정 */}
      <div className="settings-card">
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
          <span className="settings-row-value">juneekeyun@gmail.com</span>
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

      {/* 배경 다람쥐 */}
      <img src="/squirrel-peek.png" alt="" className="settings-bg-squirrel" aria-hidden="true" />

      {/* 앱 소개 */}
      <div className="settings-about">
        <div className="settings-about-name">Dalibaba</div>
        <div className="settings-app-version">0.9.8 beta</div>
      </div>

    </div>
  )
}
