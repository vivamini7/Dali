import StaticLogoHeader from '../components/StaticLogoHeader'

export default function TermsPage({ onBack }) {
  return (
    <div className="settings-page">
      <div className="subtle-logo-header">
        <button className="settings-back-btn" onClick={onBack} aria-label="뒤로">←</button>
        <StaticLogoHeader />
      </div>

      <div className="settings-card legal-page" style={{ marginTop: 10 }}>
        <h2>이용약관</h2>
        <p>시행일: 2026년 6월 10일</p>

        <h3>1. 서비스 소개</h3>
        <p>
          Dalibaba(이하 "서비스")는 해외 메뉴판·영수증·이미지를 AI로 분석하여 한국어 번역, 원화 환산, 주문서 생성 기능을 제공합니다.
        </p>

        <h3>2. 회원가입 및 계정</h3>
        <p>
          이용자는 이메일과 비밀번호로 회원가입할 수 있으며, 비회원으로도 일부 기능을 이용할 수 있습니다.
          계정 정보는 본인만 사용해야 하며, 계정 도용으로 인한 책임은 이용자 본인에게 있습니다.
        </p>

        <h3>3. 이용권 및 구독</h3>
        <p>
          서비스는 1일권, 3일권, 7일권 등의 기간제 이용권과 월/연 구독 상품을 제공합니다.
          유료 상품은 앱스토어/플레이스토어 인앱결제를 통해 구매하며, 결제·환불은 각 스토어의 정책을 따릅니다.
        </p>

        <h3>4. AI 분석 결과의 한계</h3>
        <p>
          AI가 제공하는 메뉴 번역, 가격, 환율 정보, 음식 추천 등은 참고용이며 정확성을 보장하지 않습니다.
          실제 결제 금액, 알레르기 정보, 음식 성분 등 중요한 사항은 반드시 현지에서 직접 확인해야 합니다.
        </p>

        <h3>5. 금지행위</h3>
        <ul>
          <li>서비스를 이용한 불법적인 행위</li>
          <li>타인의 계정을 무단으로 사용하는 행위</li>
          <li>서비스의 정상적인 운영을 방해하는 행위</li>
        </ul>

        <h3>6. 계약 해지</h3>
        <p>
          이용자는 설정 화면에서 언제든지 계정을 탈퇴할 수 있으며, 탈퇴 시 보유 중인 이용권·구독 혜택은 소멸됩니다.
        </p>

        <h3>7. 문의처</h3>
        <p>서비스 이용 문의: dalibaba.help@gmail.com</p>
      </div>
    </div>
  )
}
