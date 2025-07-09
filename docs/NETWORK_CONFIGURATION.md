# Configuración de Red Automática
## Solución Implementada

### 🔧 Detección Automática de IP

El sistema ahora detecta automáticamente la IP de la interfaz de red principal y actualiza todos los archivos de configuración necesarios.

### 📁 Archivos que se Actualizan Automáticamente

1. **`data/settings.json`** - Configuración principal del servidor
2. **`public/data/network-config.json`** - Configuración pública para clientes
3. **`data/network-config.json`** - Configuración interna de red
4. **`next.config.js`** - Configuración de Next.js para orígenes permitidos

## 🚀 Comandos Disponibles

### Actualización Rápida
```bash
npm run update-network
```
Detecta la IP actual y actualiza todos los archivos de configuración.

### Configuración Completa
```bash
npm run setup-network
```
Detecta la red, muestra información detallada y configura el acceso desde otras VLANs.

### Ejecución Manual
```bash
node scripts/update-network-config.js
node scripts/setup-network-access.js
```

## 🔍 Cómo Funciona

### 1. Detección de Interfaces
El sistema utiliza `os.networkInterfaces()` para detectar todas las interfaces de red disponibles.

### 2. Selección de IP Óptima
Prioriza las IPs en este orden:
- Redes domésticas/oficina (`192.168.x.x`)
- Redes corporativas (`10.x.x.x`)
- Redes Docker/VPN (`172.x.x.x`)

### 3. Actualización Automática
Actualiza todos los archivos de configuración con la IP detectada.

## 📋 Información de Red Detectada

Cuando ejecutas los scripts, obtienes:

```
🎯 IP detectada: 172.16.31.17 (Ethernet)

🌐 URLs actualizadas:
   • Web: http://172.16.31.17:3000
   • Admin: http://172.16.31.17:3000/admin
   • API: http://172.16.31.17:3000/api

📱 URLs para Pantallas:
   • Formato: http://172.16.31.17:3000/screen/[SCREEN_ID]

🎬 URLs de Streaming:
   • HLS: http://172.16.31.17:3000/api/hls/[SCREEN_ID]
   • RTSP: rtsp://172.16.31.17:8554/live/screen_[SCREEN_ID]
```

## 🔄 Cuándo Ejecutar

### Ejecuta `npm run update-network` cuando:
- Cambies de red (WiFi, Ethernet, VPN)
- La IP del servidor haya cambiado
- Muevas la aplicación a otro servidor
- Tengas problemas de conectividad desde otras redes

### Después de la Actualización
1. Reinicia el servidor: `npm run dev`
2. Verifica el acceso desde diferentes dispositivos
3. Prueba las URLs generadas

## 🛠️ Solución de Problemas

### No se puede acceder desde otra VLAN
1. Verifica que el firewall permita el puerto 3000
2. Verifica que no haya restricciones de VLAN
3. Prueba hacer ping a la IP del servidor
4. Ejecuta: `curl http://[IP_SERVIDOR]:3000/api/public/settings`

### IP Incorrecta Detectada
Si el script detecta una IP incorrecta, puedes:
1. Desconectar interfaces no deseadas (VPN, Docker)
2. Modificar manualmente los archivos de configuración
3. Usar variables de entorno para forzar una IP específica

## 🔒 Buenas Prácticas

### ❌ NO Hagas Esto
- No hardcodees IPs en el código
- No commits archivos de configuración con IPs específicas
- No uses IPs públicas en desarrollo

### ✅ SÍ Haz Esto
- Ejecuta `npm run update-network` al cambiar de red
- Usa los scripts automatizados
- Verifica la configuración después de cambios
- Documenta IPs específicas si son necesarias

## 🔧 Desarrollo

Para desarrolladores que trabajen en el proyecto:

1. **Nunca** hardcodees IPs en el código
2. Usa `npm run update-network` al configurar el entorno
3. Verifica que los cambios funcionen en diferentes redes
4. Documenta cualquier configuración específica necesaria

---

**Nota**: Esta configuración automática hace que la aplicación sea completamente portable entre diferentes redes sin necesidad de modificar código.