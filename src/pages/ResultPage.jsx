import { useState, useEffect, useRef, useCallback } from 'react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:7860'

function guessIcon(name = '') {
  const n = (name || '').toLowerCase()
  if (/라멘|ramen|ラーメン|우동|うどん|소바|そば/.test(n)) return '🍜'
  if (/스시|sushi|초밥|寿司|사시미|刺身/.test(n)) return '🍣'
  if (/피자|pizza/.test(n)) return '🍕'
  if (/버거|burger|햄버거/.test(n)) return '🍔'
  if (/스테이크|steak/.test(n)) return '🥩'
  if (/갈비|カルビ|삼겹|바베큐|bbq|rib/.test(n)) return '🍖'
  if (/치킨|chicken|닭/.test(n)) return '🍗'
  if (/커피|coffee|라떼|latte|아메리카/.test(n)) return '☕'
  if (/맥주|beer|ビール/.test(n)) return '🍺'
  if (/와인|wine/.test(n)) return '🍷'
  if (/파스타|pasta/.test(n)) return '🍝'
  if (/카레|curry|カレー/.test(n)) return '🍛'
  if (/샐러드|salad/.test(n)) return '🥗'
  if (/케이크|cake|디저트/.test(n)) return '🎂'
  if (/아이스크림|ice.cream/.test(n)) return '🍦'
  if (/차|tea|お茶/.test(n)) return '🍵'
  if (/주스|juice|음료|drink/.test(n)) return '🥤'
  if (/국|soup|スープ|찌개|탕/.test(n)) return '🍲'
  if (/밥|rice|ご飯|볶음밥|비빔/.test(n)) return '🍚'
  if (/빵|bread|パン|샌드/.test(n)) return '🍞'
  if (/타코|taco/.test(n)) return '🌮'
  if (/초콜|chocolate/.test(n)) return '🍫'
  if (/새우|shrimp/.test(n)) return '🍤'
  return '🍽️'
}

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

function fmtOrig(amount, currency) {
  const sym = SYM[currency] || (currency + ' ')
  const isInt = ['JPY','KRW','IDR','VND'].includes(currency)
  return sym + (isInt ? Math.round(amount).toLocaleString() : Number(amount).toFixed(2))
}
function fmtKrw(amount) {
  if (!amount) return null
  return '₩ ' + Math.round(amount).toLocaleString('ko-KR')
}


/* ── AI 채팅창 ── */
function AiChat({ priceResult, onClose, authToken, guestId, aiUsage, onAiUsageChange }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: '안녕하세요! 🍽️ 메뉴에 대해 궁금한 게 있으면 물어보세요.' }
  ])
  const [input,   setInput]   = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)
  const inputRef  = useRef(null)

  // 메뉴 컨텍스트 문자열 생성
  const menuContext = (priceResult?.prices || [])
    .map(p => `- ${p.originalText} → ${p.context} (${fmtOrig(p.amount, p.currency)})`)
    .join('\n')

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100)
  }, [])

  const send = useCallback(async () => {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    const userMsg = { role: 'user', content: text }
    setMessages(prev => [...prev, userMsg])
    setLoading(true)
    try {
      const history = messages.slice(1) // 첫 인사말 제외
      const headers = { 'Content-Type': 'application/json', 'X-Guest-Id': guestId }
      if (authToken) headers.Authorization = `Bearer ${authToken}`
      const res = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: text,
          history,
          menuContext,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        const detail = data.detail
        if (detail?.usage) onAiUsageChange?.(detail.usage)
        throw new Error(detail?.message || detail || 'AI 질문을 보낼 수 없습니다.')
      }
      if (data.usage) onAiUsageChange?.(data.usage)
      setMessages(prev => [...prev, { role: 'assistant', content: data.answer || '죄송해요, 잠시 후 다시 시도해주세요.' }])
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: e.message || '⚠️ 연결 오류가 발생했어요.' }])
    } finally {
      setLoading(false)
    }
  }, [input, loading, messages, menuContext, authToken, guestId, onAiUsageChange])

  const onKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  return (
    <div className="ai-chat-overlay" onClick={onClose}>
      <div className="ai-chat-panel" onClick={e => e.stopPropagation()}>

        {/* 헤더 */}
        <div className="ai-chat-header">
          <span className="ai-chat-title">🤖 AI 음식 도우미</span>
          {aiUsage && (
            <span className="ai-chat-quota">오늘 {aiUsage.remaining}/{aiUsage.limit}</span>
          )}
          <button className="ai-chat-close" onClick={onClose}>✕</button>
        </div>

        {/* 메시지 목록 */}
        <div className="ai-chat-messages">
          {messages.map((m, i) => (
            <div key={i} className={`ai-chat-bubble ${m.role}`}>
              {m.content}
            </div>
          ))}
          {loading && (
            <div className="ai-chat-bubble assistant">
              <span className="ai-chat-typing">
                <span/><span/><span/>
              </span>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* 입력창 */}
        <div className="ai-chat-input-row">
          <input
            ref={inputRef}
            className="ai-chat-input"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={onKey}
            placeholder="메뉴에 대해 물어보세요..."
            disabled={loading || aiUsage?.remaining === 0}
          />
          <button
            className="ai-chat-send"
            onClick={send}
            disabled={!input.trim() || loading || aiUsage?.remaining === 0}
          >↑</button>
        </div>

      </div>
    </div>
  )
}


/* ── 카테고리 정의 ── */
const CATEGORIES = [
  { key: 'all',     label: '전체',   icon: '🍽️' },
  { key: 'food',    label: '음식',   icon: '🍱' },
  { key: 'drink',   label: '음료',   icon: '🥤' },
  { key: 'alcohol', label: '술',     icon: '🍺' },
  { key: 'dessert', label: '디저트', icon: '🍰' },
  { key: 'side',    label: '사이드', icon: '🥗' },
  { key: 'other',   label: '기타',   icon: '📋' },
]

const CATEGORY_ICON = {
  food:    '🍱',
  drink:   '🥤',
  alcohol: '🍺',
  dessert: '🍰',
  side:    '🥗',
  other:   '📋',
}

function OtherTextResult({ priceResult, onBack }) {
  const blocks = Array.isArray(priceResult?.textBlocks) ? priceResult.textBlocks : []
  const detected = priceResult?.detectedLanguage || '언어 감지'
  const translatedImage = priceResult?.translatedImage
  const translatedImageMessage = priceResult?.translatedImageMessage

  return (
    <div className="result-page other-result-page">
      <div className="result-header">
        <button className="result-back-btn" onClick={onBack}>←</button>
        <span className="result-title">텍스트 번역</span>
        <div style={{width:34}} />
      </div>

      <div className="other-result-summary">
        <span className="other-result-icon">文</span>
        <div>
          <strong>사진 속 텍스트를 번역했어요</strong>
          <span>{detected} · 원문 순서대로 정리</span>
        </div>
      </div>

      {translatedImage && (
        <figure className="other-translated-figure">
          <img
            src={`data:image/jpeg;base64,${translatedImage}`}
            alt="원문을 지우고 한국어 번역을 넣은 이미지"
          />
          <figcaption>원문 위치에 한국어 번역을 적용한 이미지</figcaption>
        </figure>
      )}

      {!translatedImage && translatedImageMessage && (
        <div className="other-image-notice">{translatedImageMessage}</div>
      )}

      {blocks.length > 0 ? (
        <div className="other-text-list">
          {blocks.map((block, index) => (
            <article className="other-text-card" key={`${block.originalText}-${index}`}>
              <div className="other-text-number">{index + 1}</div>
              <div className="other-text-content">
                <div className="other-text-label">원문</div>
                <div className="other-text-original">{block.originalText}</div>
                <div className="other-text-divider" />
                <div className="other-text-label translated">한국어</div>
                <div className="other-text-translated">
                  {block.translatedText || block.originalText}
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="result-error-card">
          <div className="result-error-icon">🔍</div>
          <div className="result-error-text">
            {'읽을 수 있는 텍스트를 찾지 못했습니다.\n글자가 선명하게 보이도록 다시 찍어주세요.'}
          </div>
          <div className="result-error-actions">
            <button className="result-action-btn" onClick={onBack}>← 돌아가기</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ResultPage({
  priceResult,
  analyzing,
  error,
  onBack,
  onOrder,
  onAddMenu,
  cardFee = 0,
  authToken,
  guestId,
  aiUsage,
  onAiUsageChange,
}) {
  const [cart,       setCart]     = useState({})
  const [usdRates,   setUsdRates] = useState({})
  const [chatOpen,   setChatOpen] = useState(false)
  const [activeCat,  setActiveCat] = useState('all')
  const addMenuCameraRef = useRef(null)
  const addMenuGalleryRef = useRef(null)
  const [addMenuChoiceOpen, setAddMenuChoiceOpen] = useState(false)

  useEffect(() => {
    fetch('https://open.er-api.com/v6/latest/USD')
      .then(r => r.json())
      .then(d => setUsdRates(d.rates || {}))
      .catch(() => {})
  }, [])

  const prices   = priceResult?.prices || []
  const detected = priceResult?.detectedLanguage
  const currency = priceResult?.detectedCurrency
  const flag     = FLAGS[currency] || '🌐'

  // 디버그: originalText 확인
  if (prices.length) console.log('[ResultPage] prices[0]:', prices[0])

  const applyFee = (krw) => krw ? Math.round(krw * (1 + cardFee / 100)) : null

  const getKrw = (item) => {
    const base = item.krwAmount
      || (usdRates.KRW && usdRates[item.currency]
          ? Math.round(item.amount * usdRates.KRW / usdRates[item.currency])
          : null)
    return applyFee(base)
  }

  const setQty = (idx, delta) => {
    setCart(prev => {
      const next = Math.max(0, (prev[idx] || 0) + delta)
      if (next === 0) { const { [idx]: _, ...rest } = prev; return rest }
      return { ...prev, [idx]: next }
    })
  }

  const totalQty = Object.values(cart).reduce((a, b) => a + b, 0)
  const totalKrw = prices.reduce((sum, item, i) =>
    sum + (cart[i] || 0) * (getKrw(item) || 0), 0)

  // 실제 존재하는 카테고리만 탭에 표시
  const existingCats = new Set(prices.map(p => p.category || 'other'))
  const visibleCats  = CATEGORIES.filter(c => c.key === 'all' || existingCats.has(c.key))

  // 필터된 메뉴 (원본 인덱스 보존)
  const filteredPrices = prices.map((item, i) => ({ item, i }))
    .filter(({ item }) => activeCat === 'all' || (item.category || 'other') === activeCat)

  const handleAddMenu = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    onAddMenu?.(file)
  }

  /* ── 로딩 ── */
  if (analyzing) return (
    <div className="result-page">
      <div className="result-header">
        <button className="result-back-btn" onClick={onBack}>←</button>
        <span className="result-title">분석 중...</span>
        <div style={{width:34}}/>
      </div>
      <div className="result-analyzing">
        <div className="result-analyzing-spinner">
          <div className="cam-dots"><span/><span/><span/></div>
        </div>
        <div className="result-analyzing-title">메뉴를 분석하는 중이에요</div>
        <div className="result-analyzing-sub">AI가 메뉴 항목과 가격을 정리하고 있어요{'\n'}보통 10~20초 소요됩니다</div>
      </div>
    </div>
  )

  /* ── 에러 ── */
  if (error) return (
    <div className="result-page">
      <div className="result-header">
        <button className="result-back-btn" onClick={onBack}>←</button>
        <span className="result-title">분석 결과</span>
        <div style={{width:34}}/>
      </div>
      <div className="result-error-card">
        <div className="result-error-icon">😕</div>
        <div className="result-error-text">{error}</div>
        <div className="result-error-actions">
          <button className="result-action-btn" onClick={onBack}>← 돌아가기</button>
        </div>
      </div>
    </div>
  )

  if (priceResult?.documentType === 'other') {
    return <OtherTextResult priceResult={priceResult} onBack={onBack} />
  }

  /* ── 결과 없음 ── */
  if (!prices.length) return (
    <div className="result-page">
      <div className="result-header">
        <button className="result-back-btn" onClick={onBack}>←</button>
        <span className="result-title">분석 결과</span>
        <div style={{width:34}}/>
      </div>
      <div className="result-error-card">
        <div className="result-error-icon">🔍</div>
        <div className="result-error-text">{'가격 정보를 찾지 못했습니다.\n메뉴판이 잘 보이도록 다시 찍어주세요.'}</div>
        <div className="result-error-actions">
          <button className="result-action-btn" onClick={onBack}>← 돌아가기</button>
        </div>
      </div>
    </div>
  )

  /* ── 메인 결과 ── */
  return (
    <div className="result-page" style={{paddingBottom: totalQty > 0 ? '88px' : '24px'}}>

      <div className="result-header">
        <button className="result-back-btn" onClick={onBack}>←</button>
        <span className="result-title">메뉴 분석</span>
        <button
          className={`result-ai-btn ${chatOpen ? 'active' : ''}`}
          onClick={() => setChatOpen(v => !v)}
          aria-label="AI에게 물어보기"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" style={{flexShrink:0}}>
            <path d="M12 1l2.5 7.5H22l-6.5 4.7 2.5 7.5L12 16l-6 4.7 2.5-7.5L2 8.5h7.5z"/>
          </svg>
          AI 질문
        </button>
      </div>

      {/* 감지 배너 */}
      <div className="result-detect-bar">
        <span className="result-detect-badge">{flag} {detected} · {currency}</span>
        <button className="result-add-menu-inline" onClick={() => setAddMenuChoiceOpen(true)}>
          메뉴 추가하기
        </button>
      </div>

      {/* 카테고리 필터 탭 */}
      <div className="ri-cat-tabs">
        {visibleCats.map(c => (
          <button
            key={c.key}
            className={`ri-cat-tab ${activeCat === c.key ? 'active' : ''}`}
            onClick={() => setActiveCat(c.key)}
          >
            <span className="ri-cat-icon">{c.icon}</span>
            <span>{c.label}</span>
            {c.key === 'all' ? (
              <span className="ri-cat-count">{prices.length}</span>
            ) : (
              <span className="ri-cat-count">
                {prices.filter(p => (p.category || 'other') === c.key).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* 메뉴 목록 */}
      <div className="result-menu-list">
        {filteredPrices.length === 0 && (
          <div className="ri-empty">해당 카테고리의 메뉴가 없어요</div>
        )}
        {filteredPrices.map(({ item, i }) => {
          const krw = getKrw(item)
          const qty = cart[i] || 0
          const cat = item.category || 'other'
          return (
            <div key={i} className={`ri-card${qty > 0 ? ' selected' : ''}`}
                 style={{animationDelay:`${i * 40}ms`}}>

              {/* 상단: 가격 + 수량 뱃지 */}
              <div className="ri-top">
                <div className="ri-names">
                  {/* 원문 (현지어) — 메인 */}
                  <div className="ri-orig">{item.originalText || item.context || '—'}</div>
                  {/* 한글 번역 — 서브 */}
                  {item.context && item.context !== item.originalText && (
                    <div className="ri-korean">
                      <span className="ri-emoji">{CATEGORY_ICON[cat] || '🍽️'}</span>
                      {item.context}
                    </div>
                  )}
                </div>
                <div className="ri-top-right">
                  <span className="ri-price-tag">{fmtOrig(item.amount, item.currency)}</span>
                </div>
              </div>

              {/* 하단: 원화 환산 + 수량 */}
              <div className="ri-foot">
                <span className="ri-krw">
                  {krw ? fmtKrw(krw) : <span style={{color:'var(--text-3)',fontSize:'.75rem'}}>환율 계산 중</span>}
                </span>
                <div className="ri-stepper">
                  <button className="ri-btn minus" onClick={() => setQty(i, -1)} disabled={qty===0}>−</button>
                  <span className="ri-num">{qty}</span>
                  <button className="ri-btn plus" onClick={() => setQty(i, 1)}>+</button>
                </div>
              </div>


            </div>
          )
        })}
      </div>

      {/* 장바구니 바 */}
      {totalQty > 0 && (
        <div className="result-cart-bar">
          <div className="result-cart-info">
            <span className="result-cart-count">{totalQty}개 선택됨</span>
            <span className="result-cart-total">{fmtKrw(totalKrw)}</span>
          </div>
          <button className="result-cart-btn" onClick={() => onOrder(cart, priceResult)}>
            주문서 보기 →
          </button>
        </div>
      )}

      {/* AI 채팅창 */}
      {chatOpen && (
        <AiChat
          priceResult={priceResult}
          onClose={() => setChatOpen(false)}
          authToken={authToken}
          guestId={guestId}
          aiUsage={aiUsage}
          onAiUsageChange={onAiUsageChange}
        />
      )}

      {addMenuChoiceOpen && (
        <div className="add-menu-choice-overlay" onClick={() => setAddMenuChoiceOpen(false)}>
          <div className="add-menu-choice-sheet" onClick={e => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => { setAddMenuChoiceOpen(false); addMenuCameraRef.current?.click() }}
            >
              촬영하기
            </button>
            <button
              type="button"
              onClick={() => { setAddMenuChoiceOpen(false); addMenuGalleryRef.current?.click() }}
            >
              앨범에서 선택
            </button>
            <button
              type="button"
              className="add-menu-choice-cancel"
              onClick={() => setAddMenuChoiceOpen(false)}
            >
              취소
            </button>
          </div>
        </div>
      )}

      <input
        ref={addMenuCameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={handleAddMenu}
      />
      <input
        ref={addMenuGalleryRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleAddMenu}
      />

    </div>
  )
}
