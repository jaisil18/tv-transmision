import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

// Tipos para los elementos de mosaico
interface MosaicoItem {
  id: string;
  name: string;
  url: string;
  type: string; // "image" o "video"
  position: number; // 1 para Mosaico 1, 2 para Mosaico 2
  duration?: number; // duración en segundos para imágenes
}

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
  return undefined; // Usar el valor por defecto
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const screenId = params.id;
    
    // Verificar que el ID de la pantalla sea válido
    if (!screenId) {
      return NextResponse.json({ error: 'ID de pantalla no válido' }, { status: 400 });
    }
    
    // Ruta a la carpeta de mosaicos para esta pantalla
    const mosaicoFolderPath = path.join(process.cwd(), 'public', 'content', 'mosaics', screenId);
    
    // Verificar si la carpeta existe
    if (!fs.existsSync(mosaicoFolderPath)) {
      // Si no existe, crear la carpeta y subdirectorios
      fs.mkdirSync(mosaicoFolderPath, { recursive: true });
      fs.mkdirSync(path.join(mosaicoFolderPath, 'mosaico1'), { recursive: true });
      fs.mkdirSync(path.join(mosaicoFolderPath, 'mosaico2'), { recursive: true });
      console.log(`Carpeta de mosaicos creada para la pantalla ${screenId}: ${mosaicoFolderPath}`);
      
      // Devolver una lista vacía ya que la carpeta acaba de ser creada
      return NextResponse.json([]);
    }
    
    const mosaicoItems: MosaicoItem[] = [];
    
    // Leer archivos de mosaico1
    const mosaico1Path = path.join(mosaicoFolderPath, 'mosaico1');
    if (fs.existsSync(mosaico1Path)) {
      const mosaico1Files = fs.readdirSync(mosaico1Path);
      mosaico1Files
        .filter(file => isImageFile(file) || isVideoFile(file))
        .forEach(file => {
          const fileType = isImageFile(file) ? 'image' : 'video';
          const duration = fileType === 'image' ? getImageDuration(file) || 5 : undefined;
          
          const isVideo = fileType === 'video';
          const fileUrl = isVideo 
            ? `/api/video/content/mosaics/${screenId}/mosaico1/${encodeURIComponent(file)}`
            : `/content/mosaics/${screenId}/mosaico1/${encodeURIComponent(file)}`;
          
          mosaicoItems.push({
            id: uuidv4(),
            name: file,
            url: fileUrl,
            type: fileType,
            position: 1,
            duration
          });
        });
    }
    
    // Leer archivos de mosaico2
    const mosaico2Path = path.join(mosaicoFolderPath, 'mosaico2');
    if (fs.existsSync(mosaico2Path)) {
      const mosaico2Files = fs.readdirSync(mosaico2Path);
      mosaico2Files
        .filter(file => isImageFile(file) || isVideoFile(file))
        .forEach(file => {
          const fileType = isImageFile(file) ? 'image' : 'video';
          const duration = fileType === 'image' ? getImageDuration(file) || 5 : undefined;
          
          const isVideo = fileType === 'video';
          const fileUrl = isVideo 
            ? `/api/video/content/mosaics/${screenId}/mosaico2/${encodeURIComponent(file)}`
            : `/content/mosaics/${screenId}/mosaico2/${encodeURIComponent(file)}`;
          
          mosaicoItems.push({
            id: uuidv4(),
            name: file,
            url: fileUrl,
            type: fileType,
            position: 2,
            duration
          });
        });
    }
    
    // También leer archivos en la carpeta raíz (para compatibilidad con archivos antiguos)
    const rootFiles = fs.readdirSync(mosaicoFolderPath).filter(item => {
      const itemPath = path.join(mosaicoFolderPath, item);
      return fs.statSync(itemPath).isFile() && (isImageFile(item) || isVideoFile(item));
    });
    
    rootFiles.forEach(file => {
      const fileType = isImageFile(file) ? 'image' : 'video';
      const position = getMosaicoPosition(file); // Para archivos antiguos, usar la lógica del nombre
      const duration = fileType === 'image' ? getImageDuration(file) || 5 : undefined;
      
      const isVideo = fileType === 'video';
      const fileUrl = isVideo 
        ? `/api/video/content/mosaics/${screenId}/${encodeURIComponent(file)}`
        : `/content/mosaics/${screenId}/${encodeURIComponent(file)}`;
      
      mosaicoItems.push({
        id: uuidv4(),
        name: file,
        url: fileUrl,
        type: fileType,
        position,
        duration
      });
    });
    
    console.log(`Elementos de mosaico encontrados para la pantalla ${screenId}: ${mosaicoItems.length}`);
    
    return NextResponse.json(mosaicoItems);
  } catch (error) {
    console.error('Error al obtener elementos de mosaico:', error);
    return NextResponse.json(
      { error: 'Error al obtener elementos de mosaico' },
      { status: 500 }
    );
  }
}