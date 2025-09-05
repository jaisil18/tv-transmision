# 📺 Sistema de Transmisión Digital TV-Transmisión

## 🎯 Descripción General

Este sistema está compuesto por dos componentes principales que trabajan en conjunto para proporcionar una solución completa de transmisión digital:

- **`tv-signage`**: Servidor web centralizado (Next.js) que gestiona contenido y pantallas
- **`android-app`**: Aplicación Android nativa para dispositivos de reproducción

## 🏗️ Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────────┐
│                        TV-SIGNAGE (Servidor)                   │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   Panel Admin   │  │   APIs REST     │  │   WebSocket     │ │
│  │   (Next.js)     │  │   Públicas      │  │   Server        │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ Gestión Archivos│  │ Streaming HLS   │  │ Gestión         │ │
│  │ Multimedia      │  │ / RTSP          │  │ Pantallas       │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                │
                                │ HTTP/WebSocket
                                │ Puerto 3000
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    ANDROID-APP (Cliente)                       │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ MainActivity    │  │ AndroidPlayer   │  │ TVPlayerActivity│ │
│  │ (Selector)      │  │ Activity        │  │ (Android TV)    │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ WebSocket       │  │ API Client      │  │ Video Player    │ │
│  │ Manager         │  │ (Retrofit)      │  │ Engine          │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## 🖥️ TV-Signage (Servidor)

### 📋 Funcionalidades Principales

#### 1. **Panel de Administración Web**
- **Gestión de Pantallas**: Crear, editar y monitorear pantallas
- **Gestión de Contenido**: Subir videos, imágenes y crear playlists
- **Programación**: Configurar horarios de reproducción
- **Monitoreo en Tiempo Real**: Estado de conexión y reproducción
- **Configuración de Red**: Gestión de streaming y conectividad

#### 2. **APIs REST Públicas**
```
📡 Endpoints Principales:
├── /api/public/screens                    # Lista de pantallas
├── /api/public/android-playlist/[id]     # Playlist completa
├── /api/public/android-tv-stream/[id]    # Stream optimizado TV
├── /api/files/media/[...path]            # Archivos multimedia
└── /api/screens/[id]/content             # Contenido de pantalla
```

#### 3. **Sistema de Streaming**
- **HLS (HTTP Live Streaming)**: Para dispositivos web
- **RTSP**: Para dispositivos especializados
- **Streaming Directo**: Archivos multimedia optimizados
- **Configuración Adaptativa**: Ajuste automático según dispositivo

#### 4. **WebSocket Server**
- **Actualizaciones en Tiempo Real**: Notificaciones instantáneas
- **Sincronización**: Cambios de contenido automáticos
- **Monitoreo**: Estado de conexión de dispositivos
- **Comandos Remotos**: Control de reproducción

### 🗂️ Estructura de Datos

#### Configuración de Pantalla
```json
{
  "screenId": "PANTALLA_01",
  "name": "Pantalla Principal",
  "location": "Recepción",
  "playlist": "playlist_principal",
  "status": "active",
  "lastSeen": "2024-01-15T10:30:00Z"
}
```

#### Configuración de Streaming
```json
{
  "hlsSettings": {
    "segmentDuration": 2,
    "bitrate": "1500k",
    "resolution": "1920x1080"
  },
  "androidTVConfig": {
    "bufferSize": "5MB",
    "preloadStrategy": "metadata",
    "memoryManagement": "aggressive",
    "autoAdvance": true
  }
}
```

## 📱 Android-App (Cliente)

### 🎯 Funcionalidades Principales

#### 1. **MainActivity (Selector de Pantallas)**
- **Detección Automática**: Escaneo de pantallas disponibles
- **Selección Manual**: Lista de pantallas configuradas
- **Configuración de Red**: Detección automática del servidor
- **Información del Dispositivo**: Envío de datos técnicos

#### 2. **AndroidPlayerActivity (Dispositivos Estándar)**
- **Reproducción Continua**: Videos e imágenes
- **Gestión de Playlists**: Navegación automática
- **Controles Táctiles**: Interfaz de usuario completa
- **Optimización de Memoria**: Gestión eficiente de recursos

#### 3. **TVPlayerActivity (Android TV)**
- **Modo Pantalla Completa**: Reproducción inmersiva
- **Optimización de Hardware**: Configuración específica para TV
- **Navegación por Control Remoto**: Soporte D-pad
- **Gestión de Memoria Avanzada**: Para hardware limitado

#### 4. **Sistema de Comunicación**
- **WebSocket Client**: Conexión persistente con servidor
- **API REST Client**: Obtención de contenido y configuración
- **Auto-reconexión**: Recuperación automática de conexión
- **Sincronización**: Actualizaciones en tiempo real

### 🔧 Componentes Técnicos

#### WebSocket Manager
```kotlin
// Conexión automática con identificación
val wsUrl = "ws://servidor:3000/ws?screenId=PANTALLA_01&type=android-tv"
webSocketManager.connect()

// Recepción de actualizaciones
webSocketManager.onContentUpdateReceived = {
    reloadPlaylist()
}
```

#### API Service (Retrofit)
```kotlin
@GET("api/public/android-tv-stream/{screenId}")
suspend fun getAndroidTVStream(
    @Path("screenId") screenId: String
): Response<AndroidTVStreamResponse>
```

## 🔄 Proceso de Conexión y Transmisión

### 1. **Inicialización del Sistema**
```
1. TV-Signage inicia servidor en puerto 3000
2. Configura WebSocket server
3. Inicializa APIs REST públicas
4. Carga configuración de pantallas y contenido
```

### 2. **Conexión de Dispositivo Android**
```
1. Android-App detecta red local
2. Escanea servidor en IP:3000
3. Obtiene lista de pantallas disponibles
4. Usuario selecciona pantalla asignada
5. Establece conexión WebSocket
6. Envía información del dispositivo
```

### 3. **Proceso de Transmisión**
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   TV-Signage    │    │   Android-App   │    │   Reproducción  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │ 1. Solicita playlist  │                       │
         │◄──────────────────────│                       │
         │                       │                       │
         │ 2. Envía contenido    │                       │
         │──────────────────────►│                       │
         │                       │                       │
         │                       │ 3. Descarga/Stream    │
         │                       │──────────────────────►│
         │                       │                       │
         │ 4. WebSocket: Update  │                       │
         │──────────────────────►│                       │
         │                       │                       │
         │                       │ 5. Actualiza contenido│
         │                       │──────────────────────►│
```

### 4. **Tipos de Transmisión**

#### **Streaming Directo (Recomendado)**
```
URL: http://servidor:3000/api/files/media/CARPETA/video.mp4
- Streaming progresivo HTTP
- Menor uso de memoria
- Reproducción inmediata
- Optimizado para Android TV
```

#### **Playlist Optimizada**
```
Endpoint: /api/public/android-tv-stream/[screenId]
Respuesta:
{
  "currentItem": { video actual },
  "nextItem": { próximo video },
  "androidTVConfig": { configuración optimizada }
}
```

#### **WebSocket en Tiempo Real**
```
Mensajes:
- "content-update": Nueva playlist disponible
- "refresh": Recargar contenido
- "status-request": Solicitud de estado
- "identification": Identificación de dispositivo
```

## 🌐 Configuración de Red

### **Requisitos de Red**
- **Misma red local**: Servidor y dispositivos Android
- **Puerto 3000**: HTTP/WebSocket (configurable)
- **Ancho de banda**: Mínimo 10 Mbps para Full HD
- **Latencia**: Menor a 50ms recomendado

### **Detección Automática**
```
Escaneo automático:
- 192.168.1.x:3000
- 192.168.0.x:3000  
- 10.0.0.x:3000
- IP local detectada:3000
```

### **URLs de Acceso**
```
📱 Panel Admin: http://IP_SERVIDOR:3000/admin
📺 Pantalla: http://IP_SERVIDOR:3000/screen/[ID_PANTALLA]
🔌 WebSocket: ws://IP_SERVIDOR:3000/ws
📡 API: http://IP_SERVIDOR:3000/api/
```

## 🚀 Instalación y Configuración

### **TV-Signage (Servidor)**
```bash
cd tv-signage
npm install
npm run setup          # Configuración inicial
npm run dev            # Desarrollo
npm run start          # Producción
```

### **Android-App (Cliente)**
```bash
cd android-app
./gradlew assembleDebug    # Compilar APK
./gradlew installDebug     # Instalar en dispositivo
```

## 🔧 Optimizaciones Específicas

### **Para Android TV**
- Buffer reducido (5MB máximo)
- Preload solo metadata
- Gestión agresiva de memoria
- Streaming directo preferido
- Auto-avance sin intervención

### **Para Dispositivos Móviles**
- Controles táctiles habilitados
- Interfaz de usuario completa
- Gestión de orientación
- Optimización de batería

## 📊 Monitoreo y Diagnóstico

### **Herramientas Incluidas**
```bash
# Diagnóstico de Android App
node diagnose-android-app.js

# Verificación de conectividad
node scripts/test-vlan-connectivity.js

# Optimización de videos
node scripts/optimize-for-android-tv.js
```

### **Logs y Debugging**
- **TV-Signage**: Logs en consola del servidor
- **Android-App**: Logcat con tags específicos
- **WebSocket**: Monitoreo de conexiones en tiempo real
- **API**: Logs de requests y responses

## 🔒 Seguridad y Autenticación

### **Rutas Protegidas**
- Panel de administración: Requiere login
- APIs de gestión: Autenticación requerida
- Configuración del sistema: Solo administradores

### **Rutas Públicas**
- APIs de contenido para pantallas
- Archivos multimedia
- WebSocket de pantallas
- Endpoints de streaming

## 📈 Escalabilidad

- **Múltiples pantallas**: Soporte ilimitado
- **Contenido distribuido**: Gestión eficiente de archivos
- **Red optimizada**: Streaming adaptativo
- **Hardware variado**: Optimización por dispositivo

---

## 🆘 Soporte y Troubleshooting

### **Problemas Comunes**
1. **Conexión fallida**: Verificar red y firewall
2. **Videos no reproducen**: Comprobar formato y codificación
3. **Actualizaciones lentas**: Revisar WebSocket y polling
4. **Memoria insuficiente**: Activar optimizaciones de Android TV

### **Contacto**
- Documentación técnica en `/docs`
- Scripts de diagnóstico en `/scripts`
- Configuración en `/data`

---

**Sistema desarrollado para UCT - Universidad Católica de Temuco**

*Versión: 1.0 | Última actualización: Enero 2024*