import { useRef, useState } from 'react'
import html2canvas from 'html2canvas'

const SYM = {
  USD:'$', EUR:'€', JPY:'¥', KRW:'₩', CNY:'¥', GBP:'£',
  THB:'฿', VND:'₫', MYR:'RM ', SGD:'S$', HKD:'HK$',
  AUD:'A$', CAD:'C$', IDR:'Rp ', PHP:'₱'
}
const FLAGS = {
  USD:'🇺🇸', EUR:'🇪🇺', JPY:'🇯🇵', KRW:'🇰🇷', CNY:'🇨🇳',
  GBP:'🇬🇧', THB:'🇹🇭', VND:'🇻🇳', MYR:'🇲🇾', SGD:'🇸🇬',
  HKD:'🇭🇰', AUD:'🇦🇺', CAD:'🇨🇦', IDR:'🇮🇩', PHP:'🇵🇭'
}
const TIP_GUIDES = {
  USD: { label: '미국권 팁', min: 0.15, max: 0.20, note: '레스토랑 기준 15~20%' },
  CAD: { label: '캐나다 팁', min: 0.15, max: 0.20, note: '레스토랑 기준 15~20%' },
  GBP: { label: '영국 팁', min: 0.10, max: 0.125, note: '서비스료 없을 때 10~12.5%' },
  EUR: { label: '유럽 팁', min: 0.05, max: 0.10, note: '국가별 차이 있음, 보통 5~10%' },
  AUD: { label: '호주 팁', min: 0.00, max: 0.10, note: '필수 아님, 만족 시 최대 10%' },
  PHP: { label: '필리핀 팁', min: 0.05, max: 0.10, note: '서비스료 없을 때 5~10%' },
}

function guessIcon(name = '') {
  const n = (name || '').toLowerCase()
  if (/라멘|ramen|ラーメン|우동|소바/.test(n)) return '🍜'
  if (/스시|sushi|초밥|寿司/.test(n)) return '🍣'
  if (/피자|pizza/.test(n)) return '🍕'
  if (/버거|burger/.test(n)) return '🍔'
  if (/스테이크|steak/.test(n)) return '🥩'
  if (/갈비|カルビ|삼겹/.test(n)) return '🍖'
  if (/치킨|chicken/.test(n)) return '🍗'
  if (/커피|coffee|라떼/.test(n)) return '☕'
  if (/맥주|beer/.test(n)) return '🍺'
  if (/파스타|pasta/.test(n)) return '🍝'
  if (/카레|curry|カレー/.test(n)) return '🍛'
  if (/샐러드|salad/.test(n)) return '🥗'
  return '🍽️'
}

function fmtOrig(amount, currency) {
  const sym = SYM[currency] || (currency + ' ')
  const isInt = ['JPY','KRW','IDR','VND'].includes(currency)
  return sym + (isInt ? Math.round(amount).toLocaleString() : Number(amount).toFixed(2))
}
function fmtKrw(amount) {
  return '₩ ' + Math.round(amount || 0).toLocaleString('ko-KR')
}
function fmtPercent(value) {
  return `${Number((value * 100).toFixed(1)).toLocaleString('ko-KR')}%`
}
function fmtOrigRange(minAmount, maxAmount, currency) {
  if (minAmount === maxAmount) return fmtOrig(minAmount, currency)
  return `${fmtOrig(minAmount, currency)} ~ ${fmtOrig(maxAmount, currency)}`
}
function fmtKrwRange(minAmount, maxAmount) {
  if (minAmount === maxAmount) return fmtKrw(minAmount)
  return `${fmtKrw(minAmount)} ~ ${fmtKrw(maxAmount)}`
}

export default function OrderPage({ priceResult, cart, onBack, onReset, cardFee = 0 }) {
  const receiptRef = useRef(null)
  const [sharing, setSharing] = useState(false)
  const [orderMode, setOrderMode] = useState(false)
  const [copied, setCopied] = useState(false)

  const prices   = priceResult?.prices || []
  const currency = priceResult?.detectedCurrency
  const detected = priceResult?.detectedLanguage
  const isReceipt = priceResult?.documentType === 'receipt'
  const flag     = FLAGS[currency] || '🌐'

  const items = prices
    .map((item, i) => ({ ...item, qty: cart[i] || 0 }))
    .filter(item => item.qty > 0)

  const withFee   = (krw) => Math.round((krw || 0) * (1 + cardFee / 100))
  const totalKrw  = items.reduce((s, it) => s + it.qty * withFee(it.krwAmount), 0)
  const totalOrig = items.reduce((s, it) => s + it.qty * it.amount, 0)
  const tipGuide  = TIP_GUIDES[currency]
  const tipOrigMin = tipGuide ? totalOrig * tipGuide.min : 0
  const tipOrigMax = tipGuide ? totalOrig * tipGuide.max : 0
  const tipKrwMin  = tipGuide ? totalKrw * tipGuide.min : 0
  const tipKrwMax  = tipGuide ? totalKrw * tipGuide.max : 0

  const now = new Date().toLocaleString('ko-KR', {
    year:'numeric', month:'2-digit', day:'2-digit',
    hour:'2-digit', minute:'2-digit'
  })

  const orderLines = items.map(item => `${item.originalText || item.context} x ${item.qty}`)
  const orderText = [
    'Please order these items.',
    ...orderLines.map(line => `- ${line}`),
  ].join('\n')

  /* ── 캔버스 → Blob 변환 ── */
  const canvasToBlob = (canvas) =>
    new Promise((resolve, reject) => {
      canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('toBlob failed')), 'image/png')
    })

  /* ── 이미지 생성 ── */
  const buildBlob = async () => {
    const el = receiptRef.current
    const canvas = await html2canvas(el, {
      backgroundColor: '#ffffff',
      scale: 3,
      useCORS: true,
      allowTaint: true,
      logging: false,
      imageTimeout: 5000,
      letterRendering: true,
      foreignObjectRendering: false,
      width: el.offsetWidth,
      height: el.offsetHeight,
      windowWidth: el.offsetWidth,
      windowHeight: el.offsetHeight,
    })
    return canvasToBlob(canvas)
  }

  /* ── 주문서 PNG 다운로드 ── */
  const handleDownload = async () => {
    if (!receiptRef.current || sharing) return
    setSharing(true)
    try {
      const blob = await buildBlob()
      const file  = new File([blob], 'dalibaba-order.png', { type: 'image/png' })

      // Mobile browsers cannot silently write to the photo album.
      // Web Share opens the native sheet so the user can save the image.
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: isReceipt ? 'Dalibaba 영수증 저장' : 'Dalibaba 주문서 다운로드' })
        return
      }

      const url = URL.createObjectURL(blob)
      const a   = document.createElement('a')
      a.href = url; a.download = 'dalibaba-order.png'; a.click()
      setTimeout(() => URL.revokeObjectURL(url), 2000)

    } catch (e) {
      // 사용자가 공유 취소한 경우는 무시
      if (e?.name !== 'AbortError') {
        console.error('[Share]', e)
        alert(`⚠️ ${isReceipt ? '영수증 저장' : '주문서 다운로드'}에 실패했어요. 다시 시도해주세요.`)
      }
    } finally {
      setSharing(false)
    }
  }

  const handleCopyOrder = async () => {
    try {
      await navigator.clipboard?.writeText(orderText)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="order-page">

      {/* 헤더 */}
      <div className="order-header">
        <button className="result-back-btn" onClick={onBack}>←</button>
        <span className="result-title">{isReceipt ? '영수증 저장' : '주문서'}</span>
        <div style={{width:34}} />
      </div>

      {/* 영수증 — 캡처 대상 */}
      <div className="receipt" ref={receiptRef}>

        {/* 배경 로고 */}
        <img src="/logo-back.png" alt="" className="receipt-bg-logo" aria-hidden="true" />

        {/* 헤더 */}
        <div className="receipt-head">
          <div className="receipt-head-texts">
            <div className="receipt-head-brand">Dalibaba</div>
            <div className="receipt-head-info">{isReceipt ? '영수증 자동 정리' : '주문서'} · {flag} {detected} · {currency}</div>
            <div className="receipt-head-date">{now}</div>
          </div>
        </div>

        <div className="receipt-dash-line" />

        {/* 항목 */}
        <div className="receipt-body">
          {items.map((item, i) => {
            return (
              <div key={i} className="receipt-row">
                <div className="receipt-row-top">
                  <div className="receipt-row-names">
                    <span className="receipt-row-name">{item.context}</span>
                    {item.originalText && item.originalText !== item.context && (
                      <span className="receipt-row-orig">{item.originalText}</span>
                    )}
                  </div>
                  <span className="receipt-row-qty-badge">× {item.qty}</span>
                </div>
                {/* 가격 */}
                <div className="receipt-row-prices">
                  <span className="receipt-row-unit">{fmtOrig(item.amount, item.currency)} × {item.qty}</span>
                  <span className="receipt-row-krw">{fmtKrw(withFee(item.krwAmount) * item.qty)}</span>
                </div>
              </div>
            )
          })}
        </div>

        <div className="receipt-dash-line" />

        {/* 합계 */}
        <div className="receipt-totals">
          <div className="receipt-total-line">
            <span>현지 금액</span>
            <span>{fmtOrig(totalOrig, currency || 'USD')}</span>
          </div>
          {tipGuide && (
            <div className="receipt-tip-box">
              <div className="receipt-tip-top">
                <span>{tipGuide.label}</span>
                <strong>{fmtPercent(tipGuide.min)} ~ {fmtPercent(tipGuide.max)}</strong>
              </div>
              <div className="receipt-tip-amount">
                {fmtOrigRange(tipOrigMin, tipOrigMax, currency || 'USD')}
                <span>{fmtKrwRange(tipKrwMin, tipKrwMax)}</span>
              </div>
              <div className="receipt-tip-note">{tipGuide.note}</div>
            </div>
          )}
          {cardFee > 0 && (
            <div className="receipt-total-line">
              <span>수수료 전 환산</span>
              <span>{fmtKrw(items.reduce((s, it) => s + it.qty * (it.krwAmount || 0), 0))}</span>
            </div>
          )}
          {cardFee > 0 && (
            <div className="receipt-total-line">
              <span>카드 수수료 ({cardFee}%)</span>
              <span>+ {fmtKrw(totalKrw - items.reduce((s, it) => s + it.qty * (it.krwAmount || 0), 0))}</span>
            </div>
          )}
          <div className="receipt-total-line main">
            <span>원화{cardFee > 0 ? ' (수수료 포함)' : ''}</span>
            <span>{fmtKrw(totalKrw)}</span>
          </div>
        </div>

        <div className="receipt-dash-line" />

        {/* 푸터 */}
        <div className="receipt-foot">즐거운 여행 되세요</div>

      </div>

      {orderMode && (
        <div className="order-phrase-card">
          <div className="order-phrase-title">주문할 때 보여주세요</div>
          <div className="order-phrase-text">
            {orderLines.map((line, index) => (
              <div key={index}>{line}</div>
            ))}
          </div>
          <button className="order-copy-btn" onClick={handleCopyOrder}>
            {copied ? '복사됨' : '주문 문구 복사'}
          </button>
        </div>
      )}

      {/* 버튼 */}
      <div className="order-actions">
        <button className="result-action-btn" onClick={onReset}>처음으로</button>
        <button className="result-action-btn order-now-btn" onClick={() => setOrderMode(v => !v)}>
          주문하기
        </button>
        <button
          className={`result-action-btn primary ${sharing ? 'loading' : ''}`}
          onClick={handleDownload}
          disabled={sharing}
        >
          {sharing ? '생성 중...' : isReceipt ? '영수증 이미지 저장' : '주문서 다운로드'}
        </button>
      </div>

    </div>
  )
}
