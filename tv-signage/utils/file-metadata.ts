import { spawn } from 'child_process';
import path from 'path';
import { promises as fs } from 'fs';

export const CONTENT_TYPES = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
} as const;

export async function getVideoDuration(filePath: string): Promise<number> {
  try {
    return await new Promise<number>((resolve, reject) => {
      const ffprobe = spawn('ffprobe', [
        '-v',
        'error',
        '-show_entries',
        'format=duration',
        '-of',
        'default=noprint_wrappers=1:nokey=1',
        filePath
      ]);

      let output = '';
      let error = '';

      ffprobe.stdout.on('data', (data) => {
        output += data.toString();
      });

      ffprobe.stderr.on('data', (data) => {
        error += data.toString();
      });

      ffprobe.on('close', (code) => {
        if (code !== 0) {
          console.error('Error FFprobe:', error);
          reject(new Error(`FFprobe error: ${error}`));
        } else {
          const duration = parseFloat(output.trim());
          if (isNaN(duration)) {
            reject(new Error('Invalid duration value'));
          } else {
            resolve(duration);
          }
        }
      });

      ffprobe.on('error', (err) => {
        reject(new Error(`Failed to spawn FFprobe: ${err.message}`));
      });
    });
  } catch (error) {
    console.error('Error getting video duration:', error);
    return 0;
  }
}

export async function getFileInfo(filename: string, uploadsDir: string) {
  try {
    const filePath = path.join(uploadsDir, filename);
    const stats = await fs.stat(filePath);
    const ext = path.extname(filename).toLowerCase();
    const type = Object.entries(CONTENT_TYPES).find(([extension]) =>
      extension.toLowerCase() === ext
    )?.[1] || 'application/octet-stream';

    let duration = 0;
    if (type.startsWith('video/')) {
      try {
        duration = await getVideoDuration(filePath);
      } catch (error) {
        console.error(`Error al obtener duración para ${filename}:`, error);
      }
    }

    return {
      name: filename,
      originalName: filename,
      url: `/uploads/${encodeURIComponent(filename)}`,
      type: type,
      size: stats.size,
      duration: type.startsWith('video/') ? duration : undefined
    };
  } catch (error) {
    console.error(`Error al procesar el archivo ${filename}:`, error);
    return null;
  }
}
