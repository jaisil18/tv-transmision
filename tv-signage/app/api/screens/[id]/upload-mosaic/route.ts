import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

// Función para determinar si un archivo es una imagen
function isImageFile(filename: string): boolean {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
  const ext = path.extname(filename).toLowerCase();
  return imageExtensions.includes(ext);
}

// Función para determinar si un archivo es un video
function isVideoFile(filename: string): boolean {
  const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov'];
  const ext = path.extname(filename).toLowerCase();
  return videoExtensions.includes(ext);
}

// Función para obtener la posición del mosaico basado en el nombre del archivo
function getMosaicoPosition(filename: string): number {
  const lowercaseName = filename.toLowerCase();
  if (lowercaseName.includes('mosaico1') || lowercaseName.includes('mosaic1') || 
      lowercaseName.includes('mosaico_1') || lowercaseName.includes('mosaic_1')) {
    return 1;
  } else if (lowercaseName.includes('mosaico2') || lowercaseName.includes('mosaic2') || 
             lowercaseName.includes('mosaico_2') || lowercaseName.includes('mosaic_2')) {
    return 2;
  }
  // Por defecto, asignar al mosaico 1
  return 1;
}

// Función para obtener la duración de la imagen desde el nombre del archivo
function getImageDuration(filename: string): number | undefined {
  // Buscar patrones como "5s" o "10sec" en el nombre del archivo
  const durationMatch = filename.match(/[_-](\d+)s(?:ec)?[_-]/i);
  if (durationMatch && durationMatch[1]) {
    return parseInt(durationMatch[1], 10);
  }
  return undefined;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: screenId } = await params;
    const url = new URL(request.url);
    const positionParam = url.searchParams.get('position');
    const forcedPosition = positionParam ? parseInt(positionParam, 10) : null;
    
    const formData = await request.formData();
    
    const files = formData.getAll('files') as File[];
    
    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No se encontraron archivos' }, { status: 400 });
    }

    // Crear directorio de mosaicos si no existe
    const mosaicsDir = path.join(process.cwd(), 'public', 'content', 'mosaics', screenId);
    if (!existsSync(mosaicsDir)) {
      await mkdir(mosaicsDir, { recursive: true });
    }
    
    // Crear subdirectorios para cada mosaico
    const mosaico1Dir = path.join(mosaicsDir, 'mosaico1');
    const mosaico2Dir = path.join(mosaicsDir, 'mosaico2');
    if (!existsSync(mosaico1Dir)) {
      await mkdir(mosaico1Dir, { recursive: true });
    }
    if (!existsSync(mosaico2Dir)) {
      await mkdir(mosaico2Dir, { recursive: true });
    }

    const uploadedFiles = [];

    for (const file of files) {
      if (!file.name) continue;

      // Validar tipo de archivo
      if (!isImageFile(file.name) && !isVideoFile(file.name)) {
        return NextResponse.json({ 
          error: `Tipo de archivo no soportado: ${file.name}. Solo se permiten imágenes (JPG, PNG, GIF) y videos (MP4, WEBM).` 
        }, { status: 400 });
      }

      // Validar tamaño (50MB máximo)
      if (file.size > 50 * 1024 * 1024) {
        return NextResponse.json({ 
          error: `El archivo ${file.name} es demasiado grande. Tamaño máximo: 50MB.` 
        }, { status: 400 });
      }

      // Determinar propiedades del archivo
      const position = forcedPosition || getMosaicoPosition(file.name);
      
      // Generar nombre único para evitar conflictos
      const timestamp = Date.now();
      const fileExtension = path.extname(file.name);
      const baseName = path.basename(file.name, fileExtension);
      const uniqueFileName = `${baseName}_${timestamp}${fileExtension}`;
      
      // Determinar el directorio según la posición
      const targetDir = position === 2 ? path.join(mosaicsDir, 'mosaico2') : path.join(mosaicsDir, 'mosaico1');
      const filePath = path.join(targetDir, uniqueFileName);
      
      // Convertir archivo a buffer y guardarlo
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      
      await writeFile(filePath, buffer);
      
      // Determinar propiedades adicionales del archivo
      const type = isImageFile(file.name) ? 'image' : 'video';
      const duration = type === 'image' ? getImageDuration(file.name) : undefined;
      
      // Construir URL según la posición
      const subDir = position === 2 ? 'mosaico2' : 'mosaico1';
      
      uploadedFiles.push({
        name: uniqueFileName,
        originalName: file.name,
        type,
        position,
        duration,
        size: file.size,
        // Usar API de video para archivos de video, ruta directa para imágenes
        const isVideo = file.type.startsWith('video/');
        url: isVideo 
          ? `/api/video/content/mosaics/${screenId}/${subDir}/${uniqueFileName}`
          : `/content/mosaics/${screenId}/${subDir}/${uniqueFileName}`
      });
    }

    return NextResponse.json({ 
      success: true, 
      message: `${uploadedFiles.length} archivo(s) subido(s) correctamente`,
      files: uploadedFiles
    });

  } catch (error) {
    console.error('Error al subir archivos de mosaico:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor al subir archivos' 
    }, { status: 500 });
  }
}