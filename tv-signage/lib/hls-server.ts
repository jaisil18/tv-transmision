import { spawn, ChildProcess } from 'child_process';
import { readFileSync, existsSync, mkdirSync, readdirSync, unlinkSync, statSync } from 'fs';
import path from 'path';
import { promisify } from 'util';
import { exec } from 'child_process';

const execAsync = promisify(exec);

// Configuración de FFmpeg (reutilizar del rtsp-server)
let ffmpegPath: string;

// Función para cargar configuración de FFmpeg
function loadFFmpegConfig() {
  try {
    const configPath = path.join(process.cwd(), 'ffmpeg-config.json');
    if (existsSync(configPath)) {
      const content = readFileSync(configPath, 'utf-8');
      return JSON.parse(content);
    }
  } catch (error) {
    console.warn('⚠️ [HLS] No se pudo cargar ffmpeg-config.json');
  }
  return null;
}

// Configurar FFmpeg
try {
  const ffmpegConfig = loadFFmpegConfig();
  if (ffmpegConfig && ffmpegConfig.ffmpegPath && existsSync(ffmpegConfig.ffmpegPath)) {
    ffmpegPath = ffmpegConfig.ffmpegPath;
    console.log('🎥 [HLS] Usando FFmpeg personalizado:', ffmpegPath);
  } else {
    try {
      ffmpegPath = 'ffmpeg';
      console.log('🎥 [HLS] Usando ffmpeg del sistema');
    } catch (error) {
      try {
        let ffmpeg: any;
        try {
          ffmpeg = eval('require')('@ffmpeg-installer/ffmpeg');
        } catch {
          ffmpeg = null;
        }
        if (ffmpeg && ffmpeg.path && existsSync(ffmpeg.path)) {
          ffmpegPath = ffmpeg.path;
          console.log('🎥 [HLS] Usando @ffmpeg-installer/ffmpeg:', ffmpegPath);
        } else {
          throw new Error('FFmpeg installer path not found');
        }
      } catch (error2) {
        try {
          let staticPath: string | null;
          try {
            staticPath = eval('require')('ffmpeg-static');
          } catch {
            staticPath = null;
          }
          if (staticPath && existsSync(staticPath)) {
            ffmpegPath = staticPath;
            console.log('🎥 [HLS] Usando ffmpeg-static:', ffmpegPath);
          } else {
            throw new Error('No FFmpeg found');
          }
        } catch (error3) {
          ffmpegPath = 'ffmpeg';
          console.log('🎥 [HLS] Fallback a ffmpeg del sistema');
        }
      }
    }
  }
} catch (error) {
  ffmpegPath = 'ffmpeg';
  console.log('🎥 [HLS] Fallback a ffmpeg del sistema');
}

// Interfaz para el estado del stream HLS
interface HLSStreamState {
  screenId: string;
  process: ChildProcess | null;
  status: 'idle' | 'starting' | 'streaming' | 'error' | 'stopped';
  outputDir: string;
  playlistPath: string;
  currentContent: {
    name: string;
    url: string;
    type: 'video' | 'image';
    duration?: number;
  } | null;
  startTime: number;
  lastSegmentTime: number;
  segmentCount: number;
}

// Gestor de streams HLS
class HLSStreamManager {
  private streams: Map<string, HLSStreamState> = new Map();
  private readonly HLS_OUTPUT_DIR = path.join(process.cwd(), 'public', 'hls');
  private readonly SEGMENT_DURATION = 2; // 2 segundos por segmento
  private readonly PLAYLIST_SIZE = 10; // Máximo 10 segmentos en playlist
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    console.log('🎬 [HLS Server] Servidor HLS inicializado');
    
    // Crear directorio de salida HLS si no existe
    if (!existsSync(this.HLS_OUTPUT_DIR)) {
      mkdirSync(this.HLS_OUTPUT_DIR, { recursive: true });
      console.log('📁 [HLS] Directorio HLS creado:', this.HLS_OUTPUT_DIR);
    }

    // Iniciar limpieza automática cada 30 segundos
    this.startCleanupInterval();
  }

  // Crear stream HLS para una pantalla
  async createHLSStream(screenId: string): Promise<HLSStreamState> {
    console.log(`🎬 [HLS] Creando stream HLS para pantalla ${screenId}`);

    // Obtener contenido actual de la pantalla
    const contentInfo = await this.getScreenContent(screenId);
    if (!contentInfo) {
      throw new Error(`No se encontró contenido para la pantalla ${screenId}`);
    }

    // Detener stream existente si existe
    await this.stopHLSStream(screenId);

    // Crear directorio específico para la pantalla
    const outputDir = path.join(this.HLS_OUTPUT_DIR, screenId);
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }

    const playlistPath = path.join(outputDir, 'playlist.m3u8');

    // Crear nuevo estado del stream
    const streamState: HLSStreamState = {
      screenId,
      process: null,
      status: 'idle',
      outputDir,
      playlistPath,
      currentContent: contentInfo.currentContent,
      startTime: Date.now(),
      lastSegmentTime: Date.now(),
      segmentCount: 0
    };

    this.streams.set(screenId, streamState);

    // Iniciar el stream HLS
    await this.startHLSStream(screenId);

    return streamState;
  }

  // Iniciar stream HLS
  private async startHLSStream(screenId: string): Promise<void> {
    const stream = this.streams.get(screenId);
    if (!stream || !stream.currentContent) {
      throw new Error(`Stream HLS no encontrado para pantalla ${screenId}`);
    }

    console.log(`▶️ [HLS] Iniciando stream HLS para pantalla ${screenId}`);
    stream.status = 'starting';

    try {
      const contentPath = path.join(process.cwd(), 'public', stream.currentContent.url);

      // Verificar que el archivo existe
      if (!existsSync(contentPath)) {
        throw new Error(`Archivo de contenido no encontrado: ${contentPath}`);
      }

      // Construir argumentos de FFmpeg para HLS
      const ffmpegArgs = this.buildHLSFFmpegArgs(contentPath, stream);

      console.log(`🎥 [HLS] Ejecutando FFmpeg:`, ffmpegPath, ffmpegArgs.join(' '));

      // Iniciar proceso FFmpeg
      stream.process = spawn(ffmpegPath, ffmpegArgs);

      // Manejar eventos del proceso
      stream.process.on('spawn', () => {
        console.log(`✅ [HLS] Stream HLS iniciado para pantalla ${screenId}`);
        stream.status = 'streaming';
      });

      stream.process.on('error', (error) => {
        console.error(`❌ [HLS] Error en stream HLS ${screenId}:`, error);
        stream.status = 'error';
      });

      stream.process.on('exit', (code) => {
        console.log(`🔚 [HLS] Stream HLS ${screenId} terminado con código ${code}`);
        stream.status = 'stopped';
        stream.process = null;
      });

      // Capturar logs de FFmpeg
      stream.process.stderr?.on('data', (data) => {
        const log = data.toString();
        if (log.includes('segment')) {
          stream.lastSegmentTime = Date.now();
          stream.segmentCount++;
        }
      });

    } catch (error) {
      console.error(`❌ [HLS] Error al iniciar stream HLS ${screenId}:`, error);
      stream.status = 'error';
      throw error;
    }
  }

  // Construir argumentos de FFmpeg para HLS optimizado para web y móvil
  private buildHLSFFmpegArgs(inputPath: string, stream: HLSStreamState): string[] {
    const outputPattern = path.join(stream.outputDir, 'segment_%03d.ts');
    const playlistPath = stream.playlistPath;

    const args = [
      '-re', // Leer input a velocidad nativa
      '-stream_loop', '-1', // Loop infinito
      '-i', inputPath, // Input file
      
      // Configuración de video optimizada para calidad y compatibilidad
      '-c:v', 'libx264', // Codec de video H.264
      '-preset', 'fast', // Preset balanceado para calidad y rendimiento
      '-tune', 'film', // Optimizar para contenido de video
      '-profile:v', 'main', // Perfil compatible con más dispositivos
      '-level', '4.1', // Nivel compatible con la mayoría de dispositivos
      '-pix_fmt', 'yuv420p', // Formato de pixel compatible

      // Configuración de bitrate adaptativo
      '-b:v', '3000k', // Bitrate balanceado para calidad y compatibilidad
      '-maxrate', '4000k', // Bitrate máximo razonable
      '-bufsize', '6000k', // Buffer adecuado
      '-crf', '23', // Factor de calidad balanceado (23 = buena calidad)
      '-g', '60', // GOP size estándar
      '-keyint_min', '30', // Intervalo mínimo de keyframes
      '-sc_threshold', '0', // Desactivar detección de cambio de escena

      // Filtros para mantener proporción responsive
      '-vf', 'scale=-2:min(1080\\,ih):flags=lanczos', // Escalar manteniendo proporción hasta HD
      
      // Configuración de audio de alta calidad
      '-c:a', 'aac', // Codec de audio AAC
      '-b:a', '320k', // Bitrate de audio alto para máxima calidad
      '-ar', '48000', // Sample rate profesional (48kHz)
      '-ac', '2', // Canales estéreo
      '-aac_coder', 'twoloop', // Codificador AAC de alta calidad
      
      // Configuración HLS específica
      '-f', 'hls', // Formato HLS
      '-hls_time', this.SEGMENT_DURATION.toString(), // Duración de segmento
      '-hls_list_size', this.PLAYLIST_SIZE.toString(), // Tamaño de playlist
      '-hls_flags', 'delete_segments+append_list', // Flags HLS
      '-hls_segment_filename', outputPattern, // Patrón de nombres de segmento
      '-hls_allow_cache', '1', // Permitir cache
      '-hls_segment_type', 'mpegts', // Tipo de segmento
      
      playlistPath // Archivo de playlist de salida
    ];

    // Configuraciones específicas para imágenes responsive
    if (stream.currentContent?.type === 'image') {
      // Configuración optimizada para imágenes manteniendo responsive
      const imageIndex = args.indexOf('-b:v');
      args.splice(imageIndex, 2, '-b:v', '2000k'); // Bitrate moderado para imágenes
      args.splice(args.indexOf('-g'), 2, '-g', '30'); // GOP menor para imágenes

      // Filtro de escalado responsive para imágenes
      const vfIndex = args.indexOf('-vf');
      if (vfIndex !== -1) {
        args.splice(vfIndex, 2, '-vf', 'scale=-2:min(1080\\,ih):flags=lanczos:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2');
      } else {
        args.push('-vf', 'scale=-2:min(1080\\,ih):flags=lanczos:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2');
      }

      // Configuraciones adicionales para imágenes estáticas
      args.push('-r', '2'); // Frame rate bajo para imágenes
      args.push('-loop', '1'); // Loop de imagen
    }

    return args;
  }

  // Detener stream HLS
  async stopHLSStream(screenId: string): Promise<void> {
    const stream = this.streams.get(screenId);
    if (!stream) return;

    console.log(`⏹️ [HLS] Deteniendo stream HLS para pantalla ${screenId}`);

    if (stream.process) {
      stream.process.kill('SIGTERM');
      stream.process = null;
    }

    stream.status = 'stopped';
  }

  // Obtener contenido actual de la pantalla (reutilizar lógica del rtsp-server)
  private async getScreenContent(screenId: string) {
    try {
      // Leer datos de pantallas
      const screensPath = path.join(process.cwd(), 'data', 'screens.json');
      const screensData = JSON.parse(readFileSync(screensPath, 'utf8'));
      const screen = screensData.find((s: any) => s.id === screenId);

      if (!screen) {
        throw new Error(`Pantalla ${screenId} no encontrada`);
      }

      // Leer playlists
      const playlistsPath = path.join(process.cwd(), 'data', 'playlists.json');
      const playlistsData = JSON.parse(readFileSync(playlistsPath, 'utf8'));
      const playlist = playlistsData.find((p: any) => p.screens && p.screens.includes(screenId));

      if (!playlist || !playlist.items || playlist.items.length === 0) {
        throw new Error(`No hay contenido asignado a la pantalla ${screenId}`);
      }

      // Obtener el índice actual del contenido basado en tiempo real
      const currentTime = Date.now();
      const rotationInterval = 30000; // 30 segundos por defecto
      const currentIndex = Math.floor((currentTime / rotationInterval) % playlist.items.length);
      const currentContent = playlist.items[currentIndex];

      console.log(`📺 [HLS] Contenido actual para pantalla ${screenId}:`, {
        content: currentContent.name,
        index: `${currentIndex + 1}/${playlist.items.length}`,
        playlist: playlist.name
      });

      return {
        currentContent: {
          name: currentContent.name,
          url: currentContent.url,
          type: currentContent.type,
          duration: currentContent.duration
        }
      };

    } catch (error) {
      console.error(`❌ [HLS] Error al obtener contenido para pantalla ${screenId}:`, error);
      return null;
    }
  }

  // Limpiar segmentos antiguos automáticamente
  private startCleanupInterval() {
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldSegments();
    }, 30000); // Limpiar cada 30 segundos
  }

  // Limpiar segmentos antiguos
  private cleanupOldSegments() {
    try {
      const now = Date.now();
      const maxAge = 60000; // 1 minuto

      const streamEntries = Array.from(this.streams.entries());
      for (const [screenId, stream] of streamEntries) {
        if (!existsSync(stream.outputDir)) continue;

        const files = readdirSync(stream.outputDir);

        for (const file of files) {
          if (file.endsWith('.ts')) {
            const filePath = path.join(stream.outputDir, file);
            const stats = statSync(filePath);

            if (now - stats.mtime.getTime() > maxAge) {
              try {
                unlinkSync(filePath);
                console.log(`🗑️ [HLS] Segmento antiguo eliminado: ${file}`);
              } catch (error) {
                console.warn(`⚠️ [HLS] No se pudo eliminar segmento: ${file}`);
              }
            }
          }
        }
      }
    } catch (error) {
      console.warn('⚠️ [HLS] Error durante limpieza de segmentos:', error);
    }
  }

  // Obtener estado del stream HLS
  getHLSStreamState(screenId: string): HLSStreamState | null {
    return this.streams.get(screenId) || null;
  }

  // Obtener todos los streams HLS
  getAllHLSStreams(): Map<string, HLSStreamState> {
    return this.streams;
  }

  // Verificar si existe playlist para una pantalla
  hasPlaylist(screenId: string): boolean {
    const stream = this.streams.get(screenId);
    return stream ? existsSync(stream.playlistPath) : false;
  }

  // Obtener ruta del playlist
  getPlaylistPath(screenId: string): string | null {
    const stream = this.streams.get(screenId);
    return stream ? stream.playlistPath : null;
  }

  // Limpiar recursos
  async cleanup() {
    console.log('🧹 [HLS] Limpiando recursos del servidor HLS');

    // Detener interval de limpieza
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    // Detener todos los streams
    const screenIds = Array.from(this.streams.keys());
    for (const screenId of screenIds) {
      await this.stopHLSStream(screenId);
    }
  }
}

// Instancia singleton del gestor HLS
let hlsManagerInstance: HLSStreamManager | null = null;

// Función para obtener la instancia singleton del gestor HLS
export function getHLSManager(): HLSStreamManager {
  if (!hlsManagerInstance) {
    hlsManagerInstance = new HLSStreamManager();
  }
  return hlsManagerInstance;
}

// Función para inicializar el servidor HLS
export async function initializeHLSServer() {
  if (!hlsManagerInstance) {
    console.log('🚀 [HLS] Inicializando servidor HLS...');
    hlsManagerInstance = new HLSStreamManager();
    console.log('✅ [HLS] Servidor HLS inicializado exitosamente');
  } else {
    console.log('🔄 [HLS] Servidor HLS ya inicializado, reutilizando instancia');
  }
  return hlsManagerInstance;
}

// Función para limpiar al cerrar la aplicación
process.on('SIGINT', async () => {
  if (hlsManagerInstance) {
    await hlsManagerInstance.cleanup();
  }
});

process.on('SIGTERM', async () => {
  if (hlsManagerInstance) {
    await hlsManagerInstance.cleanup();
  }
});
