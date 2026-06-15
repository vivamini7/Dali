import { useRef } from 'react'

const SOURCE_LANGS = [
  { code: 'auto', label: '언어 감지' },
  { code: 'en',   label: '영어' },
  { code: 'ja',   label: '일본어' },
  { code: 'zh',   label: '중국어' },
  { code: 'th',   label: '태국어' },
  { code: 'fr',   label: '프랑스어' },
  { code: 'de',   label: '독일어' },
  { code: 'es',   label: '스페인어' },
  { code: 'vi',   label: '베트남어' },
]

export default function CameraPage({
  onFile,
  onBack,
  analyzing,
  capturedImage,
  sourceLang,
  targetLang,
  onSourceLangChange,
}) {
  const cameraRef  = useRef(null)
  const galleryRef = useRef(null)

  const handleFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    onFile(file)
  }

  return (
    <div className="camera-page">

      {/* ── 상단 바 ── */}
      <div className="cam-topbar">
        <button className="cam-back-btn" onClick={onBack} aria-label="뒤로">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
        </button>

        <div className="cam-lang-row">
          {/* 출발 언어 */}
          <div className="cam-lang-pill">
            <span>{SOURCE_LANGS.find(l => l.code === sourceLang)?.label ?? '언어 감지'}</span>
            <span className="cam-lang-arrow">▾</span>
            <select
              value={sourceLang}
              onChange={e => onSourceLangChange(e.target.value)}
              aria-label="출발 언어"
            >
              {SOURCE_LANGS.map(l => (
                <option key={l.code} value={l.code}>{l.label}</option>
              ))}
            </select>
          </div>

          {/* 교환 버튼 */}
          <button className="cam-swap-small" aria-label="언어 교환">⇌</button>

          {/* 목적 언어 (고정: 한국어) */}
          <div className="cam-lang-pill">
            <span>한국어</span>
          </div>
        </div>

        <button className="cam-flash-btn" aria-label="플래시">⚡</button>
      </div>

      {/* ── 뷰파인더 ── */}
      <div className="cam-viewfinder">
        {/* 배경: 이미지 or 플레이스홀더 */}
        {capturedImage ? (
          <img
            src={capturedImage.previewUrl}
            alt="촬영된 이미지"
            className="cam-viewfinder-img"
          />
        ) : (
          <div className="cam-viewfinder-placeholder">
            <img src="/squirrel-peek.png" alt="" className="cam-squirrel-peek" aria-hidden="true" />
          </div>
        )}

        {/* 스캔 프레임 */}
        <div className="cam-frame">
          <div className="cam-frame-corner tl" />
          <div className="cam-frame-corner tr" />
          <div className="cam-frame-corner bl" />
          <div className="cam-frame-corner br" />
          {!analyzing && <div className="cam-scan-line" />}
        </div>

        {/* 힌트 */}
        {!analyzing && (
          <div className="cam-hint-overlay">
            메뉴판을 화면에 맞춰주세요
          </div>
        )}

        {/* 분석 중 오버레이 */}
        {analyzing && (
          <div className="cam-analyzing-overlay" role="status" aria-live="polite">
            <div className="cam-runner-stage" aria-hidden="true">
              <span className="cam-speed-line line-one" />
              <span className="cam-speed-line line-two" />
              <span className="cam-speed-line line-three" />
              <div className="cam-runner">
                <img src="/app-icon-fullbleed-v20260610.png" alt="" />
              </div>
              <div className="cam-runner-shadow" />
            </div>
            <div className="cam-analyzing-text">이미지를 분석하고 있어요</div>
            <div className="cam-analyzing-subtext">메뉴 번역과 가격 변환을 준비 중입니다</div>
          </div>
        )}
      </div>

      {/* ── 하단 컨트롤 ── */}
      <div className="cam-bottom">
        <div className="cam-controls-row">

          {/* 앨범 버튼 */}
          <label className="cam-gallery-btn" aria-label="앨범">
            <div className="cam-gallery-icon">🖼️</div>
            <span>앨범</span>
            <input
              ref={galleryRef}
              type="file"
              accept="image/*"
              onChange={handleFile}
              disabled={analyzing}
            />
          </label>

          {/* 셔터 (카메라 촬영) */}
          <label className="cam-shutter" aria-label="사진 촬영">
            <div className="cam-shutter-outer" />
            <div className="cam-shutter-inner" />
            <input
              ref={cameraRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFile}
              disabled={analyzing}
            />
          </label>

          {/* 전체 번역 버튼 */}
          <div className="cam-translate-btn" aria-label="전체 번역">
            <div className="cam-translate-icon">🔤</div>
            <span>전체 번역</span>
          </div>

        </div>

        {/* 모드 탭 */}
        <div className="cam-mode-tabs">
          <button className="cam-mode-tab">실시간 번역</button>
          <button className="cam-mode-tab active">사진 번역</button>
        </div>
      </div>

    </div>
  )
}
