import { join } from 'path';

// Configuración de rutas base según el sistema operativo
const PATH_CONFIG = {
  windows: {
    basePath: 'C:\\Users\\Dev-Uct\\Music'
  },
  ubuntu: {
    basePath: '/home/uct/Música'
  }
};

// Detectar sistema operativo (solo para servidor)
function getServerOSConfig() {
  // Solo usar en el servidor
  if (typeof window === 'undefined') {
    const { platform } = require('os');
    const currentPlatform = platform();
    const isWindows = currentPlatform === 'win32';
    
    if (isWindows) {
      console.log('🪟 Sistema operativo detectado: Windows');
      return PATH_CONFIG.windows;
    } else {
      console.log('🐧 Sistema operativo detectado: Ubuntu/Linux');
      return PATH_CONFIG.ubuntu;
    }
  }
  // Fallback para cliente
  return PATH_CONFIG.ubuntu;
}

// Detectar sistema operativo en el cliente
function getClientOSConfig() {
  if (typeof window !== 'undefined') {
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isWindows = userAgent.includes('windows') || userAgent.includes('win32') || userAgent.includes('win64');
    
    if (isWindows) {
      return PATH_CONFIG.windows;
    }
  }
  return PATH_CONFIG.ubuntu;
}

// Exportar configuración actual (solo para servidor)
const currentConfig = getServerOSConfig();

export const BASE_PATH = currentConfig.basePath;
export const MEDIA_BASE_PATH = currentConfig.basePath;
export const MUSIC_BASE_PATH = currentConfig.basePath;

// Función para obtener ruta completa de una carpeta
export function getFolderPath(folderName: string): string {
  return join(BASE_PATH, folderName);
}

// Función para mostrar información de rutas (para cliente)
export function getPathInfo() {
  const config = getClientOSConfig();
  const isWindows = typeof window !== 'undefined' ? 
    window.navigator.userAgent.toLowerCase().includes('windows') : false;
  
  return {
    platform: isWindows ? 'win32' : 'linux',
    isWindows,
    basePath: config.basePath,
    displayPath: config.basePath
  };
}

console.log(`📁 Ruta base configurada: ${BASE_PATH}`);