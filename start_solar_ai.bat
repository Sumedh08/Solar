@echo off
echo =========================================
echo    Starting Solar AI Platform
echo =========================================

echo [1/2] ML/Agent backend on port 5000...
cd /d "%~dp0solar-ai-platform\ml-services"
start "Solar.ai Backend" cmd /k "python -m uvicorn app:app --host 0.0.0.0 --port 5000 --reload"
cd /d "%~dp0"

echo [2/2] React frontend on port 5173...
cd /d "%~dp0solar-ai-platform\frontend"
start "Solar.ai Frontend" cmd /k "npm run dev"
cd /d "%~dp0"

echo.
echo Services launching:
echo   Backend:  http://localhost:5000
echo   Frontend: http://localhost:5173
echo.
echo Set GROQ_API_KEY (and optional OPENROUTER_API_KEY, NREL_API_KEY) in ml-services\.env
echo =========================================
