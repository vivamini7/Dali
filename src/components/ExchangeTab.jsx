import { useState, useEffect, useCallback } from 'react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:7860'

const CURRENCIES = [
  { code:'USD', name:'미국 달러',         flag:'🇺🇸' },
  { code:'EUR', name:'유로',               flag:'🇪🇺' },
  { code:'JPY', name:'일본 엔',            flag:'🇯🇵' },
  { code:'GBP', name:'영국 파운드',        flag:'🇬🇧' },
  { code:'CNY', name:'중국 위안',          flag:'🇨🇳' },
  { code:'AUD', name:'호주 달러',          flag:'🇦🇺' },
  { code:'CAD', name:'캐나다 달러',        flag:'🇨🇦' },
  { code:'CHF', name:'스위스 프랑',        flag:'🇨🇭' },
  { code:'HKD', name:'홍콩 달러',          flag:'🇭🇰' },
  { code:'SGD', name:'싱가포르 달러',      flag:'🇸🇬' },
  { code:'THB', name:'태국 바트',          flag:'🇹🇭' },
  { code:'MYR', name:'말레이시아 링깃',    flag:'🇲🇾' },
  { code:'IDR', name:'인도네시아 루피아',  flag:'🇮🇩' },
  { code:'PHP', name:'필리핀 페소',        flag:'🇵🇭' },
]

/* 소수 처리: 정수형 통화 */
const NO_DECIMAL = new Set(['JPY','KRW','IDR','VND','HUF'])

function fmtKrw(amount) {
  if (!amount || isNaN(amount)) return '₩ —'
  return '₩ ' + Math.round(amount).toLocaleString('ko-KR')
}

function fmtRate(value, code) {
  if (!value) return '—'
  return NO_DECIMAL.has(code)
    ? value.toLocaleString('en', { maximumFractionDigits: 2 })
    : value.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 4 })
}

export default function ExchangeTab() {
  const [amount, setAmount]           = useState('1')
  const [fromCurrency, setFromCurrency] = useState('USD')
  const [usdRates, setUsdRates]       = useState({})
  const [loading, setLoading]         = useState(true)
  const [spinning, setSpinning]       = useState(false)
  const [rateDate, setRateDate]       = useState(null)
  const [error, setError]             = useState(null)

  const fetchRates = useCallback(async () => {
    setLoading(true)
    setSpinning(true)
    setError(null)
    try {
      const res = await fetch(`${API_URL}/rates`)
      if (!res.ok) throw new Error('환율 서버 오류')
      const data = await res.json()
      setUsdRates(data.rates || {})
      setRateDate(new Date().toISOString().slice(0, 10))
    } catch {
      setError('환율 정보를 불러오지 못했습니다.')
    } finally {
      setLoading(false)
      setSpinning(false)
    }
  }, [])

  useEffect(() => { fetchRates() }, [fetchRates])

  /* fromCurrency → targetCode 교차환율 */
  const crossRate = useCallback((targetCode) => {
    if (fromCurrency === targetCode) return 1
    if (fromCurrency === 'USD')  return usdRates[targetCode] || 0
    if (targetCode   === 'USD')  return usdRates[fromCurrency] ? 1 / usdRates[fromCurrency] : 0
    const toUsd = usdRates[fromCurrency] ? 1 / usdRates[fromCurrency] : 0
    return toUsd * (usdRates[targetCode] || 0)
  }, [fromCurrency, usdRates])

  const parsedAmount   = parseFloat(amount) || 0
  const krwRate        = crossRate('KRW')
  const krwAmount      = parsedAmount * krwRate
  const fromInfo       = CURRENCIES.find(c => c.code === fromCurrency)
  const otherCurrencies = CURRENCIES.filter(c => c.code !== fromCurrency)

  return (
    <div className="exchange-tab">

      {/* ── Converter card ── */}
      <div className="converter-card">

        {/* 출발 통화 선택 */}
        <div className="currency-row">
          <select
            value={fromCurrency}
            onChange={e => setFromCurrency(e.target.value)}
            className="currency-select"
          >
            {CURRENCIES.map(c => (
              <option key={c.code} value={c.code}>
                {c.flag}  {c.code}  {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* 금액 입력 */}
        <div className="currency-row">
          <span className="flag-label">{fromInfo?.flag}</span>
          <input
            type="number"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            className="amount-input"
            placeholder="금액 입력"
            min="0"
            inputMode="decimal"
          />
        </div>

        <div className="converter-arrow">↓</div>

        {/* KRW 결과 */}
        <div className="krw-result-box">
          <div className="krw-result-label">🇰🇷 한국 원 (KRW)</div>
          <div className={`krw-result-amount ${loading ? 'loading' : ''}`}>
            {loading ? '계산 중...' : fmtKrw(krwAmount)}
          </div>
        </div>

        {/* 하단 정보 */}
        <div className="converter-footer">
          <span className="last-updated-text">
            {rateDate
              ? `ECB 기준 ${rateDate} 갱신`
              : '환율 불러오는 중...'}
          </span>
          <button
            className={`refresh-btn ${spinning ? 'spinning' : ''}`}
            onClick={fetchRates}
            aria-label="환율 새로고침"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M21 12a9 9 0 11-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/>
              <path d="M21 3v5h-5"/>
            </svg>
            새로고침
          </button>
        </div>
      </div>

      {/* ── 환율 목록 ── */}
      <div className="card" style={{marginTop:10}}>
        <div className="section-title">
          {fromInfo?.flag} {fromCurrency} 기준 실시간 환율
        </div>

        {error ? (
          <div className="error-box">{error}</div>
        ) : (
          <div className="rate-list">

            {/* KRW 강조 행 */}
            <div className="rate-item highlight">
              <div className="rate-currency">
                <span className="rate-flag">🇰🇷</span>
                <div>
                  <div className="rate-code">KRW</div>
                  <div className="rate-name">한국 원</div>
                </div>
              </div>
              {loading
                ? <div className="rate-value loading" />
                : <div className="rate-value krw">{fmtKrw(parsedAmount * krwRate)}</div>
              }
            </div>

            {/* 나머지 통화 */}
            {otherCurrencies.map(c => {
              const rate      = crossRate(c.code)
              const converted = parsedAmount * (rate || 0)
              return (
                <div key={c.code} className="rate-item">
                  <div className="rate-currency">
                    <span className="rate-flag">{c.flag}</span>
                    <div>
                      <div className="rate-code">{c.code}</div>
                      <div className="rate-name">{c.name}</div>
                    </div>
                  </div>
                  {loading
                    ? <div className="rate-value loading" />
                    : <div className="rate-value">
                        {rate
                          ? fmtRate(converted, c.code)
                          : <span style={{color:'var(--text-3)', fontSize:'.78rem'}}>정보 없음</span>
                        }
                      </div>
                  }
                </div>
              )
            })}

          </div>
        )}
      </div>

    </div>
  )
}
