@echo off
title MENTORA - Learn. Focus. Evolve.
cd /d "%~dp0"
echo.
echo  Starting MENTORA...
echo  First startup may install dependencies.
echo.
if not exist "node_modules" (
  call npm install
  if errorlevel 1 (
    echo Dependency installation failed.
    pause
    exit /b 1
  )
)
call npm run build
if errorlevel 1 (
  echo Build failed. Check the error above.
  pause
  exit /b 1
)
start "MENTORA" cmd /c "node dist\server.js"
timeout /t 2 /nobreak >nul
start "" http://localhost:4173
echo.
echo  MENTORA is open at http://localhost:4173
echo  Keep this window open while using the app.
pause
