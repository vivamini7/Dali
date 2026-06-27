import os
from dotenv import load_dotenv
load_dotenv()  # .env 파일 자동 로드

import re
import json
import time
import asyncio
import base64
import io
import secrets
import hashlib
from urllib.parse import urlencode
from datetime import datetime, timedelta, timezone
from pathlib import Path
import httpx
import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from json_repair import repair_json
from fastapi import FastAPI, HTTPException, Header, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse
from pydantic import BaseModel

app = FastAPI(title="Dalibaba API")

APP_ENV = os.environ.get("APP_ENV", "development").strip().lower()
ALLOW_TEST_PURCHASES = os.environ.get("ALLOW_TEST_PURCHASES", "").strip() == "1"
FRONTEND_ORIGINS = [
    origin.strip().rstrip("/")
    for origin in os.environ.get("FRONTEND_ORIGINS", "*").split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=FRONTEND_ORIGINS,
    allow_methods=["DELETE", "GET", "OPTIONS", "POST"],
    allow_headers=["*"],
    allow_credentials=FRONTEND_ORIGINS != ["*"],
)

GROQ_API_KEY  = os.environ.get("GROQ_API_KEY", "")
GROQ_URL      = "https://api.groq.com/openai/v1/chat/completions"
GROQ_TEXT_MODEL = os.environ.get("GROQ_TEXT_MODEL", "openai/gpt-oss-120b").strip()
GROQ_VISION_MODEL = os.environ.get("GROQ_VISION_MODEL", "qwen/qwen3.6-27b").strip()

DEEPL_API_KEY = os.environ.get("DEEPL_API_KEY", "")
DEEPL_URL     = "https://api-free.deepl.com/v2/translate"

SUPABASE_URL = os.environ.get("SUPABASE_URL", "").strip().rstrip("/")
SUPABASE_ANON_KEY = os.environ.get("SUPABASE_ANON_KEY", "").strip()
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "").strip()

NAVER_CLIENT_ID = os.environ.get("NAVER_CLIENT_ID", "").strip()
NAVER_CLIENT_SECRET = os.environ.get("NAVER_CLIENT_SECRET", "").strip()
NAVER_CALLBACK_URL = os.environ.get(
    "NAVER_CALLBACK_URL",
    "https://dalibaba-api.onrender.com/auth/naver/callback",
).strip()

KST = timezone(timedelta(hours=9))
DATA_DIR = Path(__file__).resolve().parent / "data"
STORE_PATH = DATA_DIR / "store.json"
FREE_DAILY_AI_LIMIT = 3
PAID_DAILY_AI_LIMIT = 15
PREMIUM_DAILY_AI_LIMIT = 30

FREE_DAILY_IMAGE_LIMIT = 3
PAID_DAILY_IMAGE_LIMIT = 5
PREMIUM_DAILY_IMAGE_LIMIT = 10

PLANS = [
    {"id": "pass_1d", "kind": "pass", "days": 1, "label": "1일권", "priceUsd": 1.99},
    {"id": "pass_3d", "kind": "pass", "days": 3, "label": "3일권", "priceUsd": 3.99},
    {"id": "pass_7d", "kind": "pass", "days": 7, "label": "7일권", "priceUsd": 7.99},
    {"id": "sub_month", "kind": "subscription", "days": 30, "label": "월 구독", "priceUsd": 8.99},
    {"id": "sub_year", "kind": "subscription", "days": 365, "label": "연 구독", "priceUsd": 59.99},
    {"id": "premium_month", "kind": "premium", "days": 30, "label": "프리미엄 월 구독", "priceUsd": 14.99},
    {"id": "premium_year", "kind": "premium", "days": 365, "label": "프리미엄 연 구독", "priceUsd": 99.99},
]


def _entitlement_tier(entitlement: dict | None) -> str:
    if not entitlement:
        return "free"
    if entitlement.get("kind") == "premium":
        return "premium"
    return "paid"


def _now() -> datetime:
    return datetime.now(KST)


def _today_key() -> str:
    return _now().strftime("%Y-%m-%d")


DATABASE_URL = os.environ.get("DATABASE_URL", "")
_EMPTY_STORE = {
    "users": {},
    "sessions": {},
    "usage": {},
    "imageUsage": {},
    "imageTranslationUsage": {},
    "oauthStates": {},
    "oauthCodes": {},
    "clientErrors": [],
}


def _new_empty_store() -> dict:
    return {
        "users": {},
        "sessions": {},
        "usage": {},
        "imageUsage": {},
        "imageTranslationUsage": {},
        "oauthStates": {},
        "oauthCodes": {},
        "clientErrors": [],
    }


if DATABASE_URL:
    import psycopg
    from psycopg.types.json import Json

    def _db_conn():
        return psycopg.connect(DATABASE_URL)

    def _ensure_table() -> None:
        try:
            with _db_conn() as conn:
                conn.execute("CREATE TABLE IF NOT EXISTS app_store (id INT PRIMARY KEY, data JSONB NOT NULL)")
                conn.execute(
                    "INSERT INTO app_store (id, data) VALUES (1, %s) ON CONFLICT (id) DO NOTHING",
                    (Json(_EMPTY_STORE),),
                )
                conn.commit()
        except Exception as e:
            if APP_ENV == "production":
                raise RuntimeError(f"운영 데이터베이스 초기화 실패: {e}") from e
            print(f"[DB] 초기화 실패: {e}")

    _ensure_table()

    def _load_store() -> dict:
        try:
            with _db_conn() as conn:
                row = conn.execute("SELECT data FROM app_store WHERE id = 1").fetchone()
                if row and isinstance(row[0], dict):
                    data = row[0]
                    return {
                        "users": data.get("users", {}),
                        "sessions": data.get("sessions", {}),
                        "usage": data.get("usage", {}),
                        "imageUsage": data.get("imageUsage", {}),
                        "imageTranslationUsage": data.get("imageTranslationUsage", {}),
                        "oauthStates": data.get("oauthStates", {}),
                        "oauthCodes": data.get("oauthCodes", {}),
                        "clientErrors": data.get("clientErrors", []),
                    }
        except Exception as e:
            print(f"[DB] 조회 실패: {e}")
        return _new_empty_store()

    def _save_store(store: dict) -> None:
        try:
            with _db_conn() as conn:
                conn.execute(
                    "UPDATE app_store SET data = %s WHERE id = 1",
                    (Json(store),),
                )
                conn.commit()
        except Exception as e:
            print(f"[DB] 저장 실패: {e}")

else:
    if APP_ENV == "production":
        raise RuntimeError("운영 환경에는 DATABASE_URL이 반드시 필요합니다.")

    def _load_store() -> dict:
        if not STORE_PATH.exists():
            return _new_empty_store()
        try:
            return json.loads(STORE_PATH.read_text(encoding="utf-8"))
        except Exception:
            return _new_empty_store()

    def _save_store(store: dict) -> None:
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        STORE_PATH.write_text(json.dumps(store, ensure_ascii=False, indent=2), encoding="utf-8")


def _hash_password(password: str, salt: str | None = None) -> tuple[str, str]:
    salt = salt or secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 120000)
    return salt, digest.hex()


def _active_entitlement(user: dict | None) -> dict | None:
    if not user:
        return None
    entitlement = user.get("entitlement")
    if not entitlement:
        return None
    expires_at = entitlement.get("expiresAt")
    if not expires_at:
        return None
    try:
        if datetime.fromisoformat(expires_at) > _now():
            return entitlement
    except ValueError:
        return None
    return None


DELETION_LOCK_HOURS = 24


def _deletion_lock_hours_remaining(user: dict | None) -> float:
    if not user:
        return 0
    scheduled = user.get("deletionScheduledAt")
    if not scheduled:
        return 0
    try:
        scheduled_dt = datetime.fromisoformat(scheduled)
    except ValueError:
        return 0
    remaining = (scheduled_dt - _now()).total_seconds() / 3600
    return max(0, remaining)


def _public_user(user: dict | None) -> dict | None:
    if not user:
        return None
    entitlement = _active_entitlement(user)
    return {
        "email": user.get("email"),
        "name": user.get("name"),
        "createdAt": user.get("createdAt"),
        "entitlement": entitlement,
        "authProvider": user.get("authProvider", "email"),
        "emailVerified": bool(user.get("emailVerified")),
    }


def _get_user_by_token(authorization: str | None) -> tuple[str | None, dict | None, dict]:
    store = _load_store()
    if not authorization or not authorization.startswith("Bearer "):
        return None, None, store
    token = authorization.replace("Bearer ", "", 1).strip()
    email = store.get("sessions", {}).get(token)
    user = store.get("users", {}).get(email or "")
    return email, user, store


def _usage_identity(user_email: str | None, guest_id: str | None) -> str:
    if user_email:
        return f"user:{user_email.lower()}"
    guest = (guest_id or "").strip()[:80]
    return f"guest:{guest or 'anonymous'}"


def _usage_status(store: dict, identity: str, user: dict | None) -> dict:
    entitlement = _active_entitlement(user)
    tier = _entitlement_tier(entitlement)
    limit = {"free": FREE_DAILY_AI_LIMIT, "paid": PAID_DAILY_AI_LIMIT, "premium": PREMIUM_DAILY_AI_LIMIT}[tier]
    date_key = _today_key()
    bucket = store.setdefault("usage", {}).setdefault(identity, {})
    used = int(bucket.get(date_key, 0))
    return {
        "date": date_key,
        "used": used,
        "limit": limit,
        "remaining": max(0, limit - used),
        "plan": entitlement,
    }


def _image_usage_status(store: dict, identity: str, user: dict | None) -> dict:
    entitlement = _active_entitlement(user)
    tier = _entitlement_tier(entitlement)
    limit = {"free": FREE_DAILY_IMAGE_LIMIT, "paid": PAID_DAILY_IMAGE_LIMIT, "premium": PREMIUM_DAILY_IMAGE_LIMIT}[tier]

    date_key = _today_key()
    bucket = store.setdefault("imageUsage", {}).setdefault(identity, {})
    used = int(bucket.get(date_key, 0))
    return {
        "date": date_key,
        "used": used,
        "limit": limit,
        "remaining": max(0, limit - used),
        "plan": entitlement,
    }


def _upstream_http_error(provider: str, response: httpx.Response) -> HTTPException:
    retry_after = response.headers.get("retry-after")
    headers = {"Retry-After": retry_after} if retry_after else None

    if response.status_code == 429:
        return HTTPException(
            429,
            {
                "code": f"{provider.lower()}_rate_limit",
                "message": f"{provider} 요청이 일시적으로 많습니다. 잠시 후 다시 시도해주세요.",
                "retryAfter": retry_after,
            },
            headers=headers,
        )
    if provider == "DeepL" and response.status_code == 456:
        return HTTPException(
            429,
            {
                "code": "deepl_quota_exceeded",
                "message": "이번 달 번역 한도를 모두 사용했습니다. 텍스트 원문만 표시합니다.",
            },
        )

    return HTTPException(
        502,
        {
            "code": f"{provider.lower()}_error",
            "message": f"{provider} 서비스 연결에 실패했습니다. 잠시 후 다시 시도해주세요.",
        },
    )

# ── 폰트 ─────────────────────────────────────────────────────
FONT_PATHS = [
    "/usr/share/fonts/truetype/nanum/NanumGothic.ttf",
    "/usr/share/fonts/nanum/NanumGothic.ttf",
    "C:/Windows/Fonts/malgun.ttf",
    "C:/Windows/Fonts/NanumGothic.ttf",
    "/System/Library/Fonts/AppleSDGothicNeo.ttc",
]

def get_font(size: int):
    for path in FONT_PATHS:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, max(10, size))
            except Exception:
                pass
    return ImageFont.load_default()


# ── 프롬프트 ─────────────────────────────────────────────────
PRICE_PROMPT = """이 이미지를 분석하고 menu, receipt, other 중 하나로 분류하세요.

먼저 이미지 종류를 판단하세요:
- 메뉴판이면 documentType = "menu"
- 결제 영수증/주문 영수증이면 documentType = "receipt"
- 그 외 모든 이미지(의류 택, 안내문, 포장지, 표지판, 문서 등)는 documentType = "other"

other 분석 규칙:
- 이미지에서 읽을 수 있는 의미 있는 텍스트를 위에서 아래, 왼쪽에서 오른쪽 순서로 추출할 것
- originalText에는 이미지에 적힌 텍스트를 글자와 숫자 그대로 넣을 것
- translatedText에는 originalText를 자연스러운 한국어로 번역할 것
- 브랜드명, 모델명, 제품 코드처럼 번역하면 안 되는 고유명사는 원문을 유지할 것
- 같은 문구를 중복해서 넣지 말고, 읽을 수 없는 내용은 추측하지 말 것
- other인 경우 prices는 빈 배열로 반환할 것

★ 가장 중요한 규칙 ★
각 메뉴 항목마다 두 가지 이름을 따로 적어야 합니다:
1. originalText = 이미지에 실제로 인쇄된 글자 그대로 (일본어면 일본어, 영어면 영어, 절대 번역 금지)
2. context = 위 메뉴를 한국어로 번역한 이름

예시 (일본어 메뉴판):
- originalText: "唐揚げ定食" → context: "닭 튀김 정식"
- originalText: "生ビール" → context: "생맥주"
- originalText: "海老天丼" → context: "새우튀김 덮밥"

★ 사이즈/옵션 변형 처리 규칙 ★
하나의 메뉴에 小/中/大, S/M/L, 하프/풀 등 크기나 옵션별로 가격이 다른 경우:
→ 각각을 별도 항목으로 분리할 것
예시:
- originalText: "熟成カルビ 小" → context: "숙성 갈비 (소)" / amount: 1500
- originalText: "熟成カルビ 中" → context: "숙성 갈비 (중)" / amount: 2500

주의사항:
- 이미지를 위에서 아래, 왼쪽에서 오른쪽으로 빠짐없이 스캔할 것
- 가격이 있는 항목은 모두 포함할 것 (사이즈 변형 포함)
- 마지막에 전체 항목 수를 다시 세어 누락이 없는지 확인할 것

영수증 분석 규칙:
- 영수증이면 주문 항목만 prices에 넣고 세금, 합계, 할인, 카드 승인번호, 사업자번호, 날짜는 제외할 것
- 수량이 보이면 qty에 숫자로 넣을 것. 수량이 없으면 qty: 1
- 항목별 금액이 총액이고 수량이 2 이상이면 amount는 1개당 단가로 계산할 것
- 단가를 알 수 없고 줄 총액만 있으면 amount는 줄 총액, qty는 1로 처리할 것
- 영수증에서는 이미 주문된 항목이므로 프론트가 바로 주문서로 저장할 수 있게 qty를 반드시 포함할 것

반드시 다음 JSON 형식으로만 응답하세요 (JSON 외 다른 텍스트 없음):
{
  "documentType": "menu 또는 receipt 또는 other",
  "detectedLanguage": "감지된 언어 이름 (예: 일본어, 영어, 태국어)",
  "detectedCurrency": "주요 통화 ISO 코드 (USD/EUR/JPY/CNY/THB/VND/MYR/IDR/PHP/SGD/HKD/AUD/GBP/CAD 또는 null)",
  "textBlocks": [
    {
      "originalText": "이미지에 적힌 원문 그대로",
      "translatedText": "자연스러운 한국어 번역"
    }
  ],
  "prices": [
    {
      "amount": 숫자값만,
      "currency": "ISO 통화 코드",
      "qty": 수량 숫자값,
      "originalText": "이미지에 인쇄된 원본 텍스트 (번역 절대 금지, 원본 언어 그대로)",
      "context": "한국어 번역명",
      "category": "food/drink/alcohol/dessert/side/other 중 하나",
      "x": 텍스트_중심_가로위치_퍼센트(0~100),
      "y": 텍스트_중심_세로위치_퍼센트(0~100)
    }
  ]
}

menu 또는 receipt인 경우 textBlocks는 빈 배열로 반환하세요.

context 번역 규칙:
- 원어 발음을 한글로 음차 금지: ❌ "카라아게" ✅ "닭 튀김"
- きのこ→버섯, 卵/たまご→달걀, 鶏→닭, 海老/えび→새우, 豚→돼지, 牛→소
- 唐揚げ→닭 튀김, 天ぷら→튀김, 刺身→회, チャーハン→볶음밥
- 한국에서 쓰는 외래어는 그대로 (피자, 파스타, 카레, 스테이크, 라멘)
- 가격 없으면 prices: []"""

OCR_PROMPT = """이 이미지에서 텍스트를 모두 찾아주세요. 번역하지 말고 원본 그대로 추출하세요.

반드시 아래 JSON 형식으로만 응답 (JSON 외 텍스트 절대 없음):
{
  "blocks": [
    {
      "text": "원본 텍스트",
      "x1": 10, "y1": 5, "x2": 60, "y2": 15,
      "dark_bg": false
    }
  ]
}

규칙:
- x1,y1: 텍스트 블록 좌상단 / x2,y2: 우하단 (이미지 기준 0~100 퍼센트)
- 각 텍스트 줄을 개별 블록으로 작성
- dark_bg: 배경이 어두우면 true, 밝으면 false
- 가격·숫자는 그대로 유지
- 장식용 기호·테두리 등 의미 없는 요소는 제외
- blocks 최대 40개"""


async def translate_with_deepl(texts: list) -> list:
    """DeepL로 텍스트 목록을 한국어로 번역"""
    if not texts or not DEEPL_API_KEY:
        return texts
    async with httpx.AsyncClient(timeout=10.0) as client:
        for attempt in range(3):
            resp = await client.post(
                DEEPL_URL,
                headers={"Authorization": f"DeepL-Auth-Key {DEEPL_API_KEY}",
                         "Content-Type": "application/json"},
                json={"text": texts, "target_lang": "KO"},
            )
            if resp.is_success:
                return [t["text"] for t in resp.json().get("translations", [])]
            if resp.status_code not in {429, 500, 502, 503, 504} or attempt == 2:
                raise _upstream_http_error("DeepL", resp)
            await asyncio.sleep(2 ** attempt)
    return texts


class AnalyzeRequest(BaseModel):
    image_base64: str
    image_type: str = "image/jpeg"


class AuthRequest(BaseModel):
    email: str
    password: str
    name: str | None = None


class SupabaseAuthRequest(BaseModel):
    access_token: str


class OAuthCodeRequest(BaseModel):
    code: str


class PurchaseRequest(BaseModel):
    planId: str


@app.get("/plans")
async def plans():
    return {"plans": PLANS}


@app.post("/auth/register")
async def register(req: AuthRequest):
    email = req.email.strip().lower()
    if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email):
        raise HTTPException(400, "이메일 형식이 올바르지 않습니다.")
    if len(req.password) < 6:
        raise HTTPException(400, "비밀번호는 6자 이상이어야 합니다.")

    store = _load_store()
    existing = store["users"].get(email)
    if existing:
        if existing.get("deletionScheduledAt"):
            remaining = _deletion_lock_hours_remaining(existing)
            if remaining > 0:
                raise HTTPException(403, "탈퇴 처리된 계정입니다. 24시간 후에 재가입할 수 있습니다.")
            store["users"].pop(email, None)
            store.get("usage", {}).pop(f"user:{email}", None)
            store.get("imageUsage", {}).pop(f"user:{email}", None)
            store.get("imageTranslationUsage", {}).pop(f"user:{email}", None)
        else:
            raise HTTPException(409, "이미 가입된 이메일입니다.")

    salt, password_hash = _hash_password(req.password)
    store["users"][email] = {
        "email": email,
        "name": (req.name or "").strip() or None,
        "salt": salt,
        "passwordHash": password_hash,
        "createdAt": _now().isoformat(),
        "entitlement": None,
    }
    token = secrets.token_urlsafe(32)
    store["sessions"][token] = email
    _save_store(store)
    return {"token": token, "user": _public_user(store["users"][email])}


@app.post("/auth/login")
async def login(req: AuthRequest):
    email = req.email.strip().lower()
    store = _load_store()
    user = store["users"].get(email)
    if not user:
        raise HTTPException(401, "이메일 또는 비밀번호가 올바르지 않습니다.")
    if user.get("deletionScheduledAt") and _deletion_lock_hours_remaining(user) > 0:
        remaining = _deletion_lock_hours_remaining(user)
        raise HTTPException(403, "탈퇴 처리된 계정입니다. 24시간 후에 재가입할 수 있습니다.")
    if not user.get("salt") or not user.get("passwordHash"):
        raise HTTPException(401, "이 계정은 이메일 인증 또는 소셜 로그인으로 로그인해 주세요.")
    _, password_hash = _hash_password(req.password, user["salt"])
    if password_hash != user["passwordHash"]:
        raise HTTPException(401, "이메일 또는 비밀번호가 올바르지 않습니다.")

    token = secrets.token_urlsafe(32)
    store["sessions"][token] = email
    _save_store(store)
    return {"token": token, "user": _public_user(user)}


@app.post("/auth/supabase")
async def supabase_login(req: SupabaseAuthRequest):
    if not SUPABASE_URL or not SUPABASE_ANON_KEY:
        raise HTTPException(503, "Supabase Auth가 아직 설정되지 않았습니다.")

    access_token = req.access_token.strip()
    if not access_token:
        raise HTTPException(400, "Supabase access token이 필요합니다.")

    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.get(
            f"{SUPABASE_URL}/auth/v1/user",
            headers={
                "apikey": SUPABASE_ANON_KEY,
                "Authorization": f"Bearer {access_token}",
            },
        )

    if response.status_code != 200:
        raise HTTPException(401, "로그인 정보가 만료되었거나 올바르지 않습니다.")

    auth_user = response.json()
    email = str(auth_user.get("email") or "").strip().lower()
    supabase_user_id = str(auth_user.get("id") or "").strip()
    if not email or not supabase_user_id:
        raise HTTPException(400, "이메일을 확인할 수 없는 계정입니다.")

    provider = str(
        auth_user.get("app_metadata", {}).get("provider")
        or auth_user.get("aud")
        or "email"
    )
    store = _load_store()
    user = store["users"].get(email)
    if user and user.get("deletionScheduledAt"):
        remaining = _deletion_lock_hours_remaining(user)
        if remaining > 0:
            raise HTTPException(403, "탈퇴 처리된 계정입니다. 24시간 후에 재가입할 수 있습니다.")
        store["users"].pop(email, None)
        store.get("usage", {}).pop(f"user:{email}", None)
        store.get("imageUsage", {}).pop(f"user:{email}", None)
        store.get("imageTranslationUsage", {}).pop(f"user:{email}", None)
        user = None
    if not user:
        user = {
            "email": email,
            "createdAt": _now().isoformat(),
            "entitlement": None,
        }
        store["users"][email] = user

    user["supabaseUserId"] = supabase_user_id
    user["authProvider"] = provider
    user["emailVerified"] = bool(auth_user.get("email_confirmed_at"))
    metadata_name = str(auth_user.get("user_metadata", {}).get("name") or "").strip()
    if metadata_name:
        user["name"] = metadata_name

    token = secrets.token_urlsafe(32)
    store["sessions"][token] = email
    _save_store(store)
    return {"token": token, "user": _public_user(user)}


@app.get("/auth/social/{provider}")
async def social_login(provider: str):
    provider = provider.lower()
    if provider not in {"google", "kakao", "naver"}:
        raise HTTPException(400, "지원하지 않는 로그인 제공자입니다.")
    raise HTTPException(
        501,
        f"{provider} 로그인은 개발자 콘솔의 client_id, client_secret, redirect URL 설정 후 연결해야 합니다.",
    )


def _naver_return_url(value: str) -> str:
    return_to = value.strip()
    allowed_web_origins = {
        origin for origin in FRONTEND_ORIGINS
        if origin != "*" and origin.startswith(("https://", "http://localhost:"))
    }
    if return_to == "dalibaba://auth/callback":
        return return_to
    if any(return_to == origin or return_to.startswith(f"{origin}/") for origin in allowed_web_origins):
        return return_to
    raise HTTPException(400, "허용되지 않은 로그인 복귀 주소입니다.")


@app.get("/auth/naver/start")
async def naver_login_start(return_to: str = Query(...)):
    if not NAVER_CLIENT_ID or not NAVER_CLIENT_SECRET:
        raise HTTPException(503, "네이버 로그인이 아직 설정되지 않았습니다.")

    return_url = _naver_return_url(return_to)
    state = secrets.token_urlsafe(32)
    store = _load_store()
    states = store.setdefault("oauthStates", {})
    now = int(time.time())
    states[state] = {"provider": "naver", "returnTo": return_url, "expiresAt": now + 600}
    for key, value in list(states.items()):
        if int(value.get("expiresAt", 0)) < now:
            states.pop(key, None)
    _save_store(store)

    params = urlencode({
        "response_type": "code",
        "client_id": NAVER_CLIENT_ID,
        "redirect_uri": NAVER_CALLBACK_URL,
        "state": state,
    })
    return RedirectResponse(f"https://nid.naver.com/oauth2.0/authorize?{params}", status_code=302)


@app.get("/auth/naver/callback")
async def naver_login_callback(
    code: str | None = Query(default=None),
    state: str | None = Query(default=None),
    error: str | None = Query(default=None),
    error_description: str | None = Query(default=None),
):
    store = _load_store()
    state_data = store.setdefault("oauthStates", {}).pop(state or "", None)
    _save_store(store)
    if not state_data or state_data.get("provider") != "naver":
        raise HTTPException(400, "로그인 요청이 만료되었거나 올바르지 않습니다.")
    if int(state_data.get("expiresAt", 0)) < int(time.time()):
        raise HTTPException(400, "로그인 요청이 만료되었습니다. 다시 시도해 주세요.")

    return_to = _naver_return_url(str(state_data.get("returnTo") or ""))
    if error or not code:
        message = error_description or error or "네이버 로그인이 취소되었습니다."
        separator = "&" if "?" in return_to else "?"
        return RedirectResponse(
            f"{return_to}{separator}{urlencode({'auth_error': message})}",
            status_code=302,
        )

    async with httpx.AsyncClient(timeout=10.0) as client:
        token_response = await client.get(
            "https://nid.naver.com/oauth2.0/token",
            params={
                "grant_type": "authorization_code",
                "client_id": NAVER_CLIENT_ID,
                "client_secret": NAVER_CLIENT_SECRET,
                "redirect_uri": NAVER_CALLBACK_URL,
                "code": code,
                "state": state,
            },
        )
        token_data = token_response.json()
        access_token = str(token_data.get("access_token") or "")
        if not token_response.is_success or not access_token:
            raise HTTPException(502, "네이버 로그인 토큰을 발급받지 못했습니다.")

        profile_response = await client.get(
            "https://openapi.naver.com/v1/nid/me",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        profile_data = profile_response.json()
        profile = profile_data.get("response") or {}
        if not profile_response.is_success or profile_data.get("resultcode") != "00":
            raise HTTPException(502, "네이버 회원 정보를 불러오지 못했습니다.")

    email = str(profile.get("email") or "").strip().lower()
    naver_user_id = str(profile.get("id") or "").strip()
    if not email or not naver_user_id:
        raise HTTPException(400, "네이버 계정 이메일 제공 동의가 필요합니다.")

    store = _load_store()
    user = store["users"].get(email)
    if user and user.get("deletionScheduledAt"):
        remaining = _deletion_lock_hours_remaining(user)
        if remaining > 0:
            raise HTTPException(403, "탈퇴 처리된 계정입니다. 24시간 후에 재가입할 수 있습니다.")
        store["users"].pop(email, None)
        store.get("usage", {}).pop(f"user:{email}", None)
        store.get("imageUsage", {}).pop(f"user:{email}", None)
        store.get("imageTranslationUsage", {}).pop(f"user:{email}", None)
        user = None
    if not user:
        user = {
            "email": email,
            "createdAt": _now().isoformat(),
            "entitlement": None,
        }
        store["users"][email] = user
    user["naverUserId"] = naver_user_id
    user["authProvider"] = "naver"
    user["emailVerified"] = True

    exchange_code = secrets.token_urlsafe(32)
    store.setdefault("oauthCodes", {})[exchange_code] = {
        "email": email,
        "expiresAt": int(time.time()) + 120,
    }
    _save_store(store)
    separator = "&" if "?" in return_to else "?"
    return RedirectResponse(
        f"{return_to}{separator}{urlencode({'naver_code': exchange_code})}",
        status_code=302,
    )


@app.post("/auth/naver/exchange")
async def naver_login_exchange(req: OAuthCodeRequest):
    store = _load_store()
    code_data = store.setdefault("oauthCodes", {}).pop(req.code.strip(), None)
    _save_store(store)
    if not code_data or int(code_data.get("expiresAt", 0)) < int(time.time()):
        raise HTTPException(401, "로그인 코드가 만료되었거나 올바르지 않습니다.")

    email = str(code_data.get("email") or "").lower()
    user = store["users"].get(email)
    if not user:
        raise HTTPException(401, "로그인 계정을 찾을 수 없습니다.")
    token = secrets.token_urlsafe(32)
    store["sessions"][token] = email
    _save_store(store)
    return {"token": token, "user": _public_user(user)}


@app.get("/me")
async def me(
    authorization: str | None = Header(default=None),
    x_guest_id: str | None = Header(default=None),
):
    email, user, store = _get_user_by_token(authorization)
    identity = _usage_identity(email, x_guest_id)
    return {
        "user": _public_user(user),
        "usage": _usage_status(store, identity, user),
        "imageUsage": _image_usage_status(store, identity, user),
        "plans": PLANS,
    }


class UpdateNameRequest(BaseModel):
    name: str


@app.post("/account/name")
async def update_name(req: UpdateNameRequest, authorization: str | None = Header(default=None)):
    email, user, store = _get_user_by_token(authorization)
    if not email or not user:
        raise HTTPException(401, "로그인이 필요합니다.")
    name = req.name.strip()
    if not name:
        raise HTTPException(400, "여행자 이름을 입력해 주세요.")
    user["name"] = name[:30]
    _save_store(store)
    return {"user": _public_user(user)}


@app.delete("/me")
async def delete_account(authorization: str | None = Header(default=None)):
    email, user, store = _get_user_by_token(authorization)
    if not email or not user:
        raise HTTPException(401, "로그인이 필요합니다.")

    supabase_user_id = str(user.get("supabaseUserId") or "").strip()
    if supabase_user_id:
        if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
            raise HTTPException(503, "계정 탈퇴를 위해 Supabase 관리자 키 설정이 필요합니다.")
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.delete(
                f"{SUPABASE_URL}/auth/v1/admin/users/{supabase_user_id}",
                headers={
                    "apikey": SUPABASE_SERVICE_ROLE_KEY,
                    "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
                },
            )
        if response.status_code not in {200, 204, 404}:
            raise HTTPException(502, "인증 계정을 삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.")

    # 즉시 완전 삭제하지 않고 24시간 잠금만 걸어둔다.
    # (탈퇴 후 바로 재가입해 무료 사용량을 초기화하는 것을 막기 위함)
    user["deletionScheduledAt"] = (_now() + timedelta(hours=DELETION_LOCK_HOURS)).isoformat()
    user.pop("supabaseUserId", None)
    store["sessions"] = {tok: em for tok, em in store.get("sessions", {}).items() if em != email}
    _save_store(store)
    return {"ok": True}


# ── 앱스토어/플레이스토어 영수증 검증 ─────────────────────────
APPLE_SHARED_SECRET = os.environ.get("APPLE_SHARED_SECRET", "")
APPLE_VERIFY_URL_PROD = "https://buy.itunes.apple.com/verifyReceipt"
APPLE_VERIFY_URL_SANDBOX = "https://sandbox.itunes.apple.com/verifyReceipt"

GOOGLE_PACKAGE_NAME = os.environ.get("GOOGLE_PACKAGE_NAME", "")
GOOGLE_SERVICE_ACCOUNT_JSON = os.environ.get("GOOGLE_SERVICE_ACCOUNT_JSON", "")

# productId(스토어) → PLANS의 id 매핑
STORE_PRODUCT_TO_PLAN = {
    "dalibaba_pass_1d": "pass_1d",
    "dalibaba_pass_3d": "pass_3d",
    "dalibaba_pass_7d": "pass_7d",
    "dalibaba_sub_month": "sub_month",
    "dalibaba_sub_year": "sub_year",
}


def _grant_entitlement(user: dict, plan: dict) -> dict:
    current = _active_entitlement(user)
    start = _now()
    if current:
        try:
            current_expiry = datetime.fromisoformat(current["expiresAt"])
            if current_expiry > start:
                start = current_expiry
        except ValueError:
            pass
    expires_at = start + timedelta(days=int(plan["days"]))
    user["entitlement"] = {
        "planId": plan["id"],
        "label": plan["label"],
        "kind": plan["kind"],
        "expiresAt": expires_at.isoformat(),
    }
    return user["entitlement"]


async def _verify_apple_receipt(receipt_data: str) -> dict:
    if not APPLE_SHARED_SECRET:
        raise HTTPException(500, "APPLE_SHARED_SECRET이 설정되지 않았습니다.")
    payload = {"receipt-data": receipt_data, "password": APPLE_SHARED_SECRET, "exclude-old-transactions": True}
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.post(APPLE_VERIFY_URL_PROD, json=payload)
        body = resp.json()
        if body.get("status") == 21007:  # 샌드박스 영수증을 운영 서버로 보낸 경우
            resp = await client.post(APPLE_VERIFY_URL_SANDBOX, json=payload)
            body = resp.json()
    if body.get("status") != 0:
        raise HTTPException(400, f"애플 영수증 검증 실패 (status={body.get('status')})")

    latest = body.get("latest_receipt_info") or body.get("receipt", {}).get("in_app", [])
    if not latest:
        raise HTTPException(400, "영수증에서 구매 내역을 찾을 수 없습니다.")
    latest.sort(key=lambda x: int(x.get("purchase_date_ms", 0)), reverse=True)
    product_id = latest[0].get("product_id")
    return {"productId": product_id, "transactionId": latest[0].get("transaction_id")}


async def _verify_google_receipt(product_id: str, purchase_token: str) -> dict:
    if not GOOGLE_SERVICE_ACCOUNT_JSON or not GOOGLE_PACKAGE_NAME:
        raise HTTPException(500, "GOOGLE_SERVICE_ACCOUNT_JSON / GOOGLE_PACKAGE_NAME이 설정되지 않았습니다.")
    try:
        from google.oauth2 import service_account
        from google.auth.transport.requests import Request as GoogleAuthRequest
    except ImportError:
        raise HTTPException(500, "google-auth 패키지가 설치되지 않았습니다.")

    creds_info = json.loads(GOOGLE_SERVICE_ACCOUNT_JSON)
    credentials = service_account.Credentials.from_service_account_info(
        creds_info, scopes=["https://www.googleapis.com/auth/androidpublisher"],
    )
    credentials.refresh(GoogleAuthRequest())

    is_subscription = product_id.startswith("dalibaba_sub_")
    kind = "subscriptions" if is_subscription else "products"
    url = (
        f"https://androidpublisher.googleapis.com/androidpublisher/v3/applications/"
        f"{GOOGLE_PACKAGE_NAME}/purchases/{kind}/{product_id}/tokens/{purchase_token}"
    )
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(url, headers={"Authorization": f"Bearer {credentials.token}"})
    if not resp.is_success:
        raise HTTPException(400, f"구글 영수증 검증 실패: {resp.text[:200]}")

    body = resp.json()
    if is_subscription:
        if body.get("paymentState") not in (1, 2):
            raise HTTPException(400, "구독 결제가 완료되지 않았습니다.")
    else:
        if body.get("purchaseState") != 0:
            raise HTTPException(400, "구매가 완료되지 않았습니다.")
    return {"productId": product_id}


class VerifyPurchaseRequest(BaseModel):
    platform: str           # "ios" | "android"
    receiptData: str = ""   # iOS: base64 영수증
    productId: str = ""     # Android: 상품 ID
    purchaseToken: str = "" # Android: 구매 토큰


@app.post("/purchase/verify")
async def verify_purchase(req: VerifyPurchaseRequest, authorization: str | None = Header(default=None)):
    """앱스토어/플레이스토어 인앱결제 영수증을 검증하고 이용권을 지급합니다."""
    email, user, store = _get_user_by_token(authorization)
    if not email or not user:
        raise HTTPException(401, "구매를 적용하려면 로그인이 필요합니다.")

    if req.platform == "ios":
        info = await _verify_apple_receipt(req.receiptData)
    elif req.platform == "android":
        info = await _verify_google_receipt(req.productId, req.purchaseToken)
    else:
        raise HTTPException(400, "platform은 ios 또는 android여야 합니다.")

    plan_id = STORE_PRODUCT_TO_PLAN.get(info["productId"])
    plan = next((item for item in PLANS if item["id"] == plan_id), None)
    if not plan:
        raise HTTPException(400, f"알 수 없는 상품 ID입니다: {info['productId']}")

    _grant_entitlement(user, plan)
    store["users"][email] = user
    _save_store(store)
    return {"user": _public_user(user), "plans": PLANS}


@app.post("/purchase")
async def purchase(req: PurchaseRequest, authorization: str | None = Header(default=None)):
    """개발/테스트용: 실제 결제 없이 이용권을 즉시 지급. 운영 빌드에서는 /purchase/verify를 사용할 것."""
    if APP_ENV == "production" or not ALLOW_TEST_PURCHASES:
        raise HTTPException(404, "스토어 결제가 아직 연결되지 않았습니다.")

    email, user, store = _get_user_by_token(authorization)
    if not email or not user:
        raise HTTPException(401, "구매하려면 로그인이 필요합니다.")

    plan = next((item for item in PLANS if item["id"] == req.planId), None)
    if not plan:
        raise HTTPException(400, "알 수 없는 요금제입니다.")

    current = _active_entitlement(user)
    start = _now()
    if current:
        try:
            current_expiry = datetime.fromisoformat(current["expiresAt"])
            if current_expiry > start:
                start = current_expiry
        except ValueError:
            pass
    expires_at = start + timedelta(days=int(plan["days"]))
    user["entitlement"] = {
        "planId": plan["id"],
        "label": plan["label"],
        "kind": plan["kind"],
        "expiresAt": expires_at.isoformat(),
    }
    store["users"][email] = user
    _save_store(store)
    return {"user": _public_user(user), "plans": PLANS}


# ── 환율 캐시 (1시간) ─────────────────────────────────────────
_rate_cache: dict = {"rates": {}, "ts": 0}

async def get_usd_rates() -> dict:
    if time.time() - _rate_cache["ts"] < 3600 and _rate_cache["rates"]:
        return _rate_cache["rates"]
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.get("https://open.er-api.com/v6/latest/USD")
            rates = res.json().get("rates", {})
            if rates:
                _rate_cache["rates"] = rates
                _rate_cache["ts"] = time.time()
                print(f"[환율] 갱신 완료 — USD/KRW={rates.get('KRW')}")
            return rates
    except Exception as e:
        print(f"[환율] 조회 실패: {e}")
        return _rate_cache["rates"]

async def fetch_krw_rate(currency: str) -> float | None:
    if currency == "KRW":
        return 1.0
    rates = await get_usd_rates()
    usd_to_krw = rates.get("KRW")
    usd_to_cur  = rates.get(currency)
    if usd_to_krw and usd_to_cur:
        return usd_to_krw / usd_to_cur
    return None


# ── 이미지 렌더링 헬퍼 ────────────────────────────────────────
def render_blocks(img_pil: Image.Image, blocks: list) -> Image.Image:
    """인페인팅된 이미지 위에 번역문을 반투명 박스로 렌더링"""
    iw, ih = img_pil.size
    img_arr  = np.array(img_pil)
    img_rgba = img_pil.convert('RGBA')
    overlay  = Image.new('RGBA', img_pil.size, (0, 0, 0, 0))
    draw     = ImageDraw.Draw(overlay)

    for b in blocks:
        x1, y1, x2, y2 = b["px"]
        bw, bh = x2 - x1, y2 - y1
        text = b["translated"]

        # 배경 밝기 측정 → 글자색 자동 결정
        region = img_arr[max(0,y1):min(ih,y2), max(0,x1):min(iw,x2)]
        if region.size > 0:
            avg = region.mean(axis=(0, 1))
            brightness = 0.299*avg[0] + 0.587*avg[1] + 0.114*avg[2]
            dark_bg = brightness < 128
        else:
            dark_bg = b.get("dark_bg", False)

        text_fill = (255, 255, 255, 255) if dark_bg else (15, 23, 42, 255)
        bg_fill   = (10,  10,  20,  215) if dark_bg else (255, 255, 255, 215)

        # 폰트 크기 = 박스 높이, 너무 넓으면 자동 축소
        font_size = max(10, bh - 2)
        font = get_font(font_size)
        while font_size > 10:
            try:
                tb = draw.textbbox((0, 0), text, font=font)
                if (tb[2] - tb[0]) <= bw:
                    break
            except Exception:
                break
            font_size -= 1
            font = get_font(font_size)

        draw.rectangle([x1, y1, x2, y2], fill=bg_fill)

        try:
            tb = draw.textbbox((0, 0), text, font=font)
            tw, th = tb[2] - tb[0], tb[3] - tb[1]
            tx = x1 + max(0, (bw - tw) // 2)
            ty = y1 + max(0, (bh - th) // 2)
        except Exception:
            tx, ty = x1 + 2, y1 + 2

        draw.text((tx, ty), text, fill=text_fill, font=font)

    return Image.alpha_composite(img_rgba, overlay).convert('RGB')


class ChatMessage(BaseModel):
    role: str     # "user" | "assistant"
    content: str

class ChatRequest(BaseModel):
    message: str
    history: list[ChatMessage] = []
    menuContext: str = ""   # 메뉴 목록 요약 텍스트


@app.post("/chat")
async def chat(
    req: ChatRequest,
    authorization: str | None = Header(default=None),
    x_guest_id: str | None = Header(default=None),
):
    if not GROQ_API_KEY:
        raise HTTPException(500, "서버에 GROQ_API_KEY가 설정되지 않았습니다.")

    email, user, store = _get_user_by_token(authorization)
    if not email or not user:
        raise HTTPException(401, "로그인이 필요한 기능입니다.")
    identity = _usage_identity(email, x_guest_id)
    usage = _usage_status(store, identity, user)
    if usage["remaining"] <= 0:
        raise HTTPException(
            429,
            {
                "message": f"오늘 AI 질문 {usage['limit']}회를 모두 사용했습니다. 내일 다시 이용해주세요.",
                "usage": usage,
            },
        )

    system_prompt = f"""당신은 해외 여행 중인 한국인을 돕는 친절한 음식 전문가 AI예요.
현재 메뉴판에서 분석된 메뉴 목록은 다음과 같아요:

{req.menuContext if req.menuContext else '(메뉴 정보 없음)'}

위 메뉴를 참고해서 사용자 질문에 한국어로 친절하고 간결하게 답해주세요.
재료, 맛, 조리법, 한국 음식과의 비교, 주문 팁 등을 자연스럽게 설명해주세요.
모르는 내용은 솔직하게 모른다고 말하세요. 답변은 3~5문장 이내로."""

    messages = [{"role": "system", "content": system_prompt}]
    for m in req.history[-6:]:  # 최근 6개만 유지
        messages.append({"role": m.role, "content": m.content})
    messages.append({"role": "user", "content": req.message})

    payload = {
        "model": GROQ_TEXT_MODEL,
        "messages": messages,
        "max_tokens": 500,
        "temperature": 0.7,
    }
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                GROQ_URL,
                headers={"Authorization": f"Bearer {GROQ_API_KEY}", "Content-Type": "application/json"},
                json=payload,
            )
        if not resp.is_success:
            raise HTTPException(resp.status_code, resp.text[:200])
        answer = resp.json()["choices"][0]["message"]["content"].strip()
        date_key = _today_key()
        bucket = store.setdefault("usage", {}).setdefault(identity, {})
        bucket[date_key] = int(bucket.get(date_key, 0)) + 1
        _save_store(store)
        return {"answer": answer, "usage": _usage_status(store, identity, user)}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, str(e))


class TranslateItemsRequest(BaseModel):
    items: list[str]       # 한국어 메뉴명 목록
    target_lang: str = "ja"  # 번역 목표 언어 (ISO 코드)
    lang_name: str = "일본어"  # 언어 이름 (프롬프트용)

@app.post("/translate-items")
async def translate_items(req: TranslateItemsRequest):
    if not GROQ_API_KEY:
        raise HTTPException(500, "GROQ_API_KEY가 설정되지 않았습니다.")

    items_text = "\n".join(f"{i+1}. {name}" for i, name in enumerate(req.items))
    prompt = f"""아래 한국어 음식 메뉴 이름들을 {req.lang_name}로 번역해주세요.
번역 시 실제 {req.lang_name} 식당에서 쓰는 자연스러운 표현을 사용하세요.
반드시 아래 JSON 형식으로만 응답하세요 (JSON 외 텍스트 없음):
{{"translations": ["번역1", "번역2", ...]}}

메뉴 목록:
{items_text}"""

    payload = {
        "model": GROQ_TEXT_MODEL,
        "messages": [{"role": "user", "content": prompt}],
        "max_tokens": 1000,
        "temperature": 0.2,
    }
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                GROQ_URL,
                headers={"Authorization": f"Bearer {GROQ_API_KEY}", "Content-Type": "application/json"},
                json=payload,
            )
        if not resp.is_success:
            raise HTTPException(resp.status_code, resp.text[:200])
        content = resp.json()["choices"][0]["message"]["content"]
        match = re.search(r"\{[\s\S]*\}", content)
        if not match:
            raise HTTPException(500, "번역 결과를 파싱할 수 없습니다.")
        result = json.loads(repair_json(match.group()))
        translations = result.get("translations", req.items)
        return {"translations": translations}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, str(e))


class ClientErrorRequest(BaseModel):
    message: str
    stack: str = ""
    url: str = ""
    userAgent: str = ""


MAX_CLIENT_ERRORS = 200


@app.post("/client-error")
async def report_client_error(
    req: ClientErrorRequest,
    x_guest_id: str | None = Header(default=None),
):
    """프론트엔드 런타임 오류를 수집해 서버 store에 보관 (최근 200건)"""
    store = _load_store()
    errors = store.setdefault("clientErrors", [])
    errors.append({
        "at": _now().isoformat(),
        "message": req.message[:500],
        "stack": req.stack[:2000],
        "url": req.url[:300],
        "userAgent": req.userAgent[:300],
        "guestId": (x_guest_id or "")[:80],
    })
    del errors[:-MAX_CLIENT_ERRORS]
    _save_store(store)
    return {"ok": True}


@app.get("/client-error")
async def list_client_errors(authorization: str | None = Header(default=None)):
    """수집된 오류 로그 조회 (관리자 토큰 필요: ADMIN_TOKEN env)"""
    admin_token = os.environ.get("ADMIN_TOKEN", "")
    token = (authorization or "").replace("Bearer ", "", 1).strip()
    if not admin_token or token != admin_token:
        raise HTTPException(403, "권한이 없습니다.")
    store = _load_store()
    return {"errors": store.get("clientErrors", [])}


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "model": GROQ_TEXT_MODEL,
        "vision_model": GROQ_VISION_MODEL,
        "environment": APP_ENV,
        "storage": "postgres" if DATABASE_URL else "local-file",
    }


@app.get("/rates")
async def get_rates():
    rates = await get_usd_rates()
    if not rates:
        raise HTTPException(503, "환율 정보를 가져올 수 없습니다.")
    return {"base": "USD", "rates": rates}


@app.post("/analyze")
async def analyze(
    req: AnalyzeRequest,
    authorization: str | None = Header(default=None),
    x_guest_id: str | None = Header(default=None),
):
    if not GROQ_API_KEY:
        raise HTTPException(500, "서버에 GROQ_API_KEY가 설정되지 않았습니다.")

    email, user, store = _get_user_by_token(authorization)
    if not email or not user:
        raise HTTPException(401, "로그인이 필요한 기능입니다.")
    identity = _usage_identity(email, x_guest_id)
    image_usage = _image_usage_status(store, identity, user)
    if image_usage["remaining"] <= 0:
        raise HTTPException(
            429,
            {
                "code": "daily_image_limit",
                "message": f"오늘 이미지 분석 {image_usage['limit']}회를 모두 사용했습니다. 내일 다시 이용해주세요.",
                "usage": image_usage,
            },
        )

    image_url = f"data:{req.image_type};base64,{req.image_base64}"
    payload = {
        "model": GROQ_VISION_MODEL,
        "messages": [{
            "role": "user",
            "content": [
                {"type": "image_url", "image_url": {"url": image_url}},
                {"type": "text", "text": PRICE_PROMPT},
            ],
        }],
        "max_tokens": 4000,
        "temperature": 0.1,
        "reasoning_effort": "none",
    }

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(
                GROQ_URL,
                headers={"Authorization": f"Bearer {GROQ_API_KEY}", "Content-Type": "application/json"},
                json=payload,
            )

        print(f"[Groq/analyze] status={resp.status_code}")
        if not resp.is_success:
            raise _upstream_http_error("Groq", resp)

        content = resp.json()["choices"][0]["message"]["content"]
        match = re.search(r"\{[\s\S]*\}", content)
        if not match:
            raise HTTPException(500, f"모델이 JSON을 반환하지 않았습니다: {content[:200]}")

        result = json.loads(repair_json(match.group()))

        document_type = str(result.get("documentType") or "other").lower()
        if document_type not in {"menu", "receipt", "other"}:
            document_type = "other"
        result["documentType"] = document_type
        result["prices"] = result.get("prices") if isinstance(result.get("prices"), list) else []
        result["textBlocks"] = result.get("textBlocks") if isinstance(result.get("textBlocks"), list) else []

        if document_type == "other":
            result["prices"] = []
            result["detectedCurrency"] = None
            result["textBlocks"] = [
                {
                    "originalText": str(block.get("originalText") or "").strip(),
                    "translatedText": str(block.get("translatedText") or "").strip(),
                }
                for block in result["textBlocks"]
                if isinstance(block, dict) and str(block.get("originalText") or "").strip()
            ]

        if result.get("prices"):
            currencies = list({p.get("currency") for p in result["prices"] if p.get("currency")})
            rates: dict[str, float | None] = {}
            async with httpx.AsyncClient(timeout=5.0) as client:
                for cur in currencies:
                    rates[cur] = await fetch_krw_rate(cur)
            for price in result["prices"]:
                price["qty"] = max(1, int(float(price.get("qty") or 1)))
                rate = rates.get(price.get("currency"))
                price["krwAmount"] = round(float(price.get("amount") or 0) * rate) if rate else None

        date_key = _today_key()
        bucket = store.setdefault("imageUsage", {}).setdefault(identity, {})
        bucket[date_key] = int(bucket.get(date_key, 0)) + 1
        _save_store(store)
        result["imageUsage"] = _image_usage_status(store, identity, user)
        return result

    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR/analyze] {e}")
        raise HTTPException(500, str(e))


@app.post("/translate-image")
async def translate_image(
    req: AnalyzeRequest,
    authorization: str | None = Header(default=None),
    x_guest_id: str | None = Header(default=None),
):
    if not GROQ_API_KEY:
        raise HTTPException(500, "서버에 GROQ_API_KEY가 설정되지 않았습니다.")

    email, user, store = _get_user_by_token(authorization)
    if not email or not user:
        raise HTTPException(401, "로그인이 필요한 기능입니다.")
    identity = _usage_identity(email, x_guest_id)
    date_key = _today_key()
    analyzed = int(store.setdefault("imageUsage", {}).setdefault(identity, {}).get(date_key, 0))
    translated_bucket = store.setdefault("imageTranslationUsage", {}).setdefault(identity, {})
    translated = int(translated_bucket.get(date_key, 0))
    if analyzed <= translated:
        raise HTTPException(
            429,
            {
                "code": "translation_requires_analysis",
                "message": "이미지 분석을 먼저 완료한 뒤 번역 이미지를 생성해주세요.",
            },
        )

    try:
        # 1. Groq 비전 호출 → OCR만 (텍스트 위치 감지)
        image_url = f"data:{req.image_type};base64,{req.image_base64}"
        payload = {
            "model": GROQ_VISION_MODEL,
            "messages": [{
                "role": "user",
                "content": [
                    {"type": "image_url", "image_url": {"url": image_url}},
                    {"type": "text", "text": OCR_PROMPT},
                ],
            }],
            "max_tokens": 2000,
            "temperature": 0.1,
            "reasoning_effort": "none",
        }

        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(
                GROQ_URL,
                headers={"Authorization": f"Bearer {GROQ_API_KEY}", "Content-Type": "application/json"},
                json=payload,
            )

        print(f"[Groq/OCR] status={resp.status_code}")
        if not resp.is_success:
            raise _upstream_http_error("Groq", resp)

        content = resp.json()["choices"][0]["message"]["content"]
        print(f"[Groq/OCR] {content[:300]}")

        match = re.search(r"\{[\s\S]*\}", content)
        if not match:
            raise HTTPException(500, f"모델이 JSON을 반환하지 않았습니다: {content[:200]}")

        blocks = json.loads(repair_json(match.group())).get("blocks", [])
        if not blocks:
            return {"translated_image": None, "message": "번역할 텍스트를 찾지 못했습니다."}

        # 비전 모델이 숫자만 있는 텍스트(가격 등)를 문자열이 아닌 JSON 숫자로
        # 반환하는 경우가 있어, 이후 문자열 처리에서 타입 오류가 나지 않도록 강제 변환
        for b in blocks:
            b["text"] = str(b.get("text") if b.get("text") is not None else "")

        # 1-2. DeepL로 추출된 텍스트 번역 (병렬 처리)
        original_texts = [b["text"] for b in blocks]
        translated_texts = await translate_with_deepl(original_texts)
        for b, t in zip(blocks, translated_texts):
            b["translated"] = str(t) if t is not None else ""

        # 2. 이미지 디코딩 + 퍼센트 좌표 → 픽셀 변환
        img_bytes = base64.b64decode(req.image_base64)
        img_pil = Image.open(io.BytesIO(img_bytes)).convert("RGB")
        iw, ih = img_pil.size

        px_blocks = []
        for b in blocks:
            x1 = int(b.get("x1", 0) / 100 * iw)
            y1 = int(b.get("y1", 0) / 100 * ih)
            x2 = int(b.get("x2", 0) / 100 * iw)
            y2 = int(b.get("y2", 0) / 100 * ih)
            if x2 - x1 < 4 or y2 - y1 < 4:
                continue
            translated = b.get("translated") or b.get("text", "")
            px_blocks.append({
                "px": (x1, y1, x2, y2),
                "translated": translated,
                "dark_bg": b.get("dark_bg", False),
            })

        if not px_blocks:
            return {"translated_image": None, "message": "유효한 텍스트 영역을 찾지 못했습니다."}

        # 3. OpenCV 인페인팅으로 원본 텍스트 제거
        pad = 6
        img_arr = np.ascontiguousarray(np.array(img_pil), dtype=np.uint8)
        img_cv  = cv2.cvtColor(img_arr, cv2.COLOR_RGB2BGR)
        mask    = np.zeros((ih, iw), dtype=np.uint8)
        for b in px_blocks:
            x1, y1, x2, y2 = b["px"]
            cv2.rectangle(
                mask,
                (max(0, x1 - pad), max(0, y1 - pad)),
                (min(iw - 1, x2 + pad), min(ih - 1, y2 + pad)),
                255, -1,
            )
        try:
            inpainted = cv2.inpaint(img_cv, mask, 7, cv2.INPAINT_TELEA)
            img_pil = Image.fromarray(cv2.cvtColor(inpainted, cv2.COLOR_BGR2RGB))
        except Exception as cv_err:
            print(f"[WARN/inpaint] OpenCV 실패, 원본 사용: {cv_err}")
            img_pil = Image.fromarray(cv2.cvtColor(img_cv, cv2.COLOR_BGR2RGB))

        # 4. 번역문 렌더링
        img_pil = render_blocks(img_pil, px_blocks)

        # 5. JPEG base64 반환
        out_buf = io.BytesIO()
        img_pil.save(out_buf, format="JPEG", quality=85)
        out_b64 = base64.b64encode(out_buf.getvalue()).decode()

        translated_bucket[date_key] = translated + 1
        _save_store(store)
        return {"translated_image": out_b64}

    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR/translate] {e}")
        raise HTTPException(500, str(e))


if APP_ENV != "production" and os.path.isdir("dist"):
    app.mount("/", StaticFiles(directory="dist", html=True), name="frontend")
