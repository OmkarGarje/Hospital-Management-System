@echo off
title MediCore Hospital Management System
cd /d "%~dp0"

echo ==========================================================
echo        MediCore - Hospital Management System
echo ==========================================================
echo.

where node >nul 2>nul
if %ERRORLEVEL% neq 0 goto try_python

echo [1/2] Node.js detected.
echo [2/2] Launching browser at http://localhost:3000...
start "" "http://localhost:3000"
echo.
echo Server running (Press Ctrl+C to stop)...
echo ----------------------------------------------------------
node server.js
pause
exit /b

:try_python
where python >nul 2>nul
if %ERRORLEVEL% neq 0 goto fallback

echo [1/2] Python detected.
echo [2/2] Launching browser at http://localhost:5000...
start "" "http://localhost:5000"
python app.py
pause
exit /b

:fallback
echo [!] Node.js and Python not found in PATH.
echo [*] Opening standalone client dashboard directly...
start "" "%~dp0public\index.html"
pause
