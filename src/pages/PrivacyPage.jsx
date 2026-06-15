import StaticLogoHeader from '../components/StaticLogoHeader'

export default function PrivacyPage({ onBack }) {
  return (
    <div className="settings-page">
      <div className="subtle-logo-header">
        <button className="settings-back-btn" onClick={onBack} aria-label="뒤로">←</button>
        <StaticLogoHeader />
      </div>

      <div className="settings-card legal-page" style={{ marginTop: 10 }}>
        <h2>개인정보 처리방침</h2>
        <p>시행일: 2026년 6월 10일</p>

        <h3>1. 수집하는 개인정보 항목</h3>
        <p>
          Dalibaba(이하 "서비스")는 회원가입 시 이메일 주소와 비밀번호(암호화 저장)를 수집합니다.
          비회원으로 이용하는 경우 기기에 발급되는 임의의 게스트 식별자만 저장하며, 별도의 개인 식별 정보는 수집하지 않습니다.
        </p>

        <h3>2. 이미지 처리</h3>
        <p>
          사용자가 업로드하는 메뉴판·영수증·사진은 AI 분석을 위해 서버로 전송되며, 분석 완료 후 서버에 저장하지 않고 즉시 폐기됩니다.
        </p>

        <h3>3. 개인정보 이용 목적</h3>
        <ul>
          <li>회원 식별 및 로그인 유지</li>
          <li>이용권·구독 상태 관리</li>
          <li>AI 질문 일일 사용량 관리</li>
          <li>서비스 품질 개선 및 오류 대응</li>
        </ul>

        <h3>4. 보유 및 이용 기간</h3>
        <p>
          회원 탈퇴 시 계정 정보, 세션, 이용권 정보, 사용량 기록은 즉시 삭제됩니다.
          관계 법령에 따라 보존이 필요한 정보는 해당 기간 동안 별도 보관 후 파기합니다.
        </p>

        <h3>5. 제3자 제공 및 처리 위탁</h3>
        <p>
          이미지 분석을 위해 Groq, 번역을 위해 DeepL, 환율 정보를 위해 open.er-api.com에 이미지·텍스트 데이터가 일시적으로 전송될 수 있습니다.
          각 서비스는 자체 정책에 따라 데이터를 처리하며, Dalibaba는 분석 목적 외 용도로 데이터를 제공하지 않습니다.
        </p>

        <h3>6. 이용자의 권리</h3>
        <p>
          이용자는 언제든지 설정 화면에서 계정 탈퇴를 요청하여 본인의 개인정보 삭제를 요구할 수 있습니다.
        </p>

        <h3>7. 문의처</h3>
        <p>개인정보 관련 문의: dalibaba.help@gmail.com</p>
      </div>
    </div>
  )
}
