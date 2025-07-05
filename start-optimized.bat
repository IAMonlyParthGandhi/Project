@echo off
echo ================================
echo Starting Optimized Todo App
echo ================================

echo [1/4] Starting MongoDB (if not already running)...
REM net start MongoDB

echo [2/4] Starting Backend Server...
cd server
start "Backend Server" cmd /k "npm run dev"
timeout /t 3

echo [3/4] Starting Frontend Development Server...
cd ..\client
start "Frontend Server" cmd /k "npm start"

echo [4/4] Opening application in browser...
timeout /t 10
start http://localhost:3000

echo ================================
echo Todo App started successfully!
echo Backend: http://localhost:5000
echo Frontend: http://localhost:3000
echo ================================
pause
