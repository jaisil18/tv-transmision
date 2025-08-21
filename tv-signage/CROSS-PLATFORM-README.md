# 🌐 Guía de Ejecución Multiplataforma - UCT TV System

Este documento explica cómo ejecutar el sistema UCT TV en diferentes plataformas (Windows y Ubuntu).

## 🚀 Inicio Rápido

El sistema ahora detecta automáticamente el sistema operativo y utiliza los comandos adecuados para cada plataforma.

```bash
# Iniciar el servidor (detecta automáticamente Windows o Ubuntu)
npm run start
```

## 🪟 Ejecución en Windows

Si prefieres usar comandos específicos para Windows:

```bash
# Modo desarrollo
npm run dev

# Modo producción (con detección automática de sistema operativo)
npm run start:windows

# Iniciar con detección de red automática
npm run dev:network
```

> **Nota**: El comando `start:windows` ahora utiliza la ruta directa al ejecutable de Next.js (`node ./node_modules/next/dist/bin/next`), lo que proporciona mayor compatibilidad y evita problemas con rutas específicas de Windows.

## 🐧 Ejecución en Ubuntu/Linux

Si prefieres usar comandos específicos para Ubuntu:

```bash
# Modo producción (con detección automática de sistema operativo)
npm run start:ubuntu

# Como servicio del sistema
sudo systemctl start tv-signage.service

# Ver logs del servicio
sudo journalctl -u tv-signage.service -f
```

> **Nota**: El comando `start:ubuntu` ahora utiliza `npx` para ejecutar Next.js, lo que proporciona mayor compatibilidad entre sistemas operativos.

## 📋 Comandos Adicionales

```bash
# Iniciar con WebSocket (ambas plataformas)
npm run start-ws

# Iniciar en red local (ambas plataformas)
npm run start:network

# Iniciar con puerto específico (ambas plataformas)
npm run dev:port
```

## 🔧 Solución de Problemas

### Windows

Si encuentras problemas al iniciar en Windows:

1. Verifica que Node.js esté instalado correctamente
2. Asegúrate de que las rutas en package.json usen doble barra invertida (`\\`)
3. Ejecuta `npm install` para asegurar que todas las dependencias estén instaladas
4. Si ves el error `Error: spawn npx ENOENT` o `"next" no se reconoce como un comando interno o externo`, no te preocupes, los scripts han sido actualizados para usar la ruta directa al ejecutable de Next.js, evitando la necesidad de npx o rutas en .bin.
5. Si continúas teniendo problemas, intenta estas soluciones:
   - Ejecuta `npm install` para reinstalar las dependencias
   - Ejecuta `npm rebuild` para reconstruir los módulos nativos
   - Verifica que Next.js esté instalado correctamente en `node_modules/next`

### Ubuntu

Si encuentras problemas al iniciar en Ubuntu:

1. Verifica permisos: `chmod +x scripts/*.sh scripts/*.js`
2. Asegúrate de que el servicio esté instalado: `sudo ./scripts/update-service.sh`
3. Verifica logs del sistema: `sudo journalctl -u tv-signage.service -e`

## 📱 Acceso desde Dispositivos

Una vez iniciado el servidor, puedes acceder desde:

- **Panel de Administración**: `http://<ip-servidor>:3000/admin`
- **Pantallas**: `http://<ip-servidor>:3000/screen/<id-pantalla>`
- **Streaming HLS**: `http://<ip-servidor>:3000/api/hls/<id-pantalla>`
- **Streaming RTSP**: `rtsp://<ip-servidor>:8554/live/screen_<id-pantalla>`