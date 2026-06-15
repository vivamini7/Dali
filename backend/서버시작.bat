@echo off
cd /d "%~dp0"
echo 백엔드 서버 시작 중...
python -m uvicorn app:app --host 0.0.0.0 --port 7860 --reload
pause
