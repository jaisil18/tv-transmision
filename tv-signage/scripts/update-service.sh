#!/bin/bash

echo "🔄 Actualizando servicio TV Signage..."

# Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ]; then
    echo "❌ Error: No se encontró package.json. Ejecuta este script desde el directorio raíz del proyecto."
    exit 1
fi

# Función para mostrar el estado del servicio
show_service_status() {
    echo "📊 Estado del servicio:"
    systemctl status tv-signage.service --no-pager -l
}

# Mostrar estado inicial
echo "📋 Estado inicial del servicio:"
show_service_status

echo ""
echo "🏗️ Construyendo el proyecto..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Error en el build. Abortando actualización."
    exit 1
fi

echo "✅ Build completado exitosamente"

echo ""
echo "🔄 Reiniciando servicio..."
systemctl restart tv-signage.service

if [ $? -eq 0 ]; then
    echo "✅ Servicio reiniciado exitosamente"
else
    echo "⚠️ Advertencia: No se pudo reiniciar el servicio automáticamente"
    echo "💡 Ejecuta manualmente: sudo systemctl restart tv-signage.service"
fi

echo ""
echo "⏳ Esperando que el servicio se estabilice..."
sleep 5

echo ""
echo "📊 Estado final del servicio:"
show_service_status

echo ""
echo "📝 Logs recientes del servicio:"
journalctl -u tv-signage.service --no-pager -n 10

echo ""
echo "✅ ¡Actualización completada!"
echo ""
echo "🌐 El servicio debería estar disponible en:"
echo "   http://localhost:3000"
echo "   http://172.16.31.17:3000"
echo ""
echo "📋 Comandos útiles:"
echo "   - Ver estado: systemctl status tv-signage.service"
echo "   - Ver logs: journalctl -u tv-signage.service -f"
echo "   - Reiniciar: sudo systemctl restart tv-signage.service"
echo "   - Parar: sudo systemctl stop tv-signage.service"
echo "   - Iniciar: sudo systemctl start tv-signage.service"
