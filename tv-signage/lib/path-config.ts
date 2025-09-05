import { join } from 'path';

// Importaciones condicionales para servidor
let homedir: () => string;
let userInfo: () => { username: string };
let platform: () => string;
let existsSync: (path: string) => boolean;
let mkdirSync: (path: string, options?: any) => void;

// Solo importar módulos de Node.js en el servidor
if (typeof window === 'undefined') {
  const os = require('os');
  const fs = require('fs');
  
  homedir = os.homedir;
  userInfo = os.userInfo;
  platform = os.platform;
  existsSync = fs.existsSync;
  mkdirSync = fs.mkdirSync;
} else {
  // Fallbacks para el cliente
  homedir = () => '/home/user';
  userInfo = () => ({ username: 'user' });
  platform = () => 'linux';
  existsSync = () => false;
  mkdirSync = () => {};
}

/**
 * Configuración portable de rutas para TV Signage
 * Se adapta automáticamente a diferentes usuarios y sistemas operativos
 */

// Función para obtener la ruta base automáticamente
function getAutoBasePath(): string {
  // 1. Prioridad: Variable de entorno personalizada
  if (process.env.TV_SIGNAGE_MEDIA_PATH) {
    console.log('📁 Usando ruta personalizada desde variable de entorno:', process.env.TV_SIGNAGE_MEDIA_PATH);
    return process.env.TV_SIGNAGE_MEDIA_PATH;
  }

  // 2. Detectar usuario y sistema automáticamente
  try {
    const currentUser = userInfo().username;
    const homeDirectory = homedir();
    const currentPlatform = platform();
    
    console.log(`👤 Usuario detectado: ${currentUser}`);
    console.log(`🏠 Directorio home: ${homeDirectory}`);
    console.log(`💻 Plataforma: ${currentPlatform}`);

    let basePath: string;
    
    if (currentPlatform === 'win32') {
      // Windows: usar carpeta Music del usuario actual
      basePath = join(homeDirectory, 'Music', 'tv-signage-media');
    } else {
      // Linux/Ubuntu: usar carpeta Música del usuario actual
      basePath = join(homeDirectory, 'Música', 'tv-signage-media');
    }

    console.log(`📁 Ruta base calculada: ${basePath}`);
    return basePath;
    
  } catch (error) {
    console.warn('⚠️ Error al detectar usuario/sistema:', error);
    
    // 3. Fallback: usar carpeta del proyecto
    const projectFallback = join(process.cwd(), 'media-storage');
    console.log(`📁 Usando fallback del proyecto: ${projectFallback}`);
    return projectFallback;
  }
}

// Función para asegurar que la carpeta existe
function ensureDirectoryExists(path: string): string {
  try {
    if (!existsSync(path)) {
      console.log(`📁 Creando directorio: ${path}`);
      mkdirSync(path, { recursive: true });
      console.log(`✅ Directorio creado exitosamente`);
    } else {
      console.log(`✅ Directorio ya existe: ${path}`);
    }
    return path;
  } catch (error) {
    console.error(`❌ Error al crear directorio ${path}:`, error);
    
    // Fallback final: usar carpeta temporal del proyecto
    const tempPath = join(process.cwd(), 'temp-media');
    console.log(`📁 Usando directorio temporal: ${tempPath}`);
    
    try {
      if (!existsSync(tempPath)) {
        mkdirSync(tempPath, { recursive: true });
      }
      return tempPath;
    } catch (finalError) {
      console.error(`❌ Error crítico al crear directorio temporal:`, finalError);
      throw new Error('No se pudo crear ningún directorio para almacenar archivos');
    }
  }
}

// Detectar sistema operativo (solo para servidor)
function getServerOSConfig() {
  if (typeof window === 'undefined') {
    const currentPlatform = platform();
    const isWindows = currentPlatform === 'win32';
    
    if (isWindows) {
      console.log('🪟 Sistema operativo detectado: Windows');
    } else {
      console.log('🐧 Sistema operativo detectado: Ubuntu/Linux');
    }
    
    return {
      platform: currentPlatform,
      isWindows,
      basePath: getAutoBasePath()
    };
  }
  
  // Fallback para cliente
  return {
    platform: 'linux',
    isWindows: false,
    basePath: '/tmp/tv-signage-fallback'
  };
}

// Detectar sistema operativo en el cliente
function getClientOSConfig() {
  if (typeof window !== 'undefined') {
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isWindows = userAgent.includes('windows') || userAgent.includes('win32') || userAgent.includes('win64');
    
    return {
      platform: isWindows ? 'win32' : 'linux',
      isWindows,
      basePath: isWindows ? 'C:\\Users\\[usuario]\\Music\\tv-signage-media' : '/home/[usuario]/Música/tv-signage-media'
    };
  }
  
  return {
    platform: 'linux',
    isWindows: false,
    basePath: '/home/[usuario]/Música/tv-signage-media'
  };
}

// Configuración actual (solo para servidor)
const currentConfig = getServerOSConfig();
const basePath = ensureDirectoryExists(currentConfig.basePath);

// Exportar rutas configuradas
export const BASE_PATH = basePath;
export const MEDIA_BASE_PATH = basePath;
export const MUSIC_BASE_PATH = basePath;

// Función para obtener ruta completa de una carpeta
export function getFolderPath(folderName: string): string {
  const fullPath = join(BASE_PATH, folderName);
  
  // Asegurar que la carpeta existe cuando se solicita
  try {
    if (!existsSync(fullPath)) {
      mkdirSync(fullPath, { recursive: true });
      console.log(`📁 Carpeta creada: ${fullPath}`);
    }
  } catch (error) {
    console.error(`❌ Error al crear carpeta ${fullPath}:`, error);
  }
  
  return fullPath;
}

// Función para mostrar información de rutas (para cliente)
export function getPathInfo() {
  const config = getClientOSConfig();
  
  return {
    platform: config.platform,
    isWindows: config.isWindows,
    basePath: config.basePath,
    displayPath: config.basePath,
    currentUser: typeof window === 'undefined' ? userInfo().username : '[usuario]',
    homeDir: typeof window === 'undefined' ? homedir() : '[directorio-home]'
  };
}

// Función para verificar configuración
export function verifyPathConfiguration(): { success: boolean; message: string; details: any } {
  try {
    const config = {
      basePath: BASE_PATH,
      exists: existsSync(BASE_PATH),
      platform: platform(),
      user: userInfo().username,
      homeDir: homedir(),
      envVar: process.env.TV_SIGNAGE_MEDIA_PATH || 'No configurada'
    };
    
    return {
      success: true,
      message: 'Configuración de rutas verificada correctamente',
      details: config
    };
  } catch (error) {
    return {
      success: false,
      message: 'Error al verificar configuración de rutas',
      details: { error: error instanceof Error ? error.message : 'Error desconocido' }
    };
  }
}

console.log(`📁 Ruta base configurada: ${BASE_PATH}`);
console.log(`👤 Usuario: ${typeof window === 'undefined' ? userInfo().username : '[cliente]'}`);
console.log(`💻 Plataforma: ${currentConfig.platform}`);