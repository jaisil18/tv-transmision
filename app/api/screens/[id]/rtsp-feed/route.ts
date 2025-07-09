import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import path from 'path';

// GET /api/screens/[id]/rtsp-feed - Stream RTSP simulado
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    console.log(`📡 [RTSP Feed] Iniciando stream para pantalla ${id}`);

    // Leer datos de pantallas y contenido
    const screensPath = path.join(process.cwd(), 'data', 'screens.json');
    const screensData = JSON.parse(readFileSync(screensPath, 'utf8'));
    const screen = screensData.find((s: any) => s.id === id);

    if (!screen) {
      return NextResponse.json(
        { error: 'Pantalla no encontrada' },
        { status: 404 }
      );
    }

    // Leer playlists para obtener contenido actual
    const playlistsPath = path.join(process.cwd(), 'data', 'playlists.json');
    const playlistsData = JSON.parse(readFileSync(playlistsPath, 'utf8'));
    const playlist = playlistsData.find((p: any) => p.screens && p.screens.includes(id));

    if (!playlist || !playlist.items || playlist.items.length === 0) {
      return NextResponse.json(
        { error: 'No hay contenido disponible para el stream' },
        { status: 404 }
      );
    }

    // Obtener el contenido actual (en una implementación real, esto vendría del estado de la pantalla)
    const currentContent = playlist.items[0]; // Simplificado para el ejemplo
    
    // Crear un stream simulado que redirige al contenido actual
    // En una implementación real de RTSP, esto sería un stream de video en tiempo real
    
    if (currentContent.type === 'video') {
      // Para videos, redirigir al archivo de video actual
      console.log(`🎥 [RTSP Feed] Sirviendo video: ${currentContent.url}`);
      
      // En lugar de servir el archivo directamente, creamos un stream wrapper
      return createRTSPVideoStream(currentContent.url, id);
      
    } else if (currentContent.type === 'image') {
      // Para imágenes, crear un stream estático
      console.log(`🖼️ [RTSP Feed] Sirviendo imagen: ${currentContent.url}`);
      
      return createRTSPImageStream(currentContent.url, id);
    }

    return NextResponse.json(
      { error: 'Tipo de contenido no soportado para RTSP' },
      { status: 400 }
    );

  } catch (error) {
    console.error('❌ [RTSP Feed] Error al crear stream:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// Función para crear un stream de video RTSP simulado
function createRTSPVideoStream(videoUrl: string, screenId: string) {
  console.log(`🎬 [RTSP] Creando stream de video para pantalla ${screenId}`);
  
  // En una implementación real, aquí se configuraría el stream RTSP
  // Por ahora, devolvemos metadatos del stream
  
  const streamMetadata = {
    type: 'rtsp_video_stream',
    screenId,
    contentUrl: videoUrl,
    streamUrl: `rtsp://localhost:8554/live/screen_${screenId}`, // URL RTSP profesional
    protocol: 'RTSP/1.0',
    codec: 'H.264',
    resolution: '1920x1080',
    framerate: 30,
    bitrate: 2500,
    status: 'streaming',
    timestamp: Date.now()
  };

  return NextResponse.json(streamMetadata, {
    headers: {
      'Content-Type': 'application/json',
      'X-RTSP-Stream': 'true',
      'X-Stream-Type': 'video',
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    }
  });
}

// Función para crear un stream de imagen RTSP simulado
function createRTSPImageStream(imageUrl: string, screenId: string) {
  console.log(`🖼️ [RTSP] Creando stream de imagen para pantalla ${screenId}`);
  
  const streamMetadata = {
    type: 'rtsp_image_stream',
    screenId,
    contentUrl: imageUrl,
    streamUrl: `rtsp://localhost:8554/live/screen_${screenId}`, // URL RTSP profesional
    protocol: 'RTSP/1.0',
    codec: 'MJPEG',
    resolution: '1920x1080',
    framerate: 1, // Las imágenes se muestran como frame estático
    bitrate: 800,
    status: 'streaming',
    timestamp: Date.now()
  };

  return NextResponse.json(streamMetadata, {
    headers: {
      'Content-Type': 'application/json',
      'X-RTSP-Stream': 'true',
      'X-Stream-Type': 'image',
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    }
  });
}

// POST /api/screens/[id]/rtsp-feed - Controlar el stream RTSP
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const { action, parameters } = await request.json();
    console.log(`🎮 [RTSP Feed] Acción de control recibida para pantalla ${id}:`, { action, parameters });

    switch (action) {
      case 'start':
        return handleStartStream(id, parameters);
      case 'stop':
        return handleStopStream(id, parameters);
      case 'restart':
        return handleRestartStream(id, parameters);
      case 'change_quality':
        return handleChangeQuality(id, parameters);
      default:
        return NextResponse.json(
          { error: 'Acción no válida' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('❌ [RTSP Feed] Error en control de stream:', error);
    return NextResponse.json(
      { error: 'Error al controlar el stream' },
      { status: 500 }
    );
  }
}

async function handleStartStream(screenId: string, parameters: any) {
  console.log(`▶️ [RTSP Feed] Iniciando stream para pantalla ${screenId}`);
  
  return NextResponse.json({
    success: true,
    action: 'start',
    screenId,
    streamUrl: `rtsp://localhost:8554/live/screen_${screenId}`,
    status: 'started',
    timestamp: Date.now()
  });
}

async function handleStopStream(screenId: string, parameters: any) {
  console.log(`⏹️ [RTSP Feed] Deteniendo stream para pantalla ${screenId}`);
  
  return NextResponse.json({
    success: true,
    action: 'stop',
    screenId,
    status: 'stopped',
    timestamp: Date.now()
  });
}

async function handleRestartStream(screenId: string, parameters: any) {
  console.log(`🔄 [RTSP Feed] Reiniciando stream para pantalla ${screenId}`);
  
  return NextResponse.json({
    success: true,
    action: 'restart',
    screenId,
    streamUrl: `rtsp://localhost:8554/live/screen_${screenId}`,
    status: 'restarted',
    timestamp: Date.now()
  });
}

async function handleChangeQuality(screenId: string, parameters: any) {
  const { quality, bitrate } = parameters || {};
  console.log(`🎚️ [RTSP Feed] Cambiando calidad para pantalla ${screenId}:`, { quality, bitrate });
  
  return NextResponse.json({
    success: true,
    action: 'change_quality',
    screenId,
    quality: quality || 'auto',
    bitrate: bitrate || 1500,
    status: 'quality_changed',
    timestamp: Date.now()
  });
}
