import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';

const execAsync = promisify(exec);

export interface ThumbnailOptions {
  inputPath: string;
  outputPath: string;
  timeOffset?: string; // Tiempo en formato "00:00:05" para capturar la miniatura
  width?: number;
  height?: number;
  quality?: number; // 1-31, menor número = mejor calidad
}

/**
 * Genera una miniatura de un video usando ffmpeg
 */
export async function generateVideoThumbnail(options: ThumbnailOptions): Promise<string> {
  const {
    inputPath,
    outputPath,
    timeOffset = '00:00:02', // Capturar a los 2 segundos por defecto
    width = 320,
    height = 180,
    quality = 2
  } = options;

  console.log(`🎬 [Thumbnail] Generando miniatura para: ${path.basename(inputPath)}`);

  try {
    // Verificar que el archivo de entrada existe
    await fs.access(inputPath);

    // Crear directorio de salida si no existe
    const outputDir = path.dirname(outputPath);
    await fs.mkdir(outputDir, { recursive: true });

    // Comando ffmpeg para generar miniatura
    const command = [
      'ffmpeg',
      '-i', `"${inputPath}"`,
      '-ss', timeOffset,
      '-vframes', '1',
      '-vf', `"scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:black"`,
      '-q:v', quality.toString(),
      '-y', // Sobrescribir archivo existente
      `"${outputPath}"`
    ].join(' ');

    console.log(`🔧 [Thumbnail] Ejecutando: ${command}`);

    const { stdout, stderr } = await execAsync(command);
    
    if (stderr && !stderr.includes('frame=')) {
      console.warn(`⚠️ [Thumbnail] Advertencia ffmpeg:`, stderr);
    }

    // Verificar que se generó la miniatura
    await fs.access(outputPath);
    const stats = await fs.stat(outputPath);
    
    if (stats.size === 0) {
      throw new Error('La miniatura generada está vacía');
    }

    console.log(`✅ [Thumbnail] Miniatura generada exitosamente: ${path.basename(outputPath)} (${stats.size} bytes)`);
    return outputPath;

  } catch (error) {
    console.error(`❌ [Thumbnail] Error generando miniatura:`, error);
    
    // Intentar con un tiempo diferente si falló
    if (timeOffset === '00:00:02') {
      console.log(`🔄 [Thumbnail] Reintentando con tiempo 00:00:01...`);
      return generateVideoThumbnail({
        ...options,
        timeOffset: '00:00:01'
      });
    }
    
    // Si falla, generar una miniatura por defecto
    return generateDefaultThumbnail(outputPath, width, height);
  }
}

/**
 * Genera una miniatura por defecto cuando no se puede extraer del video
 */
async function generateDefaultThumbnail(outputPath: string, width: number, height: number): Promise<string> {
  console.log(`🎨 [Thumbnail] Generando miniatura por defecto...`);
  
  try {
    // Crear una imagen negra con texto usando ffmpeg
    const command = [
      'ffmpeg',
      '-f', 'lavfi',
      '-i', `"color=black:size=${width}x${height}:duration=1"`,
      '-vf', `"drawtext=text='VIDEO':fontcolor=white:fontsize=24:x=(w-text_w)/2:y=(h-text_h)/2"`,
      '-vframes', '1',
      '-y',
      `"${outputPath}"`
    ].join(' ');

    await execAsync(command);
    console.log(`✅ [Thumbnail] Miniatura por defecto generada`);
    return outputPath;
    
  } catch (error) {
    console.error(`❌ [Thumbnail] Error generando miniatura por defecto:`, error);
    throw new Error('No se pudo generar ninguna miniatura');
  }
}

/**
 * Obtiene información básica de un video
 */
export async function getVideoInfo(videoPath: string) {
  try {
    const command = `ffprobe -v quiet -print_format json -show_format -show_streams "${videoPath}"`;
    const { stdout } = await execAsync(command);
    const info = JSON.parse(stdout);
    
    const videoStream = info.streams?.find((s: any) => s.codec_type === 'video');
    const duration = parseFloat(info.format?.duration || '0');
    
    return {
      duration,
      width: videoStream?.width || 0,
      height: videoStream?.height || 0,
      codec: videoStream?.codec_name || 'unknown',
      bitrate: parseInt(info.format?.bit_rate || '0'),
      fps: videoStream?.r_frame_rate ? eval(videoStream.r_frame_rate) : 0
    };
  } catch (error) {
    console.error(`❌ [VideoInfo] Error obteniendo información del video:`, error);
    return {
      duration: 0,
      width: 0,
      height: 0,
      codec: 'unknown',
      bitrate: 0,
      fps: 0
    };
  }
}

/**
 * Verifica si ffmpeg está disponible
 */
export async function checkFFmpegAvailability(): Promise<boolean> {
  try {
    await execAsync('ffmpeg -version');
    console.log(`✅ [FFmpeg] FFmpeg está disponible`);
    return true;
  } catch (error) {
    console.error(`❌ [FFmpeg] FFmpeg no está disponible:`, error);
    return false;
  }
}
