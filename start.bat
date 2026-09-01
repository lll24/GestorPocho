@echo off
echo ===================================================
echo   Iniciando Servidor Local de Gestor Pocho...
echo ===================================================
echo.

:: Check if backend/venv exists
if not exist "backend\venv" (
    echo El entorno virtual no se encuentra. 
    echo Por favor asegurese de estar en el directorio correcto.
    pause
    exit /b
)

:: Auto open browser in 2 seconds in the background
echo Abriendo navegador en http://localhost:8000 ...
start "" "http://localhost:8000"

:: Start FastAPI server
echo.
echo Levantando la API en el puerto 8000...
cd backend
call .\venv\Scripts\python.exe -m uvicorn main:app --host 0.0.0.0 --port 8000
if %errorlevel% neq 0 (
    echo.
    echo Error al levantar el servidor. Asegurese de que el puerto 8000 este libre.
    pause
)
cd ..
