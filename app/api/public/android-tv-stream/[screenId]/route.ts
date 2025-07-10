import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

interface StreamItem {
  id: string;
  name: string;
  streamUrl: string;
  type: 'video';
  duration: number;
  folder: string;
  fileSize: number;
  mimeType: string;
  // Metadatos para optimización
  preload: 'none' | 'metadata' | 'auto';
  priority: 'high' | 'normal' | 'low';
}

interface AndroidTVPlaylist {
  screenId: string;
  playlistName: string;
  currentItem: StreamItem;
  nextItem?: StreamItem;
  totalItems: number;
  currentIndex: number;
  isLooping: boolean;
  streamingOptimized: true;
  androidTVConfig: {
    bufferSize: string;
    preloadStrategy: string;
    memoryManagement: string;
    autoAdvance: boolean;
    crossfade: boolean;
  };
}

// GET /api/public/android-tv-stream/[screenId] - Streaming optimizado para Android TV
export async function GET(
  request: Request,
  { params }: { params: Promise<{ screenId: string }> }
) {
  const { screenId } = await params;
  const url = new URL(request.url);
  const currentIndex = parseInt(url.searchParams.get('index') || '0');

  try {
    console.log(`📺 [Android TV Stream] Solicitando stream para TV - pantalla ${screenId}, índice ${currentIndex}`);

    // Obtener contenido de la pantalla
    const contentInfo = await getScreenContent(screenId, request);

    if (!contentInfo || contentInfo.items.length === 0) {
      console.log(`⚠️ [Android TV Stream] No hay contenido para pantalla ${screenId}`);
      return NextResponse.json({
        error: 'No hay contenido disponible',
        screenId,
        totalItems: 0,
        currentIndex: 0,
        playlistName: 'Sin asignar',
        streamingOptimized: true,
        message: 'Esta pantalla no tiene contenido asignado. Asigne una playlist desde el panel de administración.'
      }, { status: 200 }); // Cambiado de 404 a 200
    }

    // Filtrar solo videos
    const videoItems = contentInfo.items.filter(item => item.type === 'video');

    if (videoItems.length === 0) {
      return NextResponse.json({
        error: 'No hay videos disponibles',
        screenId,
        totalItems: 0,
        currentIndex: 0,
        playlistName: contentInfo.playlistName || 'Sin videos',
        streamingOptimized: true,
        message: 'La playlist asignada no contiene videos válidos para reproducir.'
      }, { status: 200 }); // Cambiado de 404 a 200
    }

    // Calcular índices
    const safeCurrentIndex = Math.max(0, Math.min(currentIndex, videoItems.length - 1));
    const nextIndex = (safeCurrentIndex + 1) % videoItems.length;

    // Crear items optimizados para streaming
    const currentItem: StreamItem = {
      id: videoItems[safeCurrentIndex].id,
      name: videoItems[safeCurrentIndex].name,
      streamUrl: videoItems[safeCurrentIndex].url,
      type: 'video',
      duration: videoItems[safeCurrentIndex].duration || 30,
      folder: videoItems[safeCurrentIndex].folder || 'CASS',
      fileSize: await getFileSize(videoItems[safeCurrentIndex]),
      mimeType: getMimeType(videoItems[safeCurrentIndex].name),
      preload: 'auto', // Precargar el video actual
      priority: 'high'
    };

    const nextItem: StreamItem = {
      id: videoItems[nextIndex].id,
      name: videoItems[nextIndex].name,
      streamUrl: videoItems[nextIndex].url,
      type: 'video',
      duration: videoItems[nextIndex].duration || 30,
      folder: videoItems[nextIndex].folder || 'CASS',
      fileSize: await getFileSize(videoItems[nextIndex]),
      mimeType: getMimeType(videoItems[nextIndex].name),
      preload: 'metadata', // Solo metadatos del siguiente
      priority: 'normal'
    };

    // Crear respuesta optimizada para Android TV
    const androidTVPlaylist: AndroidTVPlaylist = {
      screenId,
      playlistName: contentInfo.playlistName || 'TV Playlist',
      currentItem,
      nextItem,
      totalItems: videoItems.length,
      currentIndex: safeCurrentIndex,
      isLooping: true,
      streamingOptimized: true,
      androidTVConfig: {
        bufferSize: '5MB', // Buffer pequeño para hardware limitado
        preloadStrategy: 'current-and-next', // Solo actual y siguiente
        memoryManagement: 'aggressive', // Liberar memoria agresivamente
        autoAdvance: true,
        crossfade: false // Deshabilitado para ahorrar recursos
      }
    };

    console.log(`✅ [Android TV Stream] Stream optimizado generado para pantalla ${screenId}`);
    console.log(`📺 [Android TV Stream] Video actual: ${currentItem.name} (${formatFileSize(currentItem.fileSize)})`);
    console.log(`📺 [Android TV Stream] Siguiente: ${nextItem.name} (${formatFileSize(nextItem.fileSize)})`);

    return NextResponse.json(androidTVPlaylist, {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control': 'no-cache, no-store, must-revalidate', // No cachear para obtener siempre el índice correcto
        'X-Android-TV-Optimized': 'true'
      }
    });

  } catch (error) {
    console.error('❌ [Android TV Stream] Error al generar stream:', error);
    return NextResponse.json(
      { 
        error: 'Error al generar stream para Android TV',
        screenId,
        streamingOptimized: true
      },
      { status: 500 }
    );
  }
}

// OPTIONS para CORS
export async function OPTIONS() {
  return NextResponse.json({}, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  });
}

// Función auxiliar para obtener tamaño de archivo
async function getFileSize(item: any): Promise<number> {
  try {
    // Extraer información del item si está disponible
    if (item.size) return item.size;
    
    // Estimación basada en duración (aproximada)
    const duration = item.duration || 30;
    const estimatedBitrate = 2000000; // 2 Mbps promedio
    return Math.floor((duration * estimatedBitrate) / 8); // bytes
  } catch {
    return 50000000; // 50MB por defecto
  }
}

// Función auxiliar para obtener MIME type
function getMimeType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  const mimeTypes: { [key: string]: string } = {
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.ogg': 'video/ogg',
    '.avi': 'video/x-msvideo',
    '.mov': 'video/quicktime',
    '.mkv': 'video/x-matroska'
  };
  return mimeTypes[ext] || 'video/mp4';
}

// Función auxiliar para formatear tamaño de archivo
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Función para obtener contenido (reutilizada del endpoint anterior)
async function getScreenContent(screenId: string, request: Request): Promise<{ items: any[], playlistName?: string } | null> {
  try {
    console.log(`🔍 [Android TV Stream] Buscando contenido para pantalla ${screenId}`);

    const dataDir = path.join(process.cwd(), 'data');
    const screensFile = path.join(dataDir, 'screens.json');
    const playlistsFile = path.join(dataDir, 'playlists.json');

    if (!fs.existsSync(screensFile) || !fs.existsSync(playlistsFile)) {
      console.log(`❌ [Android TV Stream] Archivos de datos no encontrados`);
      return null;
    }

    const screensData = JSON.parse(fs.readFileSync(screensFile, 'utf8'));
    const playlistsData = JSON.parse(fs.readFileSync(playlistsFile, 'utf8'));

    const screen = screensData.find((s: any) => s.id === screenId);
    if (!screen) {
      console.log(`❌ [Android TV Stream] Pantalla ${screenId} no encontrada`);
      return null;
    }

    const playlist = playlistsData.find((p: any) => p.screens && p.screens.includes(screenId));
    if (!playlist) {
      console.log(`⚠️ [Android TV Stream] No hay playlist asignada a pantalla ${screenId}`);
      return null;
    }

    console.log(`✅ [Android TV Stream] Playlist encontrada: ${playlist.name} con ${playlist.items?.length || 0} items`);

    // Obtener la URL base del servidor desde la request
    const host = request.headers.get('host') || 'localhost:3000';
    const protocol = request.headers.get('x-forwarded-proto') || 'http';
    const baseUrl = `${protocol}://${host}`;
    
    console.log(`🌐 [Android TV Stream] Usando URL base: ${baseUrl}`);

    const items = (playlist.items || []).map((item: any) => {
      // Verificar si la URL ya contiene la carpeta CASS
      const itemUrl = item.url || '';
      let videoUrl;
      
      if (itemUrl && itemUrl.includes('/api/files/media/')) {
        // Si ya tiene una URL completa, reemplazar solo el host
        const urlParts = itemUrl.split('/api/files/media/');
        if (urlParts.length > 1) {
          videoUrl = `${baseUrl}/api/files/media/${urlParts[1]}`;
        } else {
          videoUrl = itemUrl;
        }
      } else {
        // Si no tiene URL, construirla con la URL base dinámica
        const encodedFolder = encodeURIComponent(item.folder || 'CASS');
        const encodedName = encodeURIComponent(item.name);
        videoUrl = `${baseUrl}/api/files/media/${encodedFolder}/${encodedName}`;
      }
      
      console.log(`📺 [Android TV Stream] Video URL generada: ${videoUrl}`);
      
      return {
        id: item.id || `video-${item.name}`,
        name: item.name,
        url: videoUrl,
        type: item.type || 'video',
        folder: item.folder || 'CASS',
        duration: item.duration || 30,
        size: item.size
      };
    });

    return {
      items: items,
      playlistName: playlist.name
    };
  } catch (error) {
    console.error('❌ [Android TV Stream] Error acceso directo:', error);
    return null;
  }
}

// Forzar que sea dinámico - no pre-renderizar
export const dynamic = 'force-dynamic';
export const revalidate = 0;
