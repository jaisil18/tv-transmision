@echo off
echo ========================================
echo UCT TV System - Diagnostico de Red
echo ========================================
echo.

echo 1. Verificando conectividad basica...
ping -n 3 192.168.101.3
echo.

echo 2. Verificando puerto 3000...
telnet 192.168.101.3 3000
echo.

echo 3. Verificando reglas de firewall...
netsh advfirewall firewall show rule name="UCT TV System"
echo.

echo 4. Verificando procesos en puerto 3000...
netstat -ano | findstr :3000
echo.

echo 5. Probando API publica...
curl http://192.168.101.3:3000/api/public/settings
echo.

echo ========================================
echo Diagnostico completado
echo ========================================
pause
