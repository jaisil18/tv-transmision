import { writeFile, mkdir, readdir, stat } from 'fs/promises';
import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { getVideoDuration } from '@/utils/file-metadata';
import { generateVideoThumbnail, getVideoInfo, checkFFmpegAvailability } from '@/utils/thumbnail-generator';
// Auto-refresh y auto-restart funcionalidades removidas para simplificar

const ALLOWED_TYPES = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/gif': ['.gif'],
  'video/mp4': ['.mp4'],
  'video/webm': ['.webm'],
};

/**
 * Sanitiza el nombre del archivo para hacerlo seguro para el sistema de archivos
 */
function sanitizeFileName(fileName: string): string {
  if (!fileName) return '';
  
  try {
    // Decodificar caracteres especiales
    const decodedName = decodeURIComponent(fileName);

    // Obtener la extensión del archivo
    const ext = path.extname(decodedName);
    const nameWithoutExt = path.basename(decodedName, ext);

    // Sanitizar el nombre
    const cleanName = nameWithoutExt
      .normalize('NFD') // Descomponer caracteres acentuados
      .replace(/[\u0300-\u036f]/g, '') // Remover diacríticos
      .replace(/[^a-zA-Z0-9]/g, '-') // Reemplazar caracteres no alfanuméricos con guiones
      .replace(/-+/g, '-') // Reemplazar múltiples guiones con uno solo
      .replace(/^-+|-+$/g, '') // Remover guiones del inicio y final
      .toLowerCase();

    // Agregar timestamp para evitar colisiones
    return `${cleanName}-${Date.now()}${ext.toLowerCase()}`;
  } catch (error) {
    console.error('Error al sanitizar el nombre del archivo:', error);
    // Devolver un nombre de archivo genérico en caso de error
    const ext = path.extname(fileName);
    return `archivo-invalido-${Date.now()}${ext.toLowerCase()}`;
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!request.body) {
      return NextResponse.json(
        { error: 'No se ha proporcionado contenido en la solicitud' },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    const files = formData.getAll('file') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No se han proporcionado archivos' },
        { status: 400 }
      );
    }

    // Validar tipos de archivo
    for (const file of files) {
      if (!Object.keys(ALLOWED_TYPES).includes(file.type)) {
        return NextResponse.json(
          { error: `Tipo de archivo no permitido: ${file.type}` },
          { status: 400 }
        );
      }
    }

    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    const thumbnailDir = path.join(process.cwd(), 'public', 'thumbnails');
    await mkdir(uploadDir, { recursive: true });
    await mkdir(thumbnailDir, { recursive: true });

    // Verificar disponibilidad de ffmpeg
    const ffmpegAvailable = await checkFFmpegAvailability();

    const uploadedFiles = await Promise.all(
      files.map(async (file) => {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Crear un nombre de archivo seguro
        const extension = path.extname(file.name);
        const sanitizedName = sanitizeFileName(file.name);
        const basename = path.basename(sanitizedName, extension);
        const timestamp = Date.now();
        const filename = `${basename}-${timestamp}${extension}`;
        const filePath = path.join(uploadDir, filename);

        await writeFile(filePath, buffer);

        let duration = 0;
        let thumbnailUrl = null;

        if (file.type.startsWith('video/')) {
          try {
            // Obtener información del video
            const videoInfo = await getVideoInfo(filePath);
            duration = videoInfo.duration;

            // Generar miniatura si ffmpeg está disponible
            if (ffmpegAvailable) {
              const thumbnailName = `${basename}-${timestamp}.jpg`;
              const thumbnailPath = path.join(thumbnailDir, thumbnailName);

              try {
                await generateVideoThumbnail({
                  inputPath: filePath,
                  outputPath: thumbnailPath,
                  width: 320,
                  height: 180,
                  quality: 2
                });
                thumbnailUrl = `/thumbnails/${encodeURIComponent(thumbnailName)}`;
                console.log(`✅ [Upload] Miniatura generada: ${thumbnailName}`);
              } catch (thumbnailError) {
                console.error(`❌ [Upload] Error generando miniatura para ${filename}:`, thumbnailError);
              }
            }
          } catch (error) {
            console.error(`Error al procesar el video ${filename}:`, error);
          }
        }

        return {
          name: filename,
          originalName: file.name,
          url: `/uploads/${encodeURIComponent(filename)}`,
          type: file.type,
          size: file.size,
          ...(file.type.startsWith('video/') && { duration }),
          ...(thumbnailUrl && { thumbnail: thumbnailUrl }),
        };
      })
    );

    console.log(`✅ [Upload] Archivos procesados exitosamente: ${uploadedFiles.length}`);

    // Auto-refresh notification removida

    // Auto-restart funcionalidad removida

    return NextResponse.json({ files: uploadedFiles });
  } catch (error) {
    console.error('Error al subir archivos:', error);
    return NextResponse.json(
      { error: 'Error al subir los archivos' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads');

  try {
    const files = await readdir(uploadsDir);
    const fileInfoPromises = files.map((filename) => {
      const filePath = path.join(uploadsDir, filename);
      return stat(filePath).then((stats) => ({
        name: filename,
        originalName: filename,
        url: `/uploads/${encodeURIComponent(filename)}`,
        type:
          path.extname(filename).toLowerCase().startsWith('.mp4')
            ? 'video/mp4'
            : path.extname(filename).toLowerCase().startsWith('.webm')
            ? 'video/webm'
            : 'image/' + path.extname(filename).toLowerCase().slice(1),
        size: stats.size,
      }));
    });

    const filesInfo = await Promise.all(fileInfoPromises);
    return NextResponse.json({ files: filesInfo });
  } catch (error) {
    console.error('Error al listar archivos:', error);
    return NextResponse.json({ files: [] });
  }
}
