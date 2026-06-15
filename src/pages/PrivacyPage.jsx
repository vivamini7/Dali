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
        <p>시행일: 2026년 6월 15일</p>

        <h3>1. 수집하는 개인정보 항목</h3>
        <p>
          Dalibaba(이하 "서비스")는 회원가입 및 로그인 시 이메일 주소와 인증 제공자 정보를 처리합니다.
          비밀번호와 소셜 로그인 인증 정보는 Supabase Auth가 처리하며, 서비스 서버는 비밀번호 원문을 저장하지 않습니다.
          비회원으로 이용하는 경우 기기에 발급되는 임의의 게스트 식별자만 저장하며, 별도의 개인 식별 정보는 수집하지 않습니다.
        </p>

        <h3>2. 이미지 처리</h3>
        <p>
          사용자가 업로드하는 메뉴판·영수증·사진은 분석을 위해 암호화된 통신으로 서버에 전송됩니다.
          서비스 서버는 분석 이미지를 파일이나 데이터베이스에 저장하지 않으며, 요청 처리가 끝나면 메모리에서 폐기합니다.
          이미지와 이미지에서 추출된 텍스트는 분석을 위해 Groq 및 DeepL API로 일시 전송될 수 있습니다.
        </p>
        <p>
          여권, 신분증, 카드번호, 의료정보, 얼굴 사진 등 민감한 개인정보가 포함된 이미지는 업로드하지 마세요.
          서비스 제공업체의 데이터 처리 및 보존 정책은 각 업체의 약관과 개인정보 정책이 적용될 수 있습니다.
        </p>

        <h3>3. 개인정보 이용 목적</h3>
        <ul>
          <li>회원 식별 및 로그인 유지</li>
          <li>이용권·구독 상태 관리</li>
          <li>AI 질문 일일 사용량 관리</li>
          <li>이미지 분석 일일 사용량 및 부정 이용 방지</li>
          <li>서비스 품질 개선 및 오류 대응</li>
        </ul>

        <h3>4. 보유 및 이용 기간</h3>
        <p>
          회원 탈퇴 시 계정 정보, 세션, 이용권 정보, 사용량 기록은 즉시 삭제됩니다.
          관계 법령에 따라 보존이 필요한 정보는 해당 기간 동안 별도 보관 후 파기합니다.
        </p>

        <h3>5. 제3자 제공 및 처리 위탁</h3>
        <ul>
          <li>Groq: 이미지 인식, 메뉴·영수증 분석, AI 질의응답</li>
          <li>DeepL: 이미지에서 추출한 텍스트의 한국어 번역</li>
          <li>Supabase: 회원 인증, 이메일 인증·비밀번호 재설정, 회원·이용권·사용량 데이터 저장</li>
          <li>Google 및 Kakao: 이용자가 선택한 경우 소셜 로그인 인증</li>
          <li>Render: 백엔드 API 실행</li>
          <li>Vercel: 웹 프론트엔드 제공</li>
          <li>open.er-api.com: 환율 정보 조회</li>
        </ul>

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
