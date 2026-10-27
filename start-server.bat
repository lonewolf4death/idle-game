@echo off
REM Serve the game at http://localhost:8080
py -m http.server 8080 --directory docs
pause
