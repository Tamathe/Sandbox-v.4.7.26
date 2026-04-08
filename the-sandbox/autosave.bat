@echo off
echo Auto-save running. Press Ctrl+C to stop.
:loop
git add .
git commit -m "Auto-save: %date% %time%"
timeout /t 1800 /nobreak
goto loop
