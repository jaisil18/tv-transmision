# 📺 TV transmission - Sistema de Transmisión Digital

Sistema de Transmisión digital para gestionar y reproducir contenido multimedia en múltiples pantallas de forma centralizada. Desarrollado con Next.js, TypeScript y tecnologías modernas.

## 🚀 Características Principales

### 📱 Gestión de Pantallas
- **Múltiples tipos de dispositivos**: Android TV, tablets Android, navegadores web
- **Control remoto centralizado**: Gestión desde panel de administración
- **Estado en tiempo real**: Monitoreo del estado de conexión y reproducción
- **Configuración automática de red**: Detección automática de IP y configuración
- **URLs dinámicas**: Adaptación automática a diferentes redes sin hardcodear IPs

### 🎬 Reproducción Multimedia
- **Formatos soportados**: MP4, WebM, JPG, PNG, GIF
- **Streaming HLS**: Transmisión optimizada para múltiples dispositivos
- **Listas de reproducción**: Programación de contenido con horarios
- **Transiciones suaves**: Animaciones optimizadas con Framer Motion
- **Manejo robusto de errores**: Sistema inteligente de reintentos y recuperación
- **Optimización para Android TV**: Configuración específica para hardware limitado

### 🔧 Panel de Administración
- **Gestión de contenido**: Subida, organización y eliminación de archivos
- **Programación**: Scheduler avanzado para contenido por horarios
- **Analytics**: Dashboard con estadísticas de reproducción
- **Diagnóstico de red**: Herramientas de troubleshooting integradas
- **TypeScript completo**: Tipado estricto para mayor robustez

### 🌐 Conectividad
- **WebSocket en tiempo real**: Comunicación bidireccional instantánea
- **API REST completa**: Endpoints para todas las funcionalidades
- **Configuración automática**: Scripts para setup de red automático
- **Soporte multi-red**: Adaptación automática a diferentes entornos
- **Compatibilidad de red mejorada**: Funciona en diferentes VLANs y configuraciones

## ✨ Mejoras Recientes (v2024.1)

### 🔧 Optimizaciones para Android TV
- **Manejo de errores mejorado**: Sistema inteligente de clasificación y recuperación de errores
- **Reintentos incrementales**: Delays progresivos (5s, 10s, 15s) para errores de red
- **Gestión de memoria**: Limpieza automática de buffers y garbage collection
- **Configuración específica**: Propiedades optimizadas para hardware de TV
- **Preload inteligente**: Carga anticipada solo de metadatos del siguiente video

### 🌐 URLs Dinámicas
- **Detección automática de host**: No más IPs hardcodeadas en el código
- **Adaptación de red**: Funciona automáticamente en diferentes redes
- **Compatibilidad mejorada**: Soporte para proxies y configuraciones complejas
- **Logging detallado**: Información completa de URLs generadas para debugging

### 🛡️ Robustez de Código
- **TypeScript estricto**: Eliminación completa de tipos 'any' y 'unknown'
- **Type guards**: Validación segura de tipos en runtime
- **Error handling**: Manejo consistente de errores en toda la aplicación
- **Prevención de bucles**: Lógica mejorada para evitar reintentos infinitos

## 📋 Requisitos del Sistema

### Software Requerido
- **Node.js** 18 o superior
- **FFmpeg** (para procesamiento de video y metadata)
- **Sistema operativo**: Windows, macOS, Linux

### Instalación de FFmpeg

**Windows:**
```bash
# Opción 1: Instalación automática
npm run install-ffmpeg

# Opción 2: Manual
# 1. Descargar desde https://www.gyan.dev/ffmpeg/builds/
# 2. Extraer y agregar bin/ al PATH del sistema
```

**macOS:**
```bash
brew install ffmpeg
```

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install ffmpeg
```

**Verificar instalación:**
```bash
ffprobe -version
ffmpeg -version
```

## 🛠️ Instalación y Configuración

### 1. Clonar e Instalar
```bash
git clone <repository-url>
cd tv-signage
npm install
```

### 2. Configuración Automática de Red
```bash
# Configuración completa inicial
npm run setup-network

# Actualización rápida de IP (cambio de red)
npm run update-network
```

### 3. Iniciar el Servidor
```bash
# Desarrollo
npm run dev

# Producción
npm run build
npm start
```

### 4. Acceso al Sistema
- **Aplicación principal**: http://localhost:3000
- **Panel de administración**: http://localhost:3000/admin
- **API**: http://localhost:3000/api

### 5. Credenciales por Defecto
```
Usuario: admin
Contraseña: admin12345
```

> ⚠️ **Importante**: Cambia la contraseña por defecto después del primer acceso por seguridad.

## 📁 Estructura del Proyecto

```
tv-signage/
├── app/                    # Aplicación Next.js (App Router)
│   ├── admin/             # Panel de administración
│   ├── android-tv/        # Interfaz para Android TV
│   ├── api/               # API Routes
│   └── screen/            # Interfaces de pantalla
├── components/            # Componentes React reutilizables
│   ├── animations/        # Componentes de animación
│   ├── ui/               # Componentes de interfaz
│   └── analytics/        # Dashboard de analytics
├── hooks/                 # Custom React Hooks
├── lib/                   # Utilidades y configuración
├── services/              # Servicios de datos
├── scripts/               # Scripts de automatización
├── data/                  # Archivos de configuración JSON
├── public/                # Archivos estáticos
└── docs/                  # Documentación
```

## 🎯 Scripts Disponibles

### Desarrollo
```bash
npm run dev              # Servidor de desarrollo
npm run build            # Build de producción
npm run start            # Servidor de producción
npm run lint             # Linting del código
```

### Red y Configuración
```bash
npm run setup-network    # Configuración inicial completa
npm run update-network   # Actualizar IP automáticamente
```

### Multimedia y Optimización
```bash
npm run install-ffmpeg   # Instalar FFmpeg (Windows)
npm run optimize-videos  # Optimizar videos para Android TV
npm run regenerate-thumbnails  # Regenerar miniaturas
```

### Mantenimiento
```bash
npm run clean-playlists  # Limpiar listas de reproducción
npm run reset-admin      # Resetear contraseña de admin
npm run unlock-admin     # Desbloquear cuenta de admin
```

### Testing y Diagnóstico
```bash
npm run test             # Ejecutar tests
npm run check-server     # Verificar estado del servidor
npm run check-streaming  # Verificar streaming HLS
```

## 🔧 Configuración Avanzada

### Variables de Entorno
Crea un archivo `.env.local`:
```env
NEXT_PUBLIC_SERVER_URL=http://localhost:3000
NEXT_PUBLIC_WS_URL=ws://localhost:3000
NODE_ENV=development
```

### Configuración de Red
Los archivos de configuración se actualizan automáticamente:
- `data/settings.json` - Configuración general
- `data/network-config.json` - Configuración de red
- `next.config.js` - Configuración de Next.js

### Personalización de Pantallas
```json
// data/screens.json
{
  "screens": [
    {
      "id": "screen-1",
      "name": "Pantalla Principal",
      "type": "android-tv",
      "resolution": "1920x1080",
      "location": "Lobby"
    }
  ]
}
```

## 📱 Uso del Sistema

### Para Administradores
1. Acceder al panel de administración: `/admin`
2. Subir contenido multimedia
3. Crear listas de reproducción
4. Asignar contenido a pantallas
5. Monitorear estado en tiempo real

### Para Pantallas
1. Navegar a `/screen/[id]` o `/android-tv/[screenId]`
2. El contenido se reproduce automáticamente
3. Actualizaciones en tiempo real vía WebSocket

## 🔍 Troubleshooting

### Problemas Comunes

**Error de conexión de red:**
```bash
npm run update-network
# Reiniciar el servidor
```

**Problemas específicos de Android TV:**
```bash
# Verificar URLs dinámicas en logs del servidor
# Buscar mensajes: "🌐 [Android TV Stream] Usando URL base"

# Si persisten errores de reproducción:
# 1. Verificar que la TV esté en la misma red
# 2. Comprobar que el puerto 3000 esté accesible
# 3. Revisar logs de errores detallados en consola
```

**FFmpeg no encontrado:**
```bash
# Windows
npm run install-ffmpeg

# Verificar instalación
ffprobe -version
```

**Problemas de streaming:**
```bash
npm run check-streaming
npm run optimize-videos
```

**Errores de TypeScript:**
```bash
# Verificar tipos
npm run lint

# Rebuild completo
npm run build
```

**Reset completo:**
```bash
npm run clean-playlists
npm run setup-network
npm run dev
```

### Logs y Diagnóstico
- Logs del servidor: Consola de desarrollo
- Estado de pantallas: Panel de administración
- Diagnóstico de red: `/admin/network-diagnosis`
- API de salud: `/api/health`

## 🏗️ Arquitectura Técnica

### Stack Tecnológico
- **Frontend**: Next.js 14, React 18, TypeScript (estricto)
- **Styling**: Tailwind CSS, Framer Motion
- **Backend**: Next.js API Routes, Node.js
- **Tiempo Real**: WebSockets, Server-Sent Events
- **Multimedia**: FFmpeg, HLS Streaming, Video optimizado
- **Testing**: Jest, React Testing Library
- **Networking**: URLs dinámicas, detección automática de host

### Patrones de Diseño
- **Clean Architecture**: Separación de responsabilidades
- **Repository Pattern**: Acceso a datos centralizado
- **Observer Pattern**: Actualizaciones en tiempo real
- **Factory Pattern**: Creación de componentes dinámicos
- **Error Handling Pattern**: Manejo robusto con reintentos inteligentes
- **Type Safety Pattern**: TypeScript estricto con type guards

### Optimizaciones Específicas
- **Android TV**: Configuración de hardware limitado, gestión de memoria
- **Network Resilience**: URLs adaptables, detección automática de red
- **Error Recovery**: Sistema de reintentos incrementales y clasificación de errores
- **Performance**: Preload inteligente, limpieza automática de buffers

## 📚 Documentación Adicional

- [Configuración de Red](docs/NETWORK_CONFIGURATION.md)
- [Optimización para Android TV](docs/ANDROID_TV_OPTIMIZATION.md)

## 🤝 Contribución

1. Fork del proyecto
2. Crear rama de feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit de cambios (`git commit -m 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Crear Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 🆘 Soporte

Para soporte técnico o reportar bugs:
1. Revisar la documentación en `/docs`
2. Ejecutar diagnósticos: `npm run check-server`
3. Crear un issue en el repositorio
