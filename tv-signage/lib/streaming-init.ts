import { initializeRTSPServer } from './rtsp-server';
import { initializeHLSServer } from './hls-server';
import { readFileSync, existsSync } from 'fs';
import path from 'path';

// Configuración de streaming
interface StreamingConfig {
  autoStart: boolean;
  enableRTSP: boolean;
  enableHLS: boolean;
  defaultScreens: string[];
  networkDetection: boolean;
}

// Configuración por defecto
const DEFAULT_CONFIG: StreamingConfig = {
  autoStart: true,
  enableRTSP: true,
  enableHLS: true,
  defaultScreens: [],
  networkDetection: true
};

let isInitialized = false;
let streamingConfig: StreamingConfig = DEFAULT_CONFIG;

/**
 * Cargar configuración de streaming desde archivo
 */
function loadStreamingConfig(): StreamingConfig {
  try {
    const configPath = path.join(process.cwd(), 'data', 'streaming-config.json');
    if (existsSync(configPath)) {
      const content = readFileSync(configPath, 'utf-8');
      const config = JSON.parse(content);
      return { ...DEFAULT_CONFIG, ...config };
    }
  } catch (error) {
    console.warn('⚠️ [Streaming Init] No se pudo cargar streaming-config.json, usando configuración por defecto');
  }
  return DEFAULT_CONFIG;
}

/**
 * Obtener pantallas disponibles
 */
function getAvailableScreens(): string[] {
  try {
    const screensPath = path.join(process.cwd(), 'data', 'screens.json');
    if (existsSync(screensPath)) {
      const screensData = JSON.parse(readFileSync(screensPath, 'utf8'));
      return screensData.map((screen: any) => screen.id);
    }
  } catch (error) {
    console.warn('⚠️ [Streaming Init] No se pudieron cargar las pantallas');
  }
  return [];
}

/**
 * Inicializar servicios de streaming
 */
export async function initializeStreamingServices(): Promise<{
  rtsp: boolean;
  hls: boolean;
  config: StreamingConfig;
}> {
  if (isInitialized) {
    console.log('🔄 [Streaming Init] Servicios ya inicializados');
    return {
      rtsp: streamingConfig.enableRTSP,
      hls: streamingConfig.enableHLS,
      config: streamingConfig
    };
  }

  console.log('🚀 [Streaming Init] Inicializando servicios de streaming...');

  // Cargar configuración
  streamingConfig = loadStreamingConfig();
  console.log('⚙️ [Streaming Init] Configuración cargada:', streamingConfig);

  const results = {
    rtsp: false,
    hls: false,
    config: streamingConfig
  };

  // Inicializar RTSP si está habilitado
  if (streamingConfig.enableRTSP) {
    try {
      await initializeRTSPServer();
      results.rtsp = true;
      console.log('✅ [Streaming Init] Servidor RTSP inicializado');
    } catch (error) {
      console.error('❌ [Streaming Init] Error al inicializar RTSP:', error);
    }
  } else {
    console.log('⏭️ [Streaming Init] RTSP deshabilitado en configuración');
  }

  // Inicializar HLS si está habilitado
  if (streamingConfig.enableHLS) {
    try {
      await initializeHLSServer();
      results.hls = true;
      console.log('✅ [Streaming Init] Servidor HLS inicializado');
    } catch (error) {
      console.error('❌ [Streaming Init] Error al inicializar HLS:', error);
    }
  } else {
    console.log('⏭️ [Streaming Init] HLS deshabilitado en configuración');
  }

  // Auto-iniciar streams para pantallas por defecto
  if (streamingConfig.autoStart && (results.rtsp || results.hls)) {
    const screensToStart = streamingConfig.defaultScreens.length > 0 
      ? streamingConfig.defaultScreens 
      : getAvailableScreens();

    if (screensToStart.length > 0) {
      console.log(`🎬 [Streaming Init] Auto-iniciando streams para ${screensToStart.length} pantallas...`);
      
      // Iniciar streams con un pequeño delay para evitar sobrecarga
      for (let i = 0; i < screensToStart.length; i++) {
        const screenId = screensToStart[i];
        setTimeout(async () => {
          try {
            await autoStartScreenStreams(screenId, results);
          } catch (error) {
            console.error(`❌ [Streaming Init] Error al auto-iniciar pantalla ${screenId}:`, error);
          }
        }, i * 1000); // 1 segundo de delay entre cada pantalla (reducido)
      }
    }
  }

  isInitialized = true;
  console.log('🎉 [Streaming Init] Servicios de streaming inicializados exitosamente');

  return results;
}

/**
 * Auto-iniciar streams para una pantalla específica
 */
async function autoStartScreenStreams(screenId: string, services: { rtsp: boolean; hls: boolean }) {
  console.log(`🎬 [Streaming Init] Auto-iniciando streams para pantalla ${screenId}`);

  const promises: Promise<any>[] = [];

  // Iniciar RTSP si está disponible
  if (services.rtsp) {
    promises.push(
      import('./rtsp-server').then(async ({ getRTSPManager }) => {
        try {
          const rtspManager = getRTSPManager();
          await rtspManager.createStream(screenId);
          console.log(`✅ [Streaming Init] RTSP auto-iniciado para pantalla ${screenId}`);
        } catch (error) {
          console.error(`❌ [Streaming Init] Error RTSP auto-inicio pantalla ${screenId}:`, error);
        }
      })
    );
  }

  // Iniciar HLS si está disponible
  if (services.hls) {
    promises.push(
      import('./hls-server').then(async ({ getHLSManager }) => {
        try {
          const hlsManager = getHLSManager();
          await hlsManager.createHLSStream(screenId);
          console.log(`✅ [Streaming Init] HLS auto-iniciado para pantalla ${screenId}`);
        } catch (error) {
          console.error(`❌ [Streaming Init] Error HLS auto-inicio pantalla ${screenId}:`, error);
        }
      })
    );
  }

  // Esperar a que terminen todos los inicios
  if (promises.length > 0) {
    await Promise.allSettled(promises);
  }
}

/**
 * Obtener configuración actual de streaming
 */
export function getStreamingConfig(): StreamingConfig {
  return streamingConfig;
}

/**
 * Verificar si los servicios están inicializados
 */
export function isStreamingInitialized(): boolean {
  return isInitialized;
}

/**
 * Detectar configuración de red para streaming
 */
export async function detectStreamingNetwork(): Promise<{
  serverIp: string;
  serverPort: number;
  rtspPort: number;
  hlsBaseUrl: string;
  interfaces: any[];
}> {
  const { networkInterfaces } = await import('os');
  const interfaces = networkInterfaces();
  const networkInfo: any[] = [];
  
  for (const [interfaceName, addresses] of Object.entries(interfaces)) {
    if (!addresses) continue;
    
    for (const address of addresses) {
      if (address.family === 'IPv4' && !address.internal) {
        networkInfo.push({
          interface: interfaceName,
          address: address.address,
          netmask: address.netmask,
          mac: address.mac
        });
      }
    }
  }

  // Determinar la mejor IP para usar
  const primaryInterface = networkInfo.find(net => 
    net.address.startsWith('192.168.') || 
    net.address.startsWith('10.') || 
    net.address.startsWith('172.')
  ) || networkInfo[0];

  const serverIp = primaryInterface ? primaryInterface.address : 'localhost';
  const serverPort = parseInt(process.env.PORT || '3000');
  const rtspPort = 8554;
  const hlsBaseUrl = `http://${serverIp}:${serverPort}/api/hls`;

  console.log('🌐 [Streaming Init] Configuración de red detectada:', {
    serverIp,
    serverPort,
    rtspPort,
    hlsBaseUrl,
    interfaces: networkInfo.length
  });

  return {
    serverIp,
    serverPort,
    rtspPort,
    hlsBaseUrl,
    interfaces: networkInfo
  };
}

/**
 * Reinicializar servicios de streaming
 */
export async function reinitializeStreamingServices(): Promise<void> {
  console.log('🔄 [Streaming Init] Reinicializando servicios de streaming...');
  
  isInitialized = false;
  await initializeStreamingServices();
}
