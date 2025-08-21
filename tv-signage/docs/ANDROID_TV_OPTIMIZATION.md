# 📺 Optimización para Android TV - Hardware Limitado

## 🎯 Estrategias Implementadas

### 1. **Endpoints Públicos (Sin Autenticación)**
- ✅ `/api/files/media/[...path]` - Archivos de video directos
- ✅ `/api/public/android-playlist/[screenId]` - Playlist completa
- ✅ `/api/public/android-tv-stream/[screenId]` - Stream optimizado (NUEVO)

### 2. **Streaming Progresivo vs Descarga**

#### ❌ **NO hacer** (Problemas de memoria):
```javascript
// MAL: Descargar todo el video
fetch(videoUrl).then(response => response.blob())
  .then(blob => video.src = URL.createObjectURL(blob));
```

#### ✅ **SÍ hacer** (Streaming directo):
```javascript
// BIEN: Streaming progresivo
video.src = "http://172.16.31.17:3000/api/files/media/CASS/video.mp4";
video.preload = "metadata"; // Solo metadatos
```

### 3. **Configuración Recomendada para Android TV**

#### **HTML5 Video Element**:
```html
<video 
  autoplay 
  muted 
  loop
  preload="metadata"
  crossorigin="anonymous"
  style="width: 100%; height: 100%; object-fit: cover;"
>
  <source src="VIDEO_URL" type="video/mp4">
</video>
```

#### **JavaScript para Gestión de Memoria**:
```javascript
class AndroidTVPlayer {
  constructor(screenId) {
    this.screenId = screenId;
    this.currentIndex = 0;
    this.video = document.querySelector('video');
    this.setupPlayer();
  }

  async setupPlayer() {
    // Obtener stream optimizado
    const response = await fetch(
      `http://172.16.31.17:3000/api/public/android-tv-stream/${this.screenId}?index=${this.currentIndex}`
    );
    const streamData = await response.json();
    
    // Configurar video actual
    this.loadVideo(streamData.currentItem);
    
    // Precargar siguiente (solo metadatos)
    this.preloadNext(streamData.nextItem);
  }

  loadVideo(item) {
    this.video.src = item.streamUrl;
    this.video.load();
    
    // Limpiar memoria del video anterior
    this.cleanupPreviousVideo();
  }

  preloadNext(nextItem) {
    // Crear elemento oculto solo para metadatos
    const preloadVideo = document.createElement('video');
    preloadVideo.preload = 'metadata';
    preloadVideo.src = nextItem.streamUrl;
    preloadVideo.style.display = 'none';
    document.body.appendChild(preloadVideo);
    
    // Limpiar después de 30 segundos
    setTimeout(() => {
      document.body.removeChild(preloadVideo);
    }, 30000);
  }

  cleanupPreviousVideo() {
    // Forzar liberación de memoria
    if (this.video.src) {
      URL.revokeObjectURL(this.video.src);
    }
    
    // Limpiar buffer
    if (this.video.buffered.length > 0) {
      try {
        // Intentar limpiar buffer (no todos los navegadores lo soportan)
        this.video.currentTime = 0;
      } catch (e) {
        console.log('Buffer cleanup not supported');
      }
    }
  }

  async nextVideo() {
    this.currentIndex++;
    await this.setupPlayer();
  }
}

// Uso
const player = new AndroidTVPlayer('1750193301502');
```

### 4. **Comparación de Endpoints**

| Endpoint | Uso Recomendado | Datos Devueltos | Optimización |
|----------|-----------------|-----------------|--------------|
| `/api/public/android-playlist/[screenId]` | Apps Android normales | Lista completa (29 videos) | Básica |
| `/api/public/android-tv-stream/[screenId]` | Android TV limitado | Solo actual + siguiente | Avanzada |
| `/api/files/media/[...path]` | Streaming directo | Archivo de video | Máxima |

### 5. **Configuración de Red para Android TV**

#### **Configuración de Buffer**:
```javascript
// Configurar buffer pequeño para hardware limitado
video.addEventListener('loadstart', () => {
  // Configurar buffer mínimo
  if (video.buffered.length > 0) {
    const bufferSize = 5 * 1024 * 1024; // 5MB máximo
    // Implementar lógica de buffer según capacidad
  }
});
```

#### **Gestión de Errores de Red**:
```javascript
video.addEventListener('error', (e) => {
  console.error('Error de video:', e);
  // Reintentar con calidad menor o siguiente video
  setTimeout(() => {
    player.nextVideo();
  }, 3000);
});

video.addEventListener('stalled', () => {
  console.log('Video pausado por buffer');
  // Mostrar indicador de carga
});
```

### 6. **Monitoreo de Rendimiento**

```javascript
// Monitorear uso de memoria
function checkMemoryUsage() {
  if (performance.memory) {
    const used = performance.memory.usedJSHeapSize;
    const total = performance.memory.totalJSHeapSize;
    const limit = performance.memory.jsHeapSizeLimit;
    
    console.log(`Memoria: ${Math.round(used/1024/1024)}MB / ${Math.round(limit/1024/1024)}MB`);
    
    // Si usa más del 80% de memoria, limpiar
    if (used / limit > 0.8) {
      player.cleanupPreviousVideo();
      // Forzar garbage collection si es posible
      if (window.gc) window.gc();
    }
  }
}

// Verificar cada 30 segundos
setInterval(checkMemoryUsage, 30000);
```

### 7. **URLs de Ejemplo**

#### **Para Android TV con Hardware Limitado**:
```
GET http://172.16.31.17:3000/api/public/android-tv-stream/1750193301502?index=0
```

Respuesta optimizada:
```json
{
  "screenId": "1750193301502",
  "currentItem": {
    "streamUrl": "http://172.16.31.17:3000/api/files/media/CASS/UCT%20XPRESS%205.mp4",
    "preload": "auto",
    "priority": "high"
  },
  "nextItem": {
    "streamUrl": "http://172.16.31.17:3000/api/files/media/CASS/CEREMONIA.mp4",
    "preload": "metadata",
    "priority": "normal"
  },
  "androidTVConfig": {
    "bufferSize": "5MB",
    "memoryManagement": "aggressive"
  }
}
```

#### **Para Android Normal**:
```
GET http://172.16.31.17:3000/api/public/android-playlist/1750193301502
```

### 8. **Recomendaciones Finales**

1. **Usar streaming progresivo**, no descargar archivos completos
2. **Precargar solo metadatos** del siguiente video
3. **Limpiar memoria** agresivamente después de cada video
4. **Monitorear uso de memoria** y actuar preventivamente
5. **Usar el endpoint optimizado** `/android-tv-stream/` para hardware limitado
6. **Configurar buffers pequeños** (5MB máximo)
7. **Implementar fallbacks** para errores de red

### 9. **Troubleshooting**

| Problema | Causa | Solución |
|----------|-------|----------|
| Video no carga | URL incorrecta | Verificar endpoint y encoding |
| Memoria agotada | Acumulación de buffers | Implementar limpieza agresiva |
| Reproducción entrecortada | Buffer insuficiente | Reducir calidad o aumentar buffer |
| App se cierra | OutOfMemory | Usar endpoint optimizado `/android-tv-stream/` |
