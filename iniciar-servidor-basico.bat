@echo off
echo Iniciando servidor UCT TV Signage...
echo.

REM Verificar que estamos en el directorio correcto
if not exist "package.json" (
    echo Error: No se encontro package.json en este directorio
    echo Ejecuta este script desde la carpeta del proyecto
    pause
    exit /b 1
)

echo Limpiando cache de Next.js...
if exist ".next" (
    rmdir /s /q ".next" 2>nul
    echo Cache de Next.js eliminado
) else (
    echo No hay cache de Next.js
)

echo.
echo Iniciando servidor...
echo Presiona Ctrl+C para detener el servidor
echo.

npm run dev

echo.
echo Servidor detenido
pause