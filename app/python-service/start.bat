@echo off
cd /d %~dp0
echo Instalando dependencias Python...
python -m pip install -r requirements.txt --quiet
echo.
echo Iniciando Dotaneitor en http://localhost:5001
echo Presiona Ctrl+C para detener.
echo.
python -m uvicorn main:app --host 0.0.0.0 --port 5001 --reload
pause
