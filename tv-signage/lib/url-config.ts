// Configuración dinámica de URLs para el sistema

interface NetworkConfig {
  serverUrl: string;
  serverPort: number;
  heartbeatInterval: number;
  connectionTimeout: number;
  lastUpdated: number;
  requiresRestart: boolean;
}

interface URLConfig {
  baseUrl: string;
  apiUrl: string;
  rtspUrl: string;
  hlsUrl: string;
  screenUrl: string;
  adminUrl: string;
  currentPort: number;
  detectedPort: number;
}

// Cache para evitar lecturas frecuentes del archivo
let urlConfigCache: URLConfig | null = null;
let lastCacheUpdate = 0;
const CACHE_DURATION = 5000; // 5 segundos

/**
 * Detectar el puerto actual del servidor
 */
function detectCurrentPort(): number {
  // Intentar obtener el puerto de variables de entorno
  if (process.env.PORT) {
    return parseInt(process.env.PORT);
  }
  
  // Intentar obtener el puerto de Next.js
  if (typeof window !== 'undefined') {
    const port = window.location.port;
    if (port) {
      return parseInt(port);
    }
  }
  
  // Fallback al puerto por defecto
  return 3000;
}

/**
 * Cargar configuración de red desde API (solo en cliente)
 */
async function loadNetworkConfig(): Promise<NetworkConfig | null> {
  if (typeof window === 'undefined') {
    // En el servidor, usar valores por defecto
    return null;
  }

  try {
    const response = await fetch('/api/system/network');
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.warn('⚠️ No se pudo cargar configuración de red desde API');
  }
  return null;
}

/**
 * Cargar configuración de settings desde API (solo en cliente)
 */
async function loadSettings(): Promise<any> {
  if (typeof window === 'undefined') {
    // En el servidor, usar valores por defecto
    return null;
  }

  try {
    const response = await fetch('/api/settings');
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.warn('⚠️ No se pudo cargar settings desde API');
  }
  return null;
}

/**
 * Generar configuración de URLs dinámica
 */
export function getURLConfig(forceRefresh = false): URLConfig {
  const now = Date.now();

  // Usar cache si está disponible y no ha expirado
  if (!forceRefresh && urlConfigCache && (now - lastCacheUpdate) < CACHE_DURATION) {
    return urlConfigCache;
  }

  // Detectar puerto actual
  const detectedPort = detectCurrentPort();

  // Determinar el puerto a usar (simplificado para evitar async)
  let currentPort = detectedPort;

  // Determinar la URL base
  let baseUrl = 'http://localhost';

  // Si estamos en el navegador, usar la URL actual
  if (typeof window !== 'undefined') {
    baseUrl = `${window.location.protocol}//${window.location.hostname}`;
    currentPort = parseInt(window.location.port) || 3000;
  } else {
    // En el servidor, intentar detectar la IP real
    try {
      const os = require('os');
      const networkInterfaces = os.networkInterfaces();

      // Buscar la primera interfaz de red válida (no localhost)
      for (const interfaceName of Object.keys(networkInterfaces)) {
        const interfaces = networkInterfaces[interfaceName] || [];
        for (const iface of interfaces) {
          if (iface.family === 'IPv4' && !iface.internal) {
            // Preferir IPs privadas comunes
            if (iface.address.startsWith('192.168.') ||
                iface.address.startsWith('10.') ||
                iface.address.startsWith('172.')) {
              baseUrl = `http://${iface.address}`;
              break;
            }
          }
        }
        if (baseUrl !== 'http://localhost') break;
      }
    } catch (error) {
      console.warn('⚠️ [URL Config] No se pudo detectar IP del servidor, usando localhost');
    }
  }

  // Construir URLs completas
  const fullBaseUrl = `${baseUrl}:${currentPort}`;

  // Para RTSP, usar la misma IP que baseUrl pero sin el puerto HTTP
  const rtspHost = baseUrl.replace('http://', '').replace('https://', '');

  const config: URLConfig = {
    baseUrl: fullBaseUrl,
    apiUrl: `${fullBaseUrl}/api`,
    rtspUrl: `rtsp://${rtspHost}:8554`, // Puerto RTSP usando la IP real
    hlsUrl: `${fullBaseUrl}/api/hls`, // URL base para HLS
    screenUrl: `${fullBaseUrl}/screen`,
    adminUrl: `${fullBaseUrl}/admin`,
    currentPort,
    detectedPort
  };

  // Actualizar cache
  urlConfigCache = config;
  lastCacheUpdate = now;

  console.log('🌐 [URL Config] Configuración actualizada:', {
    baseUrl: config.baseUrl,
    currentPort: config.currentPort,
    detectedPort: config.detectedPort
  });

  return config;
}

/**
 * Obtener URL completa para una pantalla específica
 */
export function getScreenURL(screenId: string): string {
  const config = getURLConfig();
  return `${config.screenUrl}/${screenId}`;
}

/**
 * Obtener URL del stream RTSP para una pantalla específica
 */
export function getRTSPStreamURL(screenId: string): string {
  const config = getURLConfig();
  return `${config.rtspUrl}/live/screen_${screenId}`;
}

/**
 * Obtener URL del stream HLS para una pantalla específica
 */
export function getHLSStreamURL(screenId: string): string {
  const config = getURLConfig();
  return `${config.hlsUrl}/${screenId}`;
}

/**
 * Obtener URL base de HLS
 */
export function getHLSBaseURL(): string {
  const config = getURLConfig();
  return config.hlsUrl;
}

/**
 * Obtener URL base para archivos multimedia
 * Esta función asegura que las URLs funcionen tanto con localhost como con IP del servidor
 */
export function getMediaBaseURL(): string {
  const config = getURLConfig();
  return config.baseUrl;
}

/**
 * Construir URL completa para un archivo multimedia
 */
export function buildMediaURL(relativePath: string): string {
  const baseUrl = getMediaBaseURL();
  // Normalizar rutas de Windows a formato web (convertir \ a /)
  const normalizedPath = relativePath.replace(/\\/g, '/');
  return `${baseUrl}/api/files/media/${encodeURIComponent(normalizedPath)}`;
}



/**
 * Obtener URL de la API para una pantalla específica
 */
export function getScreenAPIURL(screenId: string, endpoint = ''): string {
  const config = getURLConfig();
  const base = `${config.apiUrl}/screens/${screenId}`;
  return endpoint ? `${base}/${endpoint}` : base;
}

/**
 * Invalidar cache de configuración
 */
export function invalidateURLCache(): void {
  urlConfigCache = null;
  lastCacheUpdate = 0;
  console.log('🗑️ [URL Config] Cache invalidado');
}

/**
 * Hook para React que proporciona configuración de URLs
 */
export function useURLConfig() {
  if (typeof window === 'undefined') {
    // En el servidor, usar configuración estática
    return getURLConfig();
  }
  
  // En el cliente, actualizar cuando cambie la URL
  const config = getURLConfig();
  
  return {
    ...config,
    refresh: () => getURLConfig(true),
    invalidate: invalidateURLCache
  };
}
