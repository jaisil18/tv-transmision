import { NextRequest, NextResponse } from 'next/server';
import { getRTSPManager } from '@/lib/rtsp-server';
import { getHLSManager } from '@/lib/hls-server';

// GET - Obtener estado de streaming para una pantalla
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ screenId: string }> }
) {
  try {
    const { screenId } = await params;

    if (!screenId) {
      return NextResponse.json(
        { error: 'ID de pantalla requerido' },
        { status: 400 }
      );
    }

    console.log(`📊 [Streaming API] Consultando estado para pantalla ${screenId}`);

    const rtspManager = getRTSPManager();
    const hlsManager = getHLSManager();

    // Obtener estados de ambos tipos de stream
    const rtspState = rtspManager.getStreamState(screenId);
    const hlsState = hlsManager.getHLSStreamState(screenId);

    // Obtener configuración de red
    const host = request.headers.get('host') || 'localhost:3000';
    const protocol = request.headers.get('x-forwarded-proto') || 'http';
    const baseUrl = `${protocol}://${host}`;

    const streamingInfo = {
      screenId,
      rtsp: {
        available: !!rtspState,
        status: rtspState?.status || 'stopped',
        url: rtspState ? `rtsp://localhost:8554/live/screen_${screenId}` : null,
        currentContent: rtspState?.currentContent || null,
        bitrate: rtspState?.bitrate || 0,
        fps: rtspState?.fps || 0,
        resolution: rtspState?.resolution || null
      },
      hls: {
        available: !!hlsState,
        status: hlsState?.status || 'stopped',
        playlistUrl: hlsState ? `${baseUrl}/api/hls/${screenId}` : null,
        segmentsUrl: hlsState ? `${baseUrl}/api/hls/segments/${screenId}` : null,
        currentContent: hlsState?.currentContent || null,
        segmentCount: hlsState?.segmentCount || 0
      },
      urls: {
        rtsp: `rtsp://localhost:8554/live/screen_${screenId}`,
        hls: `${baseUrl}/api/hls/${screenId}`,
        segments: `${baseUrl}/api/hls/segments/${screenId}`
      },
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(streamingInfo, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });

  } catch (error) {
    console.error('❌ [Streaming API] Error:', error);
    return NextResponse.json(
      { 
        error: 'Error al obtener estado de streaming',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}

// POST - Iniciar streaming para una pantalla
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ screenId: string }> }
) {
  try {
    const { screenId } = await params;
    const body = await request.json();
    const { type = 'both' } = body; // 'rtsp', 'hls', or 'both'

    if (!screenId) {
      return NextResponse.json(
        { error: 'ID de pantalla requerido' },
        { status: 400 }
      );
    }

    console.log(`🚀 [Streaming API] Iniciando streaming ${type} para pantalla ${screenId}`);

    const rtspManager = getRTSPManager();
    const hlsManager = getHLSManager();

    const results: any = {
      screenId,
      requested: type,
      results: {}
    };

    // Iniciar RTSP si se solicita
    if (type === 'rtsp' || type === 'both') {
      try {
        const rtspStream = await rtspManager.createStream(screenId);
        results.results.rtsp = {
          success: true,
          status: rtspStream.status,
          url: `rtsp://localhost:8554/live/screen_${screenId}`
        };
        console.log(`✅ [Streaming API] RTSP iniciado para pantalla ${screenId}`);
      } catch (error) {
        results.results.rtsp = {
          success: false,
          error: error instanceof Error ? error.message : 'Error desconocido'
        };
        console.error(`❌ [Streaming API] Error RTSP para pantalla ${screenId}:`, error);
      }
    }

    // Iniciar HLS si se solicita
    if (type === 'hls' || type === 'both') {
      try {
        const hlsStream = await hlsManager.createHLSStream(screenId);
        const host = request.headers.get('host') || 'localhost:3000';
        const protocol = request.headers.get('x-forwarded-proto') || 'http';
        const baseUrl = `${protocol}://${host}`;
        
        results.results.hls = {
          success: true,
          status: hlsStream.status,
          playlistUrl: `${baseUrl}/api/hls/${screenId}`,
          segmentsUrl: `${baseUrl}/api/hls/segments/${screenId}`
        };
        console.log(`✅ [Streaming API] HLS iniciado para pantalla ${screenId}`);
      } catch (error) {
        results.results.hls = {
          success: false,
          error: error instanceof Error ? error.message : 'Error desconocido'
        };
        console.error(`❌ [Streaming API] Error HLS para pantalla ${screenId}:`, error);
      }
    }

    const hasErrors = Object.values(results.results).some((r: any) => !r.success);
    const statusCode = hasErrors ? 207 : 200; // 207 Multi-Status si hay errores parciales

    return NextResponse.json(results, {
      status: statusCode,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });

  } catch (error) {
    console.error('❌ [Streaming API] Error general:', error);
    return NextResponse.json(
      { 
        error: 'Error al iniciar streaming',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}

// DELETE - Detener streaming para una pantalla
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ screenId: string }> }
) {
  try {
    const { screenId } = await params;

    if (!screenId) {
      return NextResponse.json(
        { error: 'ID de pantalla requerido' },
        { status: 400 }
      );
    }

    console.log(`🛑 [Streaming API] Deteniendo streaming para pantalla ${screenId}`);

    const rtspManager = getRTSPManager();
    const hlsManager = getHLSManager();

    // Detener ambos tipos de stream
    await Promise.all([
      rtspManager.stopStream(screenId),
      hlsManager.stopHLSStream(screenId)
    ]);

    console.log(`✅ [Streaming API] Streaming detenido para pantalla ${screenId}`);

    return NextResponse.json({
      screenId,
      message: 'Streaming detenido exitosamente',
      timestamp: new Date().toISOString()
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });

  } catch (error) {
    console.error('❌ [Streaming API] Error:', error);
    return NextResponse.json(
      { 
        error: 'Error al detener streaming',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}

// OPTIONS - Para CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
