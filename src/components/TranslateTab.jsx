import { useState, useRef, useEffect, useCallback } from 'react'

/* ────────────────────────────────
   Helpers
──────────────────────────────── */
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

/* 원화 → 목표 통화 변환
   usdRates: { USD:1, KRW:1380, JPY:155, … } (USD 기준) */
function convertFromKrw(krwAmount, targetCode, usdRates) {
  if (targetCode === 'KRW') return krwAmount
  if (!usdRates['KRW'] || !usdRates[targetCode]) return null
  const inUsd = krwAmount / usdRates['KRW']
  return inUsd * usdRates[targetCode]
}

/* 원본 통화 → 목표 통화 변환 */
function convertFromOriginal(amount, fromCode, targetCode, usdRates) {
  if (fromCode === targetCode) return amount
  if (!usdRates[fromCode] || !usdRates[targetCode]) return null
  const inUsd = amount / usdRates[fromCode]
  return inUsd * usdRates[targetCode]
}

const CURRENCY_SYMBOLS = {
  USD:'$', EUR:'€', JPY:'¥', GBP:'£', CNY:'¥',
  KRW:'₩', THB:'฿', VND:'₫', PHP:'₱', IDR:'Rp',
  MYR:'RM', SGD:'S$', HKD:'HK$', AUD:'A$', CAD:'C$', CHF:'Fr',
}

const CURRENCIES = [
  { code:'KRW', name:'한국 원',        flag:'🇰🇷' },
  { code:'USD', name:'미국 달러',       flag:'🇺🇸' },
  { code:'EUR', name:'유로',            flag:'🇪🇺' },
  { code:'JPY', name:'일본 엔',         flag:'🇯🇵' },
  { code:'GBP', name:'영국 파운드',     flag:'🇬🇧' },
  { code:'CNY', name:'중국 위안',       flag:'🇨🇳' },
  { code:'AUD', name:'호주 달러',       flag:'🇦🇺' },
  { code:'CAD', name:'캐나다 달러',     flag:'🇨🇦' },
  { code:'CHF', name:'스위스 프랑',     flag:'🇨🇭' },
  { code:'HKD', name:'홍콩 달러',       flag:'🇭🇰' },
  { code:'SGD', name:'싱가포르 달러',   flag:'🇸🇬' },
  { code:'THB', name:'태국 바트',       flag:'🇹🇭' },
  { code:'MYR', name:'말레이시아 링깃', flag:'🇲🇾' },
  { code:'IDR', name:'인도네시아 루피아', flag:'🇮🇩' },
  { code:'PHP', name:'필리핀 페소',     flag:'🇵🇭' },
  { code:'VND', name:'베트남 동',       flag:'🇻🇳' },
]

function fmtOrig(amount, currency) {
  const sym = CURRENCY_SYMBOLS[currency] || (currency + ' ')
  const num = amount % 1 === 0
    ? Math.round(amount).toLocaleString('en')
    : amount.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return `${sym}${num}`
}

function fmtConverted(amount, code) {
  if (amount == null) return '—'
  const sym = CURRENCY_SYMBOLS[code] || (code + ' ')
  // 소수 처리: JPY, KRW, IDR, VND 등은 소수 없음
  const noDecimal = ['JPY','KRW','IDR','VND','HUF'].includes(code)
  const num = noDecimal
    ? Math.round(amount).toLocaleString('ko-KR')
    : amount.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return `${sym}${num}`
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:7860'

/* ────────────────────────────────
   Component
──────────────────────────────── */
export default function TranslateTab() {
  const [image, setImage]           = useState(null)
  const [loading, setLoading]       = useState(false)
  const [priceResult, setPriceResult] = useState(null)
  const [translatedImage, setTranslatedImage] = useState(null)
  const [error, setError]           = useState(null)
  const [targetCurrency, setTargetCurrency] = useState('KRW')
  const [usdRates, setUsdRates]     = useState({})

  const cameraRef  = useRef(null)
  const galleryRef = useRef(null)

  /* 앱 시작 시 환율 백그라운드 로드 */
  useEffect(() => {
    fetch(`${API_URL}/rates`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.rates) setUsdRates(d.rates) })
      .catch(() => {})
  }, [])

  const doAnalyze = useCallback(async (imgData) => {
    setLoading(true)
    setPriceResult(null)
    setTranslatedImage(null)
    setError(null)

    try {
      const body    = JSON.stringify({ image_base64: imgData.base64, image_type: imgData.type })
      const headers = { 'Content-Type': 'application/json' }

      const [priceRes, translateRes] = await Promise.all([
        fetch(`${API_URL}/analyze`,         { method:'POST', headers, body }),
        fetch(`${API_URL}/translate-image`, { method:'POST', headers, body }),
      ])

      const priceData     = priceRes.ok     ? await priceRes.json()     : null
      const translateData = translateRes.ok ? await translateRes.json() : null

      setPriceResult(priceData)
      setTranslatedImage(translateData?.translated_image ?? null)

      if (!priceData && !translateData) {
        setError('분석에 실패했습니다.\n메뉴판이 잘 보이도록 다시 찍어주세요.')
      }
    } catch (e) {
      const isNetwork = e.message.includes('fetch') || e.message.includes('Failed')
      setError(isNetwork
        ? '서버에 연결할 수 없습니다.\nVITE_API_URL을 확인해주세요.'
        : e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setPriceResult(null)
    setTranslatedImage(null)
    setError(null)
    try {
      const compressed = await compressImage(file)
      setImage(compressed)
      doAnalyze(compressed)
    } catch {
      setError('이미지를 불러오지 못했습니다.')
    }
  }

  const reset = () => {
    setImage(null)
    setPriceResult(null)
    setTranslatedImage(null)
    setError(null)
  }

  const targetInfo = CURRENCIES.find(c => c.code === targetCurrency)

  /* ── 가격 변환 (원본 currency → 선택 통화) ── */
  const convertedPrices = priceResult?.prices?.map(p => {
    let converted = null
    if (p.krwAmount != null) {
      converted = convertFromKrw(p.krwAmount, targetCurrency, usdRates)
    } else if (p.amount != null && p.currency) {
      converted = convertFromOriginal(p.amount, p.currency, targetCurrency, usdRates)
    }
    return { ...p, converted }
  })

  /* ──────────────
     CAMERA SCREEN
  ────────────── */
  if (!image) {
    return (
      <div className="translate-tab">
        <div className="camera-screen">

          <div className="camera-intro">
            <div className="camera-intro-badge">✈️ TRAVEL MENU READER</div>
            <span className="camera-intro-icon">📸</span>
            <h2>사진을 찍어주세요</h2>
            <p>메뉴판 · 가격표 · 안내판 어디든<br />찍으면 바로 번역 + 환율 계산</p>
          </div>

          <div className="camera-buttons-row">
            {/* 카메라 촬영 */}
            <label className="camera-main-btn">
              <input
                ref={cameraRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFile}
              />
              <div className="camera-main-icon">📷</div>
              <div className="camera-main-label">카메라</div>
              <div className="camera-main-sub">바로 찍기</div>
            </label>

            {/* 갤러리 선택 */}
            <label className="camera-gallery-btn">
              <input
                ref={galleryRef}
                type="file"
                accept="image/*"
                onChange={handleFile}
              />
              <div className="camera-gallery-icon">🖼️</div>
              <div className="camera-gallery-label">갤러리</div>
              <div className="camera-gallery-sub">앨범에서 선택</div>
            </label>
          </div>

          <div className="camera-tip">
            💡 글자와 가격이 선명하게 보이도록 찍으면 더 정확해요
          </div>

        </div>
      </div>
    )
  }

  /* ──────────────
     RESULT SCREEN
  ────────────── */
  return (
    <div className="translate-tab">
      <div className="results">

        {/* 상단 바 */}
        <div className="result-topbar">
          <button className="btn-ghost" onClick={reset}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
              <path d="M19 12H5M12 5l-7 7 7 7"/>
            </svg>
            새 사진
          </button>

          {priceResult?.detectedLanguage && (
            <span className="lang-badge">🌐 {priceResult.detectedLanguage}</span>
          )}

          {/* 환산 통화 선택 */}
          <div className="currency-chip-wrap">
            <span className="currency-chip-label">환산</span>
            <select
              className="currency-chip-select"
              value={targetCurrency}
              onChange={e => setTargetCurrency(e.target.value)}
            >
              {CURRENCIES.map(c => (
                <option key={c.code} value={c.code}>
                  {c.flag} {c.code}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 이미지: 번역본 우선, 없으면 원본 + 오버레이 태그 */}
        <div className="overlay-card">
          <div className="overlay-container">
            {translatedImage ? (
              <img
                src={`data:image/jpeg;base64,${translatedImage}`}
                alt="번역된 메뉴 이미지"
                className="overlay-img"
              />
            ) : (
              <>
                <img
                  src={image.previewUrl}
                  alt="촬영한 메뉴 이미지"
                  className="overlay-img"
                />
                {/* 위치 기반 가격 태그 */}
                {priceResult && !loading && convertedPrices?.map((p, i) =>
                  p.x != null && p.y != null ? (
                    <div key={i} className="overlay-tag" style={{ left:`${p.x}%`, top:`${p.y}%` }}>
                      <div className="overlay-tag-dot" />
                      <div className="overlay-tag-inner">
                        <div className="overlay-tag-name">{p.context}</div>
                        {p.converted != null && (
                          <div className="overlay-tag-price">
                            {fmtConverted(p.converted, targetCurrency)}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : null
                )}
              </>
            )}
            {loading && <div className="overlay-loading-dim" />}
          </div>
        </div>

        {/* 로딩 */}
        {loading && (
          <div className="loading-card">
            <div className="loading-dots">
              <span /><span /><span />
            </div>
            <div className="loading-text">번역 + 가격 분석 중...</div>
          </div>
        )}

        {/* 에러 */}
        {error && !loading && (
          <div className="error-card">
            <div className="error-icon">⚠️</div>
            <div className="error-text">{error}</div>
            <div className="error-actions">
              <button className="btn-primary" style={{width:'auto', padding:'10px 20px', fontSize:'.88rem'}} onClick={() => doAnalyze(image)}>
                다시 시도
              </button>
              <button className="btn-ghost" onClick={reset}>
                새 사진
              </button>
            </div>
          </div>
        )}

        {/* 가격 카드 목록 */}
        {convertedPrices && !loading && (
          convertedPrices.length > 0 ? (
            <div className="price-cards-section">
              <div className="price-section-header">
                <span className="price-section-title">💰 가격 목록</span>
                <span className="price-section-count">{convertedPrices.length}개</span>
                {targetInfo && (
                  <span style={{marginLeft:'auto', fontSize:'.72rem', color:'var(--text-2)', fontWeight:600}}>
                    → {targetInfo.flag} {targetCurrency}
                  </span>
                )}
              </div>

              {convertedPrices.map((p, i) => (
                <div
                  key={i}
                  className="price-item-card"
                  style={{ animationDelay: `${i * 0.05}s` }}
                >
                  <div className="price-item-left">
                    <div className="price-item-name">{p.context}</div>
                    {p.currency && p.currency !== targetCurrency && (
                      <div className="price-item-sub">
                        원가: {fmtOrig(p.amount, p.currency)}
                      </div>
                    )}
                  </div>
                  <div className="price-item-right">
                    <div className="price-item-converted">
                      {fmtConverted(p.converted, targetCurrency)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            !error && (
              <div className="no-price-note">
                가격 정보를 찾지 못했습니다<br />
                <span style={{fontSize:'.75rem', color:'var(--text-3)'}}>
                  메뉴판을 더 가까이서 찍어보세요
                </span>
              </div>
            )
          )
        )}

      </div>
    </div>
  )
}
