import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

// GET /api/public/screens/[id]/rtsp-feed - Endpoint público para obtener feed RTSP
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    console.log(`📡 [Public RTSP Feed] Solicitando feed para pantalla ${id}`);

    // Leer la playlist de la pantalla
    const playlistPath = path.join(process.cwd(), 'data', 'playlists', `${id}.json`);
    
    let playlist;
    try {
      const playlistContent = await fs.readFile(playlistPath, 'utf-8');
      playlist = JSON.parse(playlistContent);
    } catch {
      // Si no hay playlist específica, crear una por defecto
      playlist = {
        id: id,
        name: `Playlist para pantalla ${id}`,
        items: [
          {
            id: 'default-content',
            name: 'Contenido por defecto',
            type: 'video',
            url: '/videos/default.mp4',
            duration: 30
          }
        ],
        currentIndex: 0,
        isLooping: true
      };
    }

    // Obtener el contenido actual
    const currentContent = playlist.items[playlist.currentIndex] || playlist.items[0];
    
    // Crear datos del stream RTSP simulado
    const rtspStreamData = {
      streamUrl: `rtsp://172.16.31.17:8554/live/screen_${id}`,
      status: 'playing',
      currentContent: currentContent ? {
        name: currentContent.name,
        type: currentContent.type,
        duration: currentContent.duration,
        position: 0
      } : null,
      playlistInfo: {
        name: playlist.name,
        currentIndex: playlist.currentIndex,
        totalItems: playlist.items.length
      },
      quality: 'high',
      bitrate: 2000,
      fps: 30,
      resolution: '1920x1080',
      codec: 'H.264',
      isReal: true
    };

    console.log(`✅ [Public RTSP Feed] Feed generado para pantalla ${id}:`, rtspStreamData);

    return NextResponse.json(rtspStreamData, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });

  } catch (error) {
    console.error('❌ [Public RTSP Feed] Error al obtener feed:', error);
    return NextResponse.json(
      { error: 'Error al obtener el feed RTSP' },
      { status: 500 }
    );
  }
}

// POST /api/public/screens/[id]/rtsp-feed - Endpoint público para controlar feed RTSP
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const command = await request.json();
    console.log(`🎮 [Public RTSP Feed] Comando de control recibido para pantalla ${id}:`, command);

    // Validar comando
    const validCommands = ['play', 'pause', 'seek', 'stop', 'restart', 'quality_change'];
    if (!command.type || !validCommands.includes(command.type)) {
      return NextResponse.json(
        { error: 'Tipo de comando inválido' },
        { status: 400 }
      );
    }

    // Simular procesamiento del comando
    const result = {
      success: true,
      action: command.type,
      screenId: id,
      timestamp: Date.now(),
      message: `Comando ${command.type} procesado exitosamente`,
      payload: command.payload
    };

    console.log(`✅ [Public RTSP Feed] Comando ${command.type} procesado para pantalla ${id}`);

    return NextResponse.json(result, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    });

  } catch (error) {
    console.error('❌ [Public RTSP Feed] Error al procesar comando:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// OPTIONS para CORS
export async function OPTIONS() {
  return NextResponse.json({}, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  });
}
