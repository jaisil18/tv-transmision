# 📺 Guía de Optimización para Android TV

## 🎯 Problemas Solucionados

### ✅ Optimizaciones Implementadas:

1. **Reproducción Automática Mejorada**
   - Múltiples estrategias de autoplay para TVs Android
   - Reintentos automáticos cuando el video se pausa
   - Transiciones automáticas entre videos sin requerir interacción

2. **Gestión de Memoria Optimizada**
   - Limpieza automática de videos anteriores
   - Preload inteligente según el tipo de dispositivo
   - Configuraciones específicas para TVs de 65"

3. **Manejo de Pausas Automáticas**
   - Detección automática de pausas del sistema
   - Reanudación automática después de 2 segundos
   - Indicadores visuales mejorados para TVs

## 🔧 Configuraciones Aplicadas

### Para TVs Android:
```javascript
// Configuraciones automáticas aplicadas
video.preload = 'auto';
video.playsInline = true;
video.setAttribute('webkit-playsinline', 'true');
video.setAttribute('x5-video-player-type', 'h5');
video.setAttribute('x5-video-player-fullscreen', 'true');
```

### Especificaciones de Video Recomendadas:
- **Formato**: MP4 H.264
- **Resolución**: Máximo 1920x1080 (Full HD)
- **Bitrate**: Máximo 3000k
- **FPS**: 30 fps estable
- **Duración**: 30-120 segundos por video
- **Audio**: AAC, 128k, 44.1kHz, Estéreo

## 🎬 Cómo Optimizar Videos Existentes

### Opción 1: Script Automático
```bash
# Ejecutar el script de optimización
node scripts/optimize-for-android-tv.js
```

### Opción 2: FFmpeg Manual
```bash
# Para un video específico
ffmpeg -i input.mp4 \
  -c:v h264 -profile:v main -level:v 4.0 \
  -b:v 3000k -maxrate 3000k -bufsize 6000k \
  -r 30 \
  -vf "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2" \
  -c:a aac -b:a 128k -ar 44100 -ac 2 \
  -movflags +faststart \
  -preset medium \
  output_tv_optimized.mp4
```

## 📱 Configuración de la TV Android

### 1. Configuraciones del Navegador:
- **Chrome/WebView**: Habilitar aceleración por hardware
- **Memoria**: Limpiar caché regularmente
- **Autoplay**: Permitir en configuraciones del sitio

### 2. Configuraciones de Red:
- **Preferir Ethernet** sobre WiFi para estabilidad
- **Ancho de banda**: Mínimo 10 Mbps para videos Full HD
- **Latencia**: Menor a 50ms para mejor experiencia

### 3. Configuraciones del Sistema:
- **Memoria RAM**: Liberar aplicaciones en segundo plano
- **Almacenamiento**: Mantener al menos 2GB libres
- **Reinicio**: Reiniciar la TV cada 24 horas

## 🔄 Comportamiento Esperado

### ✅ Funcionamiento Correcto:
1. **Primer video**: Se reproduce automáticamente
2. **Segundo video**: Transición automática sin pausas
3. **Videos siguientes**: Reproducción continua sin intervención
4. **Fin de playlist**: Reinicia automáticamente (modo repetir)

### ⚠️ Si Aparece "Presiona OK":
- Es normal en el primer video
- La TV requiere una interacción inicial
- Después de la primera interacción, todo será automático

## 🛠️ Solución de Problemas

### Problema: Video se pausa cada cierto tiempo
**Solución**: 
- Verificar que los videos estén optimizados (bitrate ≤ 3000k)
- Limpiar caché del navegador
- Reiniciar la TV

### Problema: Requiere "play" entre videos
**Solución**:
- Verificar que autoplay esté habilitado
- Usar videos optimizados con el script
- Asegurar conexión de red estable

### Problema: Se paraliza en el tercer video
**Solución**:
- Reducir duración de videos (≤ 2 minutos)
- Optimizar bitrate y resolución
- Reiniciar TV para liberar memoria

## 📊 Monitoreo y Mantenimiento

### Logs Importantes:
```
✅ [TV] Autoplay exitoso
🔄 [TV] Intentando reanudar automáticamente...
🧹 [TV] Limpiando video anterior para liberar memoria
```

### Mantenimiento Recomendado:
- **Diario**: Verificar reproducción
- **Semanal**: Limpiar caché del navegador
- **Mensual**: Optimizar videos nuevos
- **Trimestral**: Actualizar firmware de TV

## 🎯 Mejores Prácticas

1. **Contenido**:
   - Videos cortos (30-120 segundos)
   - Resolución consistente (1080p)
   - Bitrate optimizado (≤ 3000k)

2. **Playlist**:
   - Máximo 50 videos por playlist
   - Mezclar videos e imágenes
   - Evitar videos muy largos

3. **Red**:
   - Usar Ethernet cuando sea posible
   - Verificar velocidad regularmente
   - Configurar QoS para priorizar streaming

4. **Hardware**:
   - TV con al menos 2GB RAM
   - Android 7.0 o superior
   - Procesador quad-core mínimo

## 📞 Soporte

Si persisten los problemas:
1. Verificar logs en consola del navegador (F12)
2. Probar con videos optimizados
3. Reiniciar TV y limpiar caché
4. Verificar configuraciones de red

---

**Nota**: Estas optimizaciones están específicamente diseñadas para TVs Android de 65" y deberían resolver los problemas de pausas y transiciones manuales.
