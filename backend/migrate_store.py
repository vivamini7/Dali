import json
import os
from pathlib import Path

import psycopg
from dotenv import load_dotenv
from psycopg.types.json import Json


STORE_PATH = Path(__file__).resolve().parent / "data" / "store.json"
load_dotenv(Path(__file__).resolve().parent / ".env")
DATABASE_URL = os.environ.get("DATABASE_URL", "").strip()


def main() -> None:
    if not DATABASE_URL:
        raise SystemExit("DATABASE_URL이 설정되지 않았습니다.")
    if not STORE_PATH.exists():
        raise SystemExit(f"기존 저장 파일이 없습니다: {STORE_PATH}")

    store = json.loads(STORE_PATH.read_text(encoding="utf-8"))
    for key in ("users", "sessions", "usage"):
        store.setdefault(key, {})
    store.setdefault("imageUsage", {})
    store.setdefault("imageTranslationUsage", {})
    store.setdefault("clientErrors", [])

    with psycopg.connect(DATABASE_URL) as conn:
        conn.execute(
            "CREATE TABLE IF NOT EXISTS app_store "
            "(id INT PRIMARY KEY, data JSONB NOT NULL)"
        )
        existing = conn.execute(
            "SELECT data FROM app_store WHERE id = 1"
        ).fetchone()

        empty_stores = (
            {},
            {"users": {}, "sessions": {}, "usage": {}},
            {"users": {}, "sessions": {}, "usage": {}, "clientErrors": []},
            {"users": {}, "sessions": {}, "usage": {}, "imageUsage": {}, "clientErrors": []},
            {
                "users": {},
                "sessions": {},
                "usage": {},
                "imageUsage": {},
                "imageTranslationUsage": {},
                "clientErrors": [],
            },
        )
        if existing and existing[0] not in empty_stores:
            raise SystemExit(
                "대상 DB에 기존 데이터가 있어 중단했습니다. "
                "데이터를 덮어쓰려면 먼저 백업 후 직접 확인하세요."
            )

        conn.execute(
            "INSERT INTO app_store (id, data) VALUES (1, %s) "
            "ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data",
            (Json(store),),
        )
        conn.commit()

    print(
        "이전 완료: "
        f"users={len(store.get('users', {}))}, "
        f"sessions={len(store.get('sessions', {}))}, "
        f"usage={len(store.get('usage', {}))}"
    )


if __name__ == "__main__":
    main()
