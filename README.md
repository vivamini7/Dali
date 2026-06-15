# Dalibaba

해외 메뉴, 영수증, 일반 문서 이미지를 분석하고 번역하는 앱입니다.

## 구조

- Frontend: React + Vite, Vercel 배포
- Backend: FastAPI, Render 배포
- Database: Supabase PostgreSQL
- Native packaging: Capacitor 예정

## Local development

Frontend:

```powershell
npm install
npm run dev
```

Backend:

```powershell
cd backend
pip install -r requirements.txt
uvicorn app:app --reload --port 7860
```

환경변수는 `.env.example`과 `backend/.env.example`을 참고합니다.

## Deployment

Render, Supabase, Vercel 이전 절차는 [MIGRATION.md](./MIGRATION.md)를 참고합니다.
