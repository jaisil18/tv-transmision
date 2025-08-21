// Inicialización del servidor RTSP y HLS
import { initializeRTSPServer } from './rtsp-server';
import { initializeStreamingServices } from './streaming-init';

let rtspServerInitialized = false;

export async function ensureRTSPServer() {
  if (!rtspServerInitialized) {
    console.log('🚀 [RTSP] Inicializando servidor RTSP...');
    try {
      await initializeRTSPServer();
      rtspServerInitialized = true;
      console.log('✅ [RTSP] Servidor RTSP inicializado exitosamente');
    } catch (error) {
      console.error('❌ [RTSP] Error al inicializar servidor RTSP:', error);
      throw error;
    }
  }
  return rtspServerInitialized;
}

// Nueva función para inicializar todos los servicios de streaming
export async function ensureStreamingServices() {
  console.log('🚀 [Streaming] Inicializando servicios de streaming completos...');
  try {
    const result = await initializeStreamingServices();
    console.log('✅ [Streaming] Servicios de streaming inicializados:', result);
    return result;
  } catch (error) {
    console.error('❌ [Streaming] Error al inicializar servicios de streaming:', error);
    throw error;
  }
}
