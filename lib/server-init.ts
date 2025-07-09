// Inicialización del servidor - Solo se ejecuta en el servidor
// Streaming services removidos
import { initializeFileMonitor } from './file-monitor';

let serverInitialized = false;

/**
 * Inicializar servicios del servidor
 * Esta función se ejecuta automáticamente cuando se importa en el servidor
 */
export async function initializeServer() {
  // Solo ejecutar en el servidor
  if (typeof window !== 'undefined') {
    return;
  }

  if (serverInitialized) {
    console.log('🔄 [Server Init] Servidor ya inicializado');
    return;
  }

  console.log('🚀 [Server Init] Inicializando servidor...');

  try {
    // Verificar carpeta CASS
    const cassExists = await verifyCassDirectory();

    // Inicializar monitor de archivos CASS solo si la carpeta existe
    if (cassExists) {
      console.log('📁 [Server Init] Inicializando monitor de archivos CASS...');
      try {
        await initializeFileMonitor();
        console.log('✅ [Server Init] Monitor de archivos CASS iniciado');
      } catch (error) {
        console.error('❌ [Server Init] Error al inicializar monitor CASS:', error);
      }
    }

    // Servicios de streaming removidos

    serverInitialized = true;
    console.log('🎉 [Server Init] Servidor inicializado exitosamente');

  } catch (error) {
    console.error('❌ [Server Init] Error al inicializar servidor:', error);
    // No lanzar error para evitar que falle el inicio del servidor
  }
}

/**
 * Verificar si el servidor está inicializado
 */
export function isServerInitialized(): boolean {
  return serverInitialized;
}

/**
 * Verificar que la carpeta CASS existe
 */
async function verifyCassDirectory(): Promise<boolean> {
  const { access } = await import('fs/promises');
  const { constants } = await import('fs');
  const { join } = await import('path');

  // Determinar la ruta de la carpeta CASS según el sistema operativo
  const cassPath = process.platform === 'win32'
    ? join('C:\\Users\\Dev-Uct\\Music')
    : '/home/uct/Música';

  try {
    await access(cassPath, constants.F_OK | constants.R_OK);
    console.log(`✅ [Server Init] Carpeta CASS accesible: ${cassPath}`);
    return true;
  } catch (error) {
    console.error(`❌ [Server Init] Carpeta CASS no accesible:`, error);
    console.log(`💡 [Server Init] Asegúrate de que la carpeta ${cassPath} existe y tiene permisos de lectura`);
    return false;
  }
}

// Auto-inicializar cuando se importa este módulo en el servidor
if (typeof window === 'undefined') {
  // Usar setTimeout para evitar bloquear el inicio
  setTimeout(() => {
    initializeServer().catch(error => {
      console.error('❌ [Server Init] Error en auto-inicialización:', error);
    });
  }, 1000); // Esperar 1 segundo después del inicio
}
