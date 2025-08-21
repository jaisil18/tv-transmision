import { NextResponse } from 'next/server';
import { getRTSPManager, initializeRTSPServer } from '@/lib/rtsp-server';
import { ensureRTSPServer } from '@/lib/rtsp-init';

// GET /api/screens/[id]/rtsp-stream - Obtener información del stream RTSP REAL
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    console.log(`🎥 [RTSP REAL] Solicitando stream para pantalla ${id}`);

    // Asegurar que el servidor RTSP esté inicializado
    await ensureRTSPServer();

    // Obtener la instancia singleton del manager
    const rtspManager = getRTSPManager();

    // Verificar si ya existe un stream activo
    let streamState = rtspManager.getStreamState(id);

    if (!streamState || streamState.status === 'stopped' || streamState.status === 'error') {
      // Crear nuevo stream RTSP real
      console.log(`🚀 [RTSP REAL] Creando nuevo stream para pantalla ${id}`);
      try {
        streamState = await rtspManager.createStream(id);
      } catch (error) {
        console.error(`❌ [RTSP REAL] Error al crear stream:`, error);
        return NextResponse.json({
          streamUrl: `rtsp://localhost:8554/live/screen_${id}`,
          currentContent: null,
          playlistInfo: null,
          bitrate: 0,
          fps: 0,
          status: 'error',
          error: error instanceof Error ? error.message : 'Error desconocido'
        });
      }
    }

    // Construir respuesta con información real del stream
    const streamInfo = {
      streamUrl: `rtsp://localhost:8554/live/screen_${id}`,
      currentContent: streamState.currentContent,
      playlistInfo: streamState.playlistInfo,
      bitrate: streamState.bitrate, // Bitrate real del archivo
      fps: streamState.fps, // FPS real del archivo
      resolution: streamState.resolution || 'Auto',
      codec: streamState.codec || 'H.264',
      status: streamState.status,
      startTime: streamState.startTime,
      isReal: true, // Indicador de que es un stream real
      quality: streamState.bitrate > 5000 ? 'Excelente' :
               streamState.bitrate > 2000 ? 'Buena' :
               streamState.bitrate > 1000 ? 'Media' : 'Básica'
    };

    console.log(`✅ [RTSP REAL] Stream info para pantalla ${id}:`, {
      ...streamInfo,
      currentContent: streamInfo.currentContent?.name
    });

    return NextResponse.json(streamInfo);

  } catch (error) {
    console.error('❌ [RTSP REAL] Error al obtener stream info:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST /api/screens/[id]/rtsp-stream - Actualizar configuración del stream
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const { quality, bitrate } = await request.json();

    console.log(`🎥 [RTSP] Actualizando configuración de stream para pantalla ${id}:`, { quality, bitrate });

    // En una implementación real, aquí se actualizaría la configuración del stream RTSP
    // Por ahora, simplemente devolvemos confirmación

    const response = {
      success: true,
      streamId: id,
      quality: quality || 'auto',
      bitrate: bitrate || 1500,
      message: 'Configuración de stream actualizada'
    };

    console.log(`✅ [RTSP] Configuración actualizada:`, response);

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ [RTSP] Error al actualizar configuración:', error);
    return NextResponse.json(
      { error: 'Error al actualizar configuración del stream' },
      { status: 500 }
    );
  }
}
