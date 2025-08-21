import { NextRequest, NextResponse } from 'next/server';
import { getRTSPManager } from '@/lib/rtsp-server';
import { getHLSManager } from '@/lib/hls-server';
import { getStreamingConfig, isStreamingInitialized, detectStreamingNetwork } from '@/lib/streaming-init';

// GET - Obtener estado general del streaming
export async function GET(request: NextRequest) {
  try {
    console.log('📊 [Streaming Status] Consultando estado general del streaming...');

    // Verificar si los servicios están inicializados
    const isInitialized = isStreamingInitialized();
    
    // Obtener configuración
    const config = getStreamingConfig();
    
    // Obtener información de red
    const networkInfo = await detectStreamingNetwork();
    
    // Obtener gestores de streaming
    const rtspManager = getRTSPManager();
    const hlsManager = getHLSManager();
    
    // Obtener todos los streams activos
    const rtspStreams = Array.from(rtspManager.getAllStreams().entries()).map(([screenId, state]) => ({
      screenId,
      type: 'rtsp',
      status: state.status,
      currentContent: state.currentContent,
      bitrate: state.bitrate,
      fps: state.fps,
      resolution: state.resolution,
      startTime: state.startTime,
      url: `rtsp://${networkInfo.serverIp}:${networkInfo.rtspPort}/live/screen_${screenId}`
    }));

    const hlsStreams = Array.from(hlsManager.getAllHLSStreams().entries()).map(([screenId, state]) => ({
      screenId,
      type: 'hls',
      status: state.status,
      currentContent: state.currentContent,
      segmentCount: state.segmentCount,
      startTime: state.startTime,
      playlistUrl: `${networkInfo.hlsBaseUrl}/${screenId}`,
      segmentsUrl: `${networkInfo.hlsBaseUrl.replace('/api/hls', '/api/hls/segments')}/${screenId}`
    }));

    // Combinar información
    const allStreams = [...rtspStreams, ...hlsStreams];
    
    // Agrupar por pantalla
    const streamsByScreen: { [key: string]: any } = {};
    allStreams.forEach(stream => {
      if (!streamsByScreen[stream.screenId]) {
        streamsByScreen[stream.screenId] = {
          screenId: stream.screenId,
          rtsp: null,
          hls: null
        };
      }
      streamsByScreen[stream.screenId][stream.type] = stream;
    });

    // Estadísticas generales
    const stats = {
      totalScreens: Object.keys(streamsByScreen).length,
      activeRTSPStreams: rtspStreams.filter(s => s.status === 'streaming').length,
      activeHLSStreams: hlsStreams.filter(s => s.status === 'streaming').length,
      totalActiveStreams: allStreams.filter(s => s.status === 'streaming').length,
      errorStreams: allStreams.filter(s => s.status === 'error').length
    };

    const statusInfo = {
      initialized: isInitialized,
      config,
      network: networkInfo,
      stats,
      streams: streamsByScreen,
      services: {
        rtsp: {
          enabled: config.enableRTSP,
          port: networkInfo.rtspPort,
          activeStreams: rtspStreams.length
        },
        hls: {
          enabled: config.enableHLS,
          baseUrl: networkInfo.hlsBaseUrl,
          activeStreams: hlsStreams.length
        }
      },
      timestamp: new Date().toISOString()
    };

    console.log('✅ [Streaming Status] Estado obtenido:', {
      initialized: isInitialized,
      totalScreens: stats.totalScreens,
      activeStreams: stats.totalActiveStreams
    });

    return NextResponse.json(statusInfo, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });

  } catch (error) {
    console.error('❌ [Streaming Status] Error:', error);
    return NextResponse.json(
      { 
        error: 'Error al obtener estado del streaming',
        details: error instanceof Error ? error.message : 'Error desconocido',
        initialized: false
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
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
