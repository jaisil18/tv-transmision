# 🎬 Sistema de Streaming RTSP a HLS

## 📋 Descripción

Este sistema convierte automáticamente streams RTSP a HLS para mejorar la compatibilidad con navegadores web y dispositivos móviles Android. Incluye detección automática de IP y configuración adaptable para diferentes VLANs.

## ✨ Características

- **🔄 Conversión RTSP a HLS**: Convierte streams RTSP a formato HLS compatible con navegadores
- **📱 Compatible con Android**: Optimizado para reproducción en dispositivos móviles
- **🌐 IP Adaptable**: Detecta automáticamente la IP del servidor para diferentes VLANs
- **⚡ Baja Latencia**: Configurado para streaming en tiempo real
- **🎯 Auto-inicio**: Inicia automáticamente streams para pantallas configuradas
- **🧹 Auto-limpieza**: Elimina segmentos antiguos automáticamente

## 🚀 Inicio Rápido

### 1. Verificar Configuración
```bash
npm run check-streaming
```

### 2. Iniciar Servidor
```bash
npm run start
# o para desarrollo
npm run dev
```

### 3. Acceder al Sistema
- **Web**: `http://[IP]:3000`
- **HLS Stream**: `http://[IP]:3000/api/hls/[screenId]`
- **RTSP Stream**: `rtsp://[IP]:8554/live/screen_[screenId]`

## 📡 URLs de Acceso

### Desde tu red actual:
- **HTTP**: `http://192.168.101.3:3000`
- **HLS**: `http://192.168.101.3:3000/api/hls/[screenId]`
- **RTSP**: `rtsp://192.168.101.3:8554/live/screen_[screenId]`

### APIs Disponibles:

#### 🎬 Gestión de Streaming
- `GET /api/streaming/status` - Estado general del streaming
- `GET /api/streaming/[screenId]` - Estado de una pantalla específica
- `POST /api/streaming/[screenId]` - Iniciar streaming
- `DELETE /api/streaming/[screenId]` - Detener streaming

#### 📺 HLS Streaming
- `GET /api/hls/[screenId]` - Playlist HLS (.m3u8)
- `GET /api/hls/segments/[screenId]/[segment].ts` - Segmentos de video

#### 🌐 Configuración de Red
- `GET /api/network/detect` - Detectar configuración de red

## 🔧 Configuración

### Archivo: `data/streaming-config.json`
```json
{
  "autoStart": true,
  "enableRTSP": true,
  "enableHLS": true,
  "defaultScreens": [],
  "networkDetection": true,
  "hlsSettings": {
    "segmentDuration": 2,
    "playlistSize": 10,
    "bitrate": "1500k",
    "maxBitrate": "2000k"
  },
  "mobileOptimization": {
    "enabled": true,
    "androidCompatibility": true,
    "reducedBitrate": "1000k"
  }
}
```

## 📱 Uso en Android

### 1. Conectar a la misma red
Asegúrate de que tu dispositivo Android esté en la misma red que el servidor.

### 2. Abrir en navegador
```
http://192.168.101.3:3000/screen/[screenId]
```

### 3. Reproducción automática
El sistema detectará automáticamente que es un dispositivo Android y optimizará la reproducción.

## 🎯 Componentes React

### HLSPlayer
```tsx
import HLSPlayer from '@/components/HLSPlayer';

<HLSPlayer 
  screenId="pantalla1"
  autoplay={true}
  muted={true}
  className="w-full h-full"
/>
```

### Hook useHLSStreaming
```tsx
import { useHLSStreaming } from '@/hooks/useHLSStreaming';

const { 
  startStreaming, 
  stopStreaming, 
  getHLSUrl, 
  isStreamingActive 
} = useHLSStreaming('pantalla1');
```

## 🔍 Diagnóstico

### Verificar Estado
```bash
curl http://192.168.101.3:3000/api/streaming/status
```

### Iniciar Streaming
```bash
curl -X POST http://192.168.101.3:3000/api/streaming/pantalla1 \
  -H "Content-Type: application/json" \
  -d '{"type": "both"}'
```

### Probar HLS
```bash
curl http://192.168.101.3:3000/api/hls/pantalla1
```

## 🛠️ Solución de Problemas

### FFmpeg no encontrado
```bash
npm run install-ffmpeg
```

### Error de permisos de red
- Verificar firewall
- Asegurar que el puerto 3000 y 8554 estén abiertos

### Streaming no inicia
1. Verificar que hay contenido asignado a la pantalla
2. Revisar logs del servidor
3. Verificar configuración en `data/streaming-config.json`

### Android no reproduce
1. Verificar que el dispositivo esté en la misma red
2. Usar Chrome o navegador compatible con HLS
3. Verificar que el autoplay esté permitido

## 📊 Monitoreo

### Logs del Servidor
Los logs incluyen información detallada sobre:
- Inicio de streams
- Estado de FFmpeg
- Errores de red
- Estadísticas de reproducción

### Métricas Disponibles
- Número de streams activos
- Bitrate actual
- FPS de reproducción
- Número de segmentos generados

## 🔄 Actualizaciones de Red

El sistema detecta automáticamente cambios de red y actualiza las URLs correspondientes. Si cambias de VLAN o ubicación:

1. El servidor detectará la nueva IP automáticamente
2. Las URLs se actualizarán en tiempo real
3. Los streams existentes continuarán funcionando
4. Los nuevos dispositivos usarán la nueva configuración

## 📞 Soporte

Para problemas o preguntas:
1. Ejecutar `npm run check-streaming` para diagnóstico
2. Revisar logs del servidor
3. Verificar configuración de red
4. Consultar documentación de FFmpeg si es necesario

---

✅ **Sistema listo para producción con soporte completo para Android y navegadores web**
