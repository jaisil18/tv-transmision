import { spawn, ChildProcess } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import path from 'path';
import { promisify } from 'util';
import { exec } from 'child_process';

const execAsync = promisify(exec);

// Importar FFmpeg con configuración mejorada
let ffmpegPath: string;
let ffmpegConfig: any = null;

// Función para cargar configuración de FFmpeg
function loadFFmpegConfig() {
  try {
    const configPath = path.join(process.cwd(), 'ffmpeg-config.json');
    if (existsSync(configPath)) {
      const content = readFileSync(configPath, 'utf-8');
      return JSON.parse(content);
    }
  } catch (error) {
    console.warn('⚠️ [RTSP] No se pudo cargar ffmpeg-config.json');
  }
  return null;
}

// Configurar FFmpeg con verificación de existencia
try {
  // 1. Intentar usar configuración personalizada
  ffmpegConfig = loadFFmpegConfig();
  if (ffmpegConfig && ffmpegConfig.ffmpegPath && existsSync(ffmpegConfig.ffmpegPath)) {
    ffmpegPath = ffmpegConfig.ffmpegPath;
    console.log('🎥 [RTSP] Usando FFmpeg personalizado:', ffmpegPath);
  } else {
    // 2. Intentar usar ffmpeg del sistema PRIMERO (mejor soporte RTSP)
    try {
      // Verificar si ffmpeg del sistema está disponible
      ffmpegPath = 'ffmpeg';
      console.log('🎥 [RTSP] Usando ffmpeg del sistema (soporte RTSP completo)');
    } catch (error) {
      try {
        // 3. Fallback a @ffmpeg-installer/ffmpeg (con carga condicional)
        let ffmpeg: any;
        try {
          ffmpeg = eval('require')('@ffmpeg-installer/ffmpeg');
        } catch {
          ffmpeg = null;
        }

        if (ffmpeg && ffmpeg.path && existsSync(ffmpeg.path)) {
          ffmpegPath = ffmpeg.path;
          console.log('🎥 [RTSP] Usando @ffmpeg-installer/ffmpeg:', ffmpegPath);
        } else {
          throw new Error('FFmpeg installer path not found');
        }
      } catch (error2) {
        try {
          // 4. Último recurso: ffmpeg-static (limitado para RTSP)
          let staticPath: string | null;
          try {
            staticPath = eval('require')('ffmpeg-static');
          } catch {
            staticPath = null;
          }

          if (staticPath && existsSync(staticPath)) {
            ffmpegPath = staticPath;
            console.log('🎥 [RTSP] Usando ffmpeg-static (limitado para RTSP):', ffmpegPath);
          } else {
            throw new Error('No FFmpeg found');
          }
        } catch (error3) {
          ffmpegPath = 'ffmpeg';
          console.log('🎥 [RTSP] Fallback final a ffmpeg del sistema');
        }
      }
    }
  }
} catch (error) {
  ffmpegPath = 'ffmpeg';
  console.log('🎥 [RTSP] Fallback a ffmpeg del sistema');
}

// Función para obtener información real del video usando FFprobe
async function getVideoInfo(filePath: string): Promise<{
  bitrate: number;
  fps: number;
  resolution: string;
  duration: number;
  codec: string;
}> {
  try {
    const ffprobePath = ffmpegPath.replace('ffmpeg', 'ffprobe');

    const { stdout } = await execAsync(`"${ffprobePath}" -v quiet -print_format json -show_format -show_streams "${filePath}"`);
    const info = JSON.parse(stdout);

    const videoStream = info.streams?.find((s: any) => s.codec_type === 'video');
    const format = info.format;

    if (!videoStream) {
      throw new Error('No se encontró stream de video');
    }

    // Extraer información real
    const bitrate = Math.round((parseInt(format.bit_rate) || 2500000) / 1000); // Convertir a kbps
    const fps = eval(videoStream.r_frame_rate) || 30; // Evaluar fracción como 30/1
    const width = videoStream.width || 1920;
    const height = videoStream.height || 1080;
    const duration = parseFloat(format.duration) || 0;
    const codec = videoStream.codec_name || 'h264';

    console.log(`📊 [Video Info] Información real del archivo ${path.basename(filePath)}:`, {
      bitrate: `${bitrate}kbps`,
      fps: `${fps}fps`,
      resolution: `${width}x${height}`,
      duration: `${Math.round(duration)}s`,
      codec
    });

    return {
      bitrate,
      fps: Math.round(fps),
      resolution: `${width}x${height}`,
      duration,
      codec
    };
  } catch (error) {
    console.warn(`⚠️ [Video Info] No se pudo obtener información del video ${filePath}:`, error);
    // Valores por defecto si no se puede obtener la información
    return {
      bitrate: 2500,
      fps: 30,
      resolution: '1920x1080',
      duration: 0,
      codec: 'h264'
    };
  }
}

// Interfaz para el estado del stream RTSP
interface RTSPStreamState {
  screenId: string;
  process: ChildProcess | null;
  status: 'idle' | 'starting' | 'streaming' | 'error' | 'stopped';
  currentContent: {
    name: string;
    url: string;
    type: 'video' | 'image';
    duration?: number;
  } | null;
  playlistInfo: {
    name: string;
    currentIndex: number;
    totalItems: number;
  } | null;
  startTime: number;
  bitrate: number;
  fps: number;
  resolution?: string;
  codec?: string;
}

// Gestor de streams RTSP - SIMPLIFICADO SIN WEBSOCKET
class RTSPStreamManager {
  private streams: Map<string, RTSPStreamState> = new Map();
  private readonly RTSP_PORT_BASE = 8554;

  constructor() {
    console.log('🎥 [RTSP Server] Servidor RTSP inicializado (sin WebSocket)');
  }

  // WebSocket removido para simplificar

  // Crear o actualizar stream para una pantalla
  async createStream(screenId: string): Promise<RTSPStreamState> {
    console.log(`🎬 [RTSP] Creando stream para pantalla ${screenId}`);

    // Obtener contenido actual de la pantalla
    const contentInfo = await this.getScreenContent(screenId);
    if (!contentInfo) {
      throw new Error(`No se encontró contenido para la pantalla ${screenId}`);
    }

    // Detener stream existente si existe
    await this.stopStream(screenId);

    // Obtener información real del archivo si es video
    let videoInfo = null;
    if (contentInfo.currentContent.type === 'video') {
      const contentPath = path.join(process.cwd(), 'public', contentInfo.currentContent.url);
      if (existsSync(contentPath)) {
        videoInfo = await getVideoInfo(contentPath);
      }
    }

    // Crear nuevo estado del stream con información real
    const streamState: RTSPStreamState = {
      screenId,
      process: null,
      status: 'idle',
      currentContent: contentInfo.currentContent,
      playlistInfo: contentInfo.playlistInfo,
      startTime: Date.now(),
      bitrate: videoInfo ? videoInfo.bitrate : (contentInfo.currentContent.type === 'video' ? 2500 : 800),
      fps: videoInfo ? videoInfo.fps : (contentInfo.currentContent.type === 'video' ? 30 : 1),
      resolution: videoInfo?.resolution,
      codec: videoInfo?.codec
    };

    this.streams.set(screenId, streamState);

    // Iniciar el stream
    await this.startStream(screenId);

    return streamState;
  }

  // Iniciar stream RTSP real
  private async startStream(screenId: string): Promise<void> {
    const stream = this.streams.get(screenId);
    if (!stream || !stream.currentContent) {
      throw new Error(`Stream no encontrado para pantalla ${screenId}`);
    }

    console.log(`▶️ [RTSP] Iniciando stream para pantalla ${screenId}`);
    stream.status = 'starting';

    try {
      const contentPath = path.join(process.cwd(), 'public', stream.currentContent.url);

      // Verificar que el archivo existe
      if (!existsSync(contentPath)) {
        throw new Error(`Archivo de contenido no encontrado: ${contentPath}`);
      }

      const rtspUrl = `rtsp://localhost:${this.RTSP_PORT_BASE}/live/screen_${screenId}`;

      // Configurar FFmpeg para crear stream RTSP
      const ffmpegArgs = this.buildFFmpegArgs(contentPath, rtspUrl, stream);

      console.log(`🎥 [RTSP] Ejecutando FFmpeg:`, ffmpegPath, ffmpegArgs.join(' '));

      // Iniciar proceso FFmpeg usando el path correcto
      stream.process = spawn(ffmpegPath, ffmpegArgs);

      // Manejar eventos del proceso
      stream.process.on('spawn', () => {
        console.log(`✅ [RTSP] Stream iniciado para pantalla ${screenId}`);
        stream.status = 'streaming';
      });

      stream.process.on('error', (error) => {
        console.error(`❌ [RTSP] Error en stream ${screenId}:`, error);
        stream.status = 'error';
      });

      stream.process.on('exit', (code) => {
        console.log(`🔚 [RTSP] Stream ${screenId} terminado con código ${code}`);
        stream.status = 'stopped';
        stream.process = null;
      });

      // Capturar logs de FFmpeg
      stream.process.stderr?.on('data', (data) => {
        const log = data.toString();
        if (log.includes('frame=')) {
          // Extraer información de progreso
          this.parseFFmpegProgress(screenId, log);
        }
      });

    } catch (error) {
      console.error(`❌ [RTSP] Error al iniciar stream ${screenId}:`, error);
      stream.status = 'error';
      throw error;
    }
  }

  // Construir argumentos de FFmpeg con valores reales
  private buildFFmpegArgs(inputPath: string, rtspUrl: string, stream: RTSPStreamState): string[] {
    const gopSize = Math.max(Math.round(stream.fps), 15); // GOP size basado en FPS real, mínimo 15
    const maxBitrate = Math.round(stream.bitrate * 1.2); // 20% más que el bitrate base
    const bufferSize = Math.round(stream.bitrate * 2); // Buffer 2x el bitrate

    console.log(`🎛️ [FFmpeg Args] Configuración para pantalla ${stream.screenId}:`, {
      bitrate: `${stream.bitrate}kbps`,
      maxBitrate: `${maxBitrate}kbps`,
      fps: `${stream.fps}fps`,
      gopSize: gopSize,
      bufferSize: `${bufferSize}k`,
      resolution: stream.resolution || 'auto',
      codec: stream.codec || 'auto'
    });

    const args = [
      '-re', // Leer input a velocidad nativa
      '-stream_loop', '-1', // Loop infinito
      '-i', inputPath, // Input file

      // Configuración de video balanceada para calidad y compatibilidad
      '-c:v', 'libx264', // Codec de video H.264
      '-preset', 'fast', // Preset balanceado para rendimiento
      '-tune', 'film', // Optimizar para contenido de video
      '-profile:v', 'main', // Perfil compatible con más dispositivos
      '-level', '4.1', // Nivel compatible
      '-pix_fmt', 'yuv420p', // Formato de pixel compatible

      // Configuración de bitrate balanceada
      '-crf', '23', // Factor de calidad balanceado (23 = buena calidad)
      '-g', gopSize.toString(), // GOP size basado en FPS real
      '-keyint_min', gopSize.toString(), // Intervalo mínimo de keyframes
      '-b:v', `${Math.max(stream.bitrate, 2500)}k`, // Bitrate mínimo razonable
      '-maxrate', `${Math.max(maxBitrate, 4000)}k`, // Bitrate máximo balanceado
      '-bufsize', `${Math.max(bufferSize, 5000)}k`, // Buffer adecuado
      '-r', stream.fps.toString(), // Frame rate real

      // Configuración de audio balanceada
      '-c:a', 'aac', // Codec de audio AAC
      '-b:a', '128k', // Bitrate de audio estándar
      '-ar', '44100', // Sample rate estándar
      '-ac', '2', // Canales estéreo

      // Configuración RTSP
      '-f', 'rtsp', // Formato de salida RTSP
      '-rtsp_transport', 'tcp', // Usar TCP para RTSP (más estable)
      rtspUrl // URL de salida
    ];

    // Configuraciones específicas para imágenes responsive
    if (stream.currentContent?.type === 'image') {
      // Configuración optimizada para imágenes manteniendo responsive
      args.splice(args.indexOf('-r'), 2, '-r', '1'); // 1 FPS para imágenes

      // Filtro de escalado responsive para imágenes
      args.push('-vf', 'scale=-2:min(1080\\,ih):flags=lanczos:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2');

      // Configuraciones adicionales para imágenes estáticas
      args.push('-loop', '1'); // Loop de imagen

      // Ajustar bitrate para imágenes responsive
      const imageIndex = args.findIndex(arg => arg.includes('k') && args[args.indexOf(arg) - 1] === '-b:v');
      if (imageIndex !== -1) {
        args[imageIndex] = `${Math.max(stream.bitrate, 1500)}k`; // Bitrate moderado para imágenes
      }
    }

    return args;
  }

  // Parsear progreso de FFmpeg para obtener estadísticas reales
  private parseFFmpegProgress(screenId: string, log: string) {
    const stream = this.streams.get(screenId);
    if (!stream) return;

    // Extraer información real de frame, fps, bitrate, tiempo, etc.
    const frameMatch = log.match(/frame=\s*(\d+)/);
    const fpsMatch = log.match(/fps=\s*([\d.]+)/);
    const bitrateMatch = log.match(/bitrate=\s*([\d.]+)kbits\/s/);
    const timeMatch = log.match(/time=(\d{2}):(\d{2}):(\d{2}\.\d{2})/);
    const speedMatch = log.match(/speed=\s*([\d.]+)x/);

    let hasUpdates = false;

    if (frameMatch || fpsMatch || bitrateMatch || timeMatch || speedMatch) {
      // Actualizar estadísticas reales del stream
      if (fpsMatch) {
        const newFps = Math.round(parseFloat(fpsMatch[1]));
        if (newFps !== stream.fps) {
          stream.fps = newFps;
          hasUpdates = true;
        }
      }

      if (bitrateMatch) {
        const newBitrate = Math.round(parseFloat(bitrateMatch[1]));
        if (newBitrate !== stream.bitrate) {
          stream.bitrate = newBitrate;
          hasUpdates = true;
        }
      }

      // Log de estadísticas reales cada cierto tiempo
      if (hasUpdates) {
        console.log(`📊 [RTSP Stats] Pantalla ${screenId} - FPS: ${stream.fps}, Bitrate: ${stream.bitrate}kbps`);
      }
    }
  }

  // Función para broadcast removida (sin WebSocket)
  private broadcastStreamStatus(screenId: string) {
    // Esta función se mantiene para compatibilidad pero no hace nada
    // ya que removimos WebSocket para simplificar
  }

  // Detener stream
  async stopStream(screenId: string): Promise<void> {
    const stream = this.streams.get(screenId);
    if (!stream) return;

    console.log(`⏹️ [RTSP] Deteniendo stream para pantalla ${screenId}`);

    if (stream.process) {
      stream.process.kill('SIGTERM');
      stream.process = null;
    }

    stream.status = 'stopped';
  }

  // Obtener contenido actual de la pantalla
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

      // Obtener el índice actual del contenido basado en tiempo real (sincronizado)
      const currentTime = Date.now();
      const rotationInterval = 30000; // 30 segundos por defecto (sincronizado con la pantalla)
      const currentIndex = Math.floor((currentTime / rotationInterval) % playlist.items.length);
      const currentContent = playlist.items[currentIndex];

      console.log(`📺 [RTSP] Contenido actual calculado para pantalla ${screenId}:`, {
        content: currentContent.name,
        index: `${currentIndex + 1}/${playlist.items.length}`,
        playlist: playlist.name,
        timestamp: new Date(currentTime).toLocaleTimeString()
      });

      return {
        currentContent: {
          name: currentContent.name,
          url: currentContent.url,
          type: currentContent.type,
          duration: currentContent.duration
        },
        playlistInfo: {
          name: playlist.name,
          currentIndex: currentIndex,
          totalItems: playlist.items.length
        }
      };

    } catch (error) {
      console.error(`❌ [RTSP] Error al obtener contenido para pantalla ${screenId}:`, error);
      return null;
    }
  }

  // WebSocket removido - funciones de broadcast eliminadas

  // Obtener estado del stream
  getStreamState(screenId: string): RTSPStreamState | null {
    return this.streams.get(screenId) || null;
  }

  // Obtener todos los streams
  getAllStreams(): Map<string, RTSPStreamState> {
    return this.streams;
  }

  // Limpiar recursos
  async cleanup() {
    console.log('🧹 [RTSP] Limpiando recursos del servidor RTSP');

    const screenIds = Array.from(this.streams.keys());
    for (const screenId of screenIds) {
      await this.stopStream(screenId);
    }
  }
}

// Instancia singleton del gestor RTSP
let rtspManagerInstance: RTSPStreamManager | null = null;

// Función para obtener la instancia singleton del gestor RTSP
export function getRTSPManager(): RTSPStreamManager {
  if (!rtspManagerInstance) {
    rtspManagerInstance = new RTSPStreamManager();
  }
  return rtspManagerInstance;
}

// Función para inicializar el servidor RTSP (solo una vez)
export async function initializeRTSPServer() {
  if (!rtspManagerInstance) {
    console.log('🚀 [RTSP] Inicializando servidor RTSP...');
    rtspManagerInstance = new RTSPStreamManager();
    console.log('✅ [RTSP] Servidor RTSP inicializado exitosamente');
  } else {
    console.log('🔄 [RTSP] Servidor RTSP ya inicializado, reutilizando instancia');
  }
  return rtspManagerInstance;
}

// Función para limpiar al cerrar la aplicación
process.on('SIGINT', async () => {
  console.log('🛑 [RTSP] Cerrando servidor RTSP...');
  if (rtspManagerInstance) {
    await rtspManagerInstance.cleanup();
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🛑 [RTSP] Cerrando servidor RTSP...');
  if (rtspManagerInstance) {
    await rtspManagerInstance.cleanup();
  }
  process.exit(0);
});
