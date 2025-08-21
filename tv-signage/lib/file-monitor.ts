import { watch } from 'fs';
import { readdir, stat } from 'fs/promises';
import { join, extname } from 'path';
import { EventEmitter } from 'events';

interface FileInfo {
  name: string;
  path: string;
  url: string;
  size: number;
  modified: Date;
  type: 'video' | 'image';
}

interface MonitorConfig {
  watchPath: string;
  serverUrl: string;
  allowedExtensions: string[];
}

export class FileMonitor extends EventEmitter {
  private config: MonitorConfig;
  private watcher: any = null;
  private files: Map<string, FileInfo> = new Map();
  private isScanning = false;

  constructor(config: MonitorConfig) {
    super();
    this.config = config;
  }

  /**
   * Iniciar el monitoreo de archivos
   */
  async start(): Promise<void> {
    console.log(`📁 [FileMonitor] Iniciando monitoreo de: ${this.config.watchPath}`);
    
    try {
      // Escaneo inicial
      await this.scanDirectory();
      
      // Configurar watcher (sin recursive para compatibilidad)
      try {
        this.watcher = watch(this.config.watchPath, (eventType, filename) => {
          if (filename) {
            console.log(`📁 [FileMonitor] Cambio detectado: ${eventType} - ${filename}`);
            this.handleFileChange(filename);
          }
        });
        console.log(`👁️ [FileMonitor] Watcher configurado (sin recursivo)`);
      } catch (watchError) {
        console.warn(`⚠️ [FileMonitor] No se pudo configurar watcher automático:`, watchError);
        console.log(`💡 [FileMonitor] Usar rescan manual para detectar cambios`);
      }

      console.log(`✅ [FileMonitor] Monitoreo iniciado exitosamente`);
      this.emit('started');
    } catch (error) {
      console.error(`❌ [FileMonitor] Error al iniciar monitoreo:`, error);
      this.emit('error', error);
    }
  }

  /**
   * Detener el monitoreo
   */
  stop(): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
      console.log(`🛑 [FileMonitor] Monitoreo detenido`);
      this.emit('stopped');
    }
  }

  /**
   * Escanear directorio completo
   */
  private async scanDirectory(): Promise<void> {
    if (this.isScanning) return;
    
    this.isScanning = true;
    console.log(`🔍 [FileMonitor] Escaneando directorio...`);
    
    try {
      const previousFiles = new Map(this.files);
      this.files.clear();

      await this.scanRecursive(this.config.watchPath);

      // Detectar cambios
      const changes = this.detectChanges(previousFiles, this.files);
      
      if (changes.added.length > 0 || changes.removed.length > 0 || changes.modified.length > 0) {
        console.log(`📊 [FileMonitor] Cambios detectados:`, {
          added: changes.added.length,
          removed: changes.removed.length,
          modified: changes.modified.length
        });
        
        this.emit('filesChanged', {
          files: Array.from(this.files.values()),
          changes
        });
      }

      console.log(`✅ [FileMonitor] Escaneo completado: ${this.files.size} archivos encontrados`);
    } catch (error) {
      console.error(`❌ [FileMonitor] Error en escaneo:`, error);
      this.emit('error', error);
    } finally {
      this.isScanning = false;
    }
  }

  /**
   * Escanear directorio recursivamente
   */
  private async scanRecursive(dirPath: string): Promise<void> {
    try {
      const entries = await readdir(dirPath);
      
      for (const entry of entries) {
        const fullPath = join(dirPath, entry);
        const stats = await stat(fullPath);
        
        if (stats.isDirectory()) {
          await this.scanRecursive(fullPath);
        } else if (stats.isFile()) {
          const ext = extname(entry).toLowerCase();
          
          if (this.config.allowedExtensions.includes(ext)) {
            const relativePath = fullPath.replace(this.config.watchPath, '').replace(/^\//, '');
            const fileInfo: FileInfo = {
              name: entry,
              path: fullPath,
              url: `${this.config.serverUrl}/api/files/cass/${encodeURIComponent(relativePath)}`,
              size: stats.size,
              modified: stats.mtime,
              type: this.getFileType(ext)
            };
            
            this.files.set(fullPath, fileInfo);
          }
        }
      }
    } catch (error) {
      console.error(`❌ [FileMonitor] Error escaneando ${dirPath}:`, error);
    }
  }

  /**
   * Manejar cambio de archivo individual
   */
  private async handleFileChange(filename: string): Promise<void> {
    // Debounce para evitar múltiples eventos
    setTimeout(async () => {
      await this.scanDirectory();
    }, 1000);
  }

  /**
   * Detectar cambios entre escaneos
   */
  private detectChanges(previous: Map<string, FileInfo>, current: Map<string, FileInfo>) {
    const added: FileInfo[] = [];
    const removed: FileInfo[] = [];
    const modified: FileInfo[] = [];

    // Archivos añadidos o modificados
    for (const [path, file] of Array.from(current.entries())) {
      const prevFile = previous.get(path);
      if (!prevFile) {
        added.push(file);
      } else if (prevFile.modified.getTime() !== file.modified.getTime()) {
        modified.push(file);
      }
    }

    // Archivos eliminados
    for (const [path, file] of Array.from(previous.entries())) {
      if (!current.has(path)) {
        removed.push(file);
      }
    }

    return { added, removed, modified };
  }

  /**
   * Determinar tipo de archivo
   */
  private getFileType(extension: string): 'video' | 'image' {
    const videoExts = ['.mp4', '.webm', '.ogg', '.avi', '.mov', '.mkv'];
    return videoExts.includes(extension) ? 'video' : 'image';
  }

  /**
   * Obtener lista actual de archivos
   */
  getFiles(): FileInfo[] {
    return Array.from(this.files.values());
  }

  /**
   * Obtener archivos filtrados por tipo
   */
  getFilesByType(type: 'video' | 'image'): FileInfo[] {
    return this.getFiles().filter(file => file.type === type);
  }

  /**
   * Buscar archivo por nombre
   */
  findFile(filename: string): FileInfo | undefined {
    return this.getFiles().find(file => file.name === filename);
  }
}

// Instancia singleton
let fileMonitorInstance: FileMonitor | null = null;

/**
 * Obtener instancia del monitor de archivos
 */
export function getFileMonitor(): FileMonitor {
  if (!fileMonitorInstance) {
    // Determinar la ruta de la carpeta CASS según el sistema operativo
    const { join } = require('path');
    const watchPath = process.platform === 'win32'
      ? join('C:\\Users\\Dev-Uct\\Music')
      : '/home/uct/Música/CASS';

    const config: MonitorConfig = {
      watchPath,
      serverUrl: process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000',
      allowedExtensions: ['.mp4', '.webm', '.ogg', '.avi', '.mov', '.mkv', '.jpg', '.jpeg', '.png', '.gif', '.webp']
    };

    fileMonitorInstance = new FileMonitor(config);
  }

  return fileMonitorInstance;
}

/**
 * Obtener instancia del monitor de archivos de forma segura
 */
export async function getFileMonitorSafe(): Promise<FileMonitor> {
  const monitor = getFileMonitor();

  // Solo inicializar si no está ya iniciado
  if (!monitor.listenerCount('started') && !monitor.listenerCount('error')) {
    await initializeFileMonitor();
  }

  return monitor;
}

/**
 * Inicializar monitor de archivos
 */
export async function initializeFileMonitor(): Promise<FileMonitor> {
  const monitor = getFileMonitor();
  
  if (!monitor.listenerCount('started')) {
    monitor.on('filesChanged', (data) => {
      console.log(`🔄 [FileMonitor] Archivos actualizados: ${data.files.length} total`);
    });
    
    monitor.on('error', (error) => {
      console.error(`❌ [FileMonitor] Error:`, error);
    });
  }
  
  await monitor.start();
  return monitor;
}
