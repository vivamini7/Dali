/**
 * 다람쥐 + 돈 무더기 로고 컴포넌트
 * size prop으로 크기 조절 (기본 36px)
 */
export default function SquirrelLogo({ size = 36, style = {} }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 120 120"
      width={size}
      height={size}
      style={{ flexShrink: 0, ...style }}
      aria-label="Dalibaba 로고"
    >
      <defs>
        <linearGradient id="sq-coin" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FEF9C3"/>
          <stop offset="100%" stopColor="#FCD34D"/>
        </linearGradient>
        <radialGradient id="sq-eye" cx="35%" cy="30%" r="65%">
          <stop offset="0%" stopColor="#1C1917"/>
          <stop offset="100%" stopColor="#0C0A09"/>
        </radialGradient>
      </defs>

      {/* 꼬리 */}
      <path d="M 80 108 C 105 88 112 54 97 28 C 90 16 74 16 72 27 C 84 38 86 63 73 78 C 97 74 95 95 83 105 Z" fill="#92400E"/>
      <path d="M 80 108 C 102 90 108 57 94 32 C 87 21 75 21 73 30 C 84 41 86 65 74 79 C 95 75 93 95 82 104 Z" fill="#B45309"/>
      <path d="M 80 108 C 99 92 104 60 91 36 C 85 26 76 26 74 33 C 84 44 85 66 75 80 C 93 77 91 95 81 104 Z" fill="#D97706"/>

      {/* 몸통 */}
      <ellipse cx="53" cy="97" rx="27" ry="20" fill="#6B2D0A"/>

      {/* 머리 */}
      <circle cx="53" cy="56" r="34" fill="#78350F"/>
      <ellipse cx="53" cy="62" rx="23" ry="21" fill="#92400E"/>

      {/* 왼쪽 귀 */}
      <ellipse cx="32" cy="29" rx="11" ry="15" fill="#78350F" transform="rotate(-18 32 29)"/>
      <ellipse cx="32" cy="30" rx="6"  ry="9"  fill="#FDBA74" transform="rotate(-18 32 29)"/>

      {/* 오른쪽 귀 */}
      <ellipse cx="74" cy="29" rx="11" ry="15" fill="#78350F" transform="rotate(18 74 29)"/>
      <ellipse cx="74" cy="30" rx="6"  ry="9"  fill="#FDBA74" transform="rotate(18 74 29)"/>

      {/* 왼쪽 눈 */}
      <circle cx="41" cy="50" r="10.5" fill="white"/>
      <circle cx="42.5" cy="51.5" r="7"   fill="url(#sq-eye)"/>
      <circle cx="46"   cy="48.5" r="2.8" fill="white"/>
      <circle cx="42"   cy="55"   r="1.5" fill="white" opacity="0.4"/>

      {/* 오른쪽 눈 */}
      <circle cx="65" cy="50" r="10.5" fill="white"/>
      <circle cx="66.5" cy="51.5" r="7"   fill="url(#sq-eye)"/>
      <circle cx="70"   cy="48.5" r="2.8" fill="white"/>
      <circle cx="66"   cy="55"   r="1.5" fill="white" opacity="0.4"/>

      {/* 코 */}
      <ellipse cx="53" cy="65" rx="4.5" ry="3.2" fill="#EC4899"/>
      <ellipse cx="51" cy="63.5" rx="1.8" ry="1.4" fill="white" opacity="0.55"/>

      {/* 입 */}
      <path d="M 47 71 Q 53 77 59 71" fill="none" stroke="#450A0A" strokeWidth="2" strokeLinecap="round"/>

      {/* 볼 */}
      <ellipse cx="34" cy="63" rx="10" ry="7.5" fill="#FB923C" opacity="0.28"/>
      <ellipse cx="72" cy="63" rx="10" ry="7.5" fill="#FB923C" opacity="0.28"/>

      {/* 앞발 */}
      <ellipse cx="28" cy="90" rx="8" ry="7" fill="#6B2D0A"/>
      <ellipse cx="78" cy="90" rx="8" ry="7" fill="#6B2D0A"/>

      {/* 돈 무더기 — 그림자 */}
      <ellipse cx="53" cy="120" rx="34" ry="9" fill="#6B2D0A" opacity="0.35"/>

      {/* 코인들 (아래부터 위로) */}
      <ellipse cx="53" cy="116" rx="32" ry="8.5" fill="#92400E"/>
      <ellipse cx="53" cy="113" rx="32" ry="8.5" fill="#B45309"/>
      <ellipse cx="53" cy="109" rx="32" ry="8.5" fill="#92400E"/>
      <ellipse cx="53" cy="106" rx="32" ry="8.5" fill="#D97706"/>
      <ellipse cx="53" cy="102" rx="32" ry="8.5" fill="#92400E"/>
      <ellipse cx="53" cy="99"  rx="32" ry="8.5" fill="#F59E0B"/>
      <ellipse cx="53" cy="95"  rx="32" ry="8.5" fill="#92400E"/>
      <ellipse cx="53" cy="92"  rx="32" ry="8.5" fill="#FCD34D"/>

      {/* 맨 위 코인 */}
      <ellipse cx="53" cy="88" rx="32" ry="8.5" fill="#A16207"/>
      <ellipse cx="53" cy="85" rx="32" ry="8.5" fill="url(#sq-coin)"/>
      <ellipse cx="53" cy="85" rx="24" ry="6"   fill="none" stroke="#F59E0B" strokeWidth="1.2"/>
      <ellipse cx="53" cy="85" rx="15" ry="3.8" fill="none" stroke="#F59E0B" strokeWidth="0.8"/>
      <text x="53" y="88.5" textAnchor="middle"
            fontFamily="'Arial Black', 'Arial Bold', sans-serif"
            fontWeight="900" fontSize="8" fill="#78350F">$</text>
    </svg>
  )
}
