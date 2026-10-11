@echo off
echo ===================================================
echo   Compilando Gestor Pocho a Ejecutable (.exe)
echo ===================================================
echo.

echo [1/3] Construyendo el Frontend de React...
cd frontend
call npm install
call npm run build
if %errorlevel% neq 0 (
    echo Error al construir el frontend.
    pause
    exit /b %errorlevel%
)
cd ..

echo.
echo [2/3] Instalando PyInstaller en el Entorno Virtual del Backend...
cd backend
call .\venv\Scripts\pip install pyinstaller
if %errorlevel% neq 0 (
    echo Error al instalar PyInstaller.
    pause
    exit /b %errorlevel%
)

echo.
echo [3/3] Creando el ejecutable portable con PyInstaller...
echo Nota: Esto empaquetara FastAPI, SQLite y la build de React en un solo .exe.
:: We bundle the frontend/dist folder into the exe under "frontend/dist" and collect all backend dependencies
call .\venv\Scripts\pyinstaller --noconfirm --onefile --name="GestorPocho" --add-data "..\frontend\dist;frontend\dist" --collect-all uvicorn --collect-all sqlmodel --collect-all fpdf main.py
if %errorlevel% neq 0 (
    echo Error al empaquetar con PyInstaller.
    pause
    exit /b %errorlevel%
)

echo.
echo ===================================================
echo   COMPILACION COMPLETADA CON EXITO!
echo   El archivo ejecutable esta en: backend/dist/GestorPocho.exe
echo ===================================================
copy /y dist\GestorPocho.exe ..\GestorPocho.exe
if exist "uploads" (
    xcopy /E /I /Y "uploads" "..\uploads" >nul
)
cd ..
echo.
echo Para llevar el programa a otra PC:
echo Copia GestorPocho.exe junto con la carpeta 'uploads' y 'gestor_pocho.db'.
echo O descarga una 'Copia de Seguridad (.zip)' desde la vista de Configuracion.
echo.
pause
