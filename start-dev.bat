@echo off
echo ========================================
echo   Demarrage des serveurs OptiSass
echo ========================================
echo.
echo Demarrage du Backend (Port 3000)...
start "Backend - NestJS" cmd /k "cd backend && npm run start:dev"
timeout /t 2 /nobreak >nul

echo Demarrage du Frontend (Port 4200)...
start "Frontend - Angular" cmd /k "cd frontend && npm start"

echo.
echo ========================================
echo   Les deux serveurs sont en cours de demarrage
echo   Backend:  http://127.0.0.1:3000
echo   Frontend: http://localhost:4200
echo ========================================
echo.
echo Appuyez sur une touche pour fermer cette fenetre...
pause >nul
