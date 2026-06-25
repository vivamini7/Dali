import { useCallback, useEffect, useState } from 'react'
import StaticLogoHeader from '../components/StaticLogoHeader'
import { EXCHANGE_CURRENCIES } from '../data/currencies'

function toKrw(rates, code, amount) {
  if (!rates.KRW || !rates[code]) return null
  return amount * rates.KRW / rates[code]
}

function fmtKrw(value) {
  if (value == null) return '--'
  return '₩ ' + Math.round(value).toLocaleString('ko-KR')
}

function fmtUnitRate(rates, code) {
  const value = toKrw(rates, code, 1)
  if (value == null) return '계산 중'
  return `₩ ${Math.round(value).toLocaleString('ko-KR')}`
}

export default function ExchangePage({ embedded = false, defaultCurrency = 'JPY' }) {
  const [amount, setAmount] = useState('1')
  const [currency, setCurrency] = useState(defaultCurrency)
  const [rates, setRates] = useState({})
  const [loading, setLoading] = useState(true)
  const [spinning, setSpinning] = useState(false)
  const [date, setDate] = useState('')
  const [pickerOpen, setPickerOpen] = useState(false)

  const fetchRates = useCallback(async () => {
    setSpinning(true)
    try {
      const response = await fetch('https://open.er-api.com/v6/latest/USD')
      const data = await response.json()
      setRates(data.rates || {})
      setDate(new Date().toLocaleDateString('ko-KR'))
    } catch {
      setRates({})
    } finally {
      setSpinning(false)
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRates()
  }, [fetchRates])

  useEffect(() => {
    const exists = EXCHANGE_CURRENCIES.some(item => item.code === defaultCurrency)
    setCurrency(exists ? defaultCurrency : 'JPY')
  }, [defaultCurrency])

  const current = EXCHANGE_CURRENCIES.find(item => item.code === currency) || EXCHANGE_CURRENCIES[0]
  const parsedAmount = parseFloat(amount) || 0
  const krw = toKrw(rates, currency, parsedAmount)

  return (
    <div className={embedded ? 'exchange-page exchange-page-embedded' : 'exchange-page'}>
      {!embedded && (
        <div className="subtle-logo-header">
          <StaticLogoHeader />
          <span className="subtle-logo-meta">{date ? `${date} 기준` : '불러오는 중...'}</span>
        </div>
      )}

      <div className="ex-converter-card">
        <div className="ex-currency-stepper">
          <div className="ex-input-row">
            <input
              type="number"
              value={amount}
              onChange={event => setAmount(event.target.value)}
              className="ex-num-input"
              inputMode="decimal"
              placeholder="0"
            />
            <button
              className={`ex-currency-picker ${pickerOpen ? 'open' : ''}`}
              type="button"
              onClick={() => setPickerOpen(open => !open)}
              aria-label="환율 통화 선택"
              aria-expanded={pickerOpen}
            >
              <span className="ex-currency-flag">{current.flag}</span>
              <span className="ex-currency-name">{current.code}</span>
              <span className="ex-picker-chevron" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </span>
            </button>
          </div>

          {pickerOpen && (
            <div className="ex-currency-menu">
              {EXCHANGE_CURRENCIES.map(item => (
                <button
                  key={item.code}
                  type="button"
                  className={`ex-currency-option ${item.code === currency ? 'active' : ''}`}
                  onClick={() => {
                    setCurrency(item.code)
                    setPickerOpen(false)
                  }}
                >
                  <strong>{item.flag} - {item.country || item.name}</strong>
                  <em>{fmtUnitRate(rates, item.code)}</em>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="ex-divider" />

        <div className="ex-krw-block">
          <div className="ex-krw-label">한국 원</div>
          {loading || spinning ? (
            <div className="ex-krw-skeleton" />
          ) : (
            <div className="ex-krw-big">{fmtKrw(krw)}</div>
          )}
        </div>
      </div>
    </div>
  )
}
