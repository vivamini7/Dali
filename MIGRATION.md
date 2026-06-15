# Render, Supabase, Vercel 이전

## 1. Supabase

1. Supabase 프로젝트를 생성한다.
2. Database 연결 문자열을 복사한다.
3. Render에는 Transaction pooler 연결 문자열을 `DATABASE_URL`로 등록한다.
4. 기존 회원 데이터가 있으면 로컬에서 한 번 실행한다.

```powershell
$env:DATABASE_URL='postgresql://...'
python backend/migrate_store.py
```

## 2. Render

저장소 루트의 `render.yaml`로 Blueprint를 생성한다.

필수 환경변수:

- `DATABASE_URL`
- `GROQ_API_KEY`
- `FRONTEND_ORIGINS`

선택 환경변수:

- `DEEPL_API_KEY`
- `APPLE_SHARED_SECRET`
- `GOOGLE_PACKAGE_NAME`
- `GOOGLE_SERVICE_ACCOUNT_JSON`

배포 후 `https://<service>.onrender.com/health`에서
`storage: postgres`, `environment: production`을 확인한다.

## 3. Vercel

프로젝트 루트를 `Dali`로 지정하고 다음 환경변수를 등록한다.

```text
VITE_API_URL=https://<service>.onrender.com
```

Vercel 배포 주소가 정해지면 Render의 `FRONTEND_ORIGINS`를 해당 주소로
변경한다. 로컬 개발도 허용하려면 쉼표로 구분한다.

```text
https://<project>.vercel.app,http://localhost:5173
```

## 4. 전환 확인

1. 회원가입 및 재로그인
2. Render 재배포 후에도 로그인 유지
3. AI 사용량 저장
4. 계정 삭제
5. 이미지 분석과 번역

모두 확인한 뒤 Hugging Face Space를 읽기 전용 안내 페이지로 바꾸거나
중지한다.
